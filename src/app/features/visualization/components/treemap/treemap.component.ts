import { Component, OnInit, OnDestroy, AfterViewInit, Input, ViewChild, ElementRef, Renderer2, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { CoverageData, ClassInfo, PackageInfo } from '../../../../core/models/coverage.model';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { GoogleChartsModule, ChartType, ChartWrapperComponent } from 'angular-google-charts';

/**
 * Local definition for the hierarchy node
 * matching your existing code.
 */
interface HierarchyNode {
  id: string;
  name: string;
  fullPath: string;
  parent: string | null;
  coverage: number;
  size: number;
  level: number;
  isGroup: boolean;
  children: HierarchyNode[];
  originalData?: ClassInfo | PackageInfo;
}

@Component({
  selector: 'app-treemap',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.scss']
})
export class TreemapComponent implements OnInit, OnDestroy, AfterViewInit {

  @Input() coverageData: CoverageData | null = null;
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  // Theme + debug toggles
  isDarkTheme = false;
  isDebugMode = false;

  // Google Charts
  chartType: ChartType = ChartType.TreeMap;
  chartData: any[] = [];
  chartColumns: string[] = ['ID', 'Parent', 'Size', 'Coverage'];
  chartOptions: any = {};
  chartHeight = 800;

  // Hierarchy
  hierarchyRoot: HierarchyNode | null = null;
  maxHierarchyDepth: number = 0;
  currentMaxDepth: number = 2; // default display depth
  chartReady = false;

  // Custom tooltip info
  activeTooltip: { id: string; coverage: number; lines?: number; path?: string } | null = null;
  tooltipX = 0;
  tooltipY = 0;

  // For tracking which row is hovered in the chart
  private hoveredRowIndex: number | null = null;

  // For label display
  private nodeDisplayNames = new Map<string, string>();

  private themeSubscription: Subscription | null = null;

  constructor(
    private themeStore: ThemeStoreService,
    private renderer: Renderer2,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Listen to theme changes
    this.themeSubscription = this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
      this.updateChartOptions();
      this.buildHierarchyAndPrepareChartData();
    });

    // Initial build
    this.buildHierarchyAndPrepareChartData();
    this.updateChartOptions();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  ngAfterViewInit(): void {
    // Adjust layout after view is initialized
    this.updateChartDimensions();
  }

  /**
   * Build your hierarchy from coverageData, compute coverage, then flatten
   */
  private buildHierarchyAndPrepareChartData(): void {
    if (!this.coverageData) {
      this.chartData = [];
      return;
    }

    // Root node
    this.hierarchyRoot = {
      id: 'Coverage',
      name: 'Coverage',
      fullPath: 'Coverage',
      parent: null,
      size: 0,
      coverage: this.coverageData.summary.lineCoverage,
      isGroup: true,
      level: 0,
      children: []
    };

    // Insert each class (only if it passes filter)
    this.coverageData.packages.forEach(pkg => {
      pkg.classes.forEach(cls => {
        if (!this.shouldIncludeClass(pkg, cls)) {
          // skip
          return;
        }
        const pathSegments = this.buildPathSegments(pkg, cls);
        this.insertClassPath(pathSegments, cls);
      });
    });

    // Then recalc coverage, flatten, etc.
    this.calculateTotals(this.hierarchyRoot);
    this.maxHierarchyDepth = this.findMaxDepth(this.hierarchyRoot);
    if (this.maxHierarchyDepth > 10) {
      this.maxHierarchyDepth = 10;
    }
    this.convertHierarchyToChartData();
  }

  private shouldIncludeClass(pkg: PackageInfo, cls: ClassInfo): boolean {
    const name = cls.name;
    const file = cls.filename?.toLowerCase() ?? '';

    // 1) skip compiler-generated async/iterator classes
    if (name.includes('<') && name.includes('>')) {
      return false;
    }

    // 2) skip obj/Debug or obj/Release folders
    if (file.includes('obj/debug') || file.includes('obj/release')) {
      return false;
    }

    // 3) skip system or regex generator stuff
    if (pkg.name.startsWith('System.') ||
      file.includes('regexgenerator.g.cs')) {
      return false;
    }

    // 4) skip designer or .g.cs partial classes
    if (file.endsWith('.designer.cs') || file.endsWith('.g.cs')) {
      return false;
    }

    // 5) skip any class with zero lines if you want
    if ((cls.linesValid ?? 0) === 0) {
      return false;
    }

    return true; // pass all checks => keep it
  }

  /**
   * Example logic: treat the first 2 segments as “Vanguard.Domain” if it starts with “Vanguard”,
   * then remove duplicates, extract folder parts, etc.
   */
  private buildPathSegments(pkg: PackageInfo, cls: ClassInfo): string[] {
    // Split package name
    const rawSegments = pkg.name.split('.');

    // “Assembly” check
    let assembly = rawSegments[0];
    let remainderSegments = rawSegments.slice(1);

    if (rawSegments.length >= 2 && rawSegments[0] === 'Vanguard') {
      assembly = `${rawSegments[0]}.${rawSegments[1]}`;  // e.g. "Vanguard.Domain"
      remainderSegments = rawSegments.slice(2);
    }

    // Remove duplicates if they match the assembly
    remainderSegments = remainderSegments.filter(s => s !== assembly);

    // Extract folder segments from the filename if desired
    const folderParts = this.extractFolderParts(cls.filename, remainderSegments);

    // Combine: e.g. ["Vanguard.Domain", "Entities", "SkillAggregate", "SkillAssessment"]
    const pathSegments = [
      assembly,
      ...remainderSegments,
      ...folderParts,
      cls.name
    ];

    // Optionally remove consecutive duplicates
    const uniquePath: string[] = [];
    for (const seg of pathSegments) {
      if (!uniquePath.length || uniquePath[uniquePath.length - 1] !== seg) {
        uniquePath.push(seg);
      }
    }

    return uniquePath;
  }

  /**
   * Insert path segments into the tree, each segment as a short “name”
   * but the node.id is the entire path so it’s always unique.
   */
  private insertClassPath(pathSegments: string[], cls: ClassInfo): void {
    if (!this.hierarchyRoot) return;

    let currentNode = this.hierarchyRoot;
    let currentPath = 'Coverage';

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const isLeaf = (i === pathSegments.length - 1);

      // Find or create the child node
      let child = currentNode.children.find(c => c.name === segment);
      if (!child) {
        const newId = `${currentPath}.${segment}`;
        child = {
          id: newId,
          name: segment,
          fullPath: newId,
          parent: currentNode.id,
          size: 0,
          coverage: 0,
          isGroup: !isLeaf,
          level: currentNode.level + 1,
          children: []
        };
        currentNode.children.push(child);
      }
      currentNode = child;
      currentPath = child.id;
    }

    // At leaf node, store coverage / lines
    currentNode.size = cls.linesValid || cls.lines.length;
    currentNode.coverage = cls.lineCoverage; // 0..100
    currentNode.originalData = cls;
  }

  /**
   * Remove repeated segments from the filename that
   * already appear in the namespace, if desired.
   */
  private extractFolderParts(filename: string | undefined, namespaceParts: string[]): string[] {
    if (!filename) return [];
    const allParts = filename.split(/[\\/]/).filter(x => !!x);
    if (!allParts.length) return [];

    // Remove trailing .cs file
    const lastPart = allParts[allParts.length - 1];
    if (lastPart.toLowerCase().endsWith('.cs')) {
      allParts.pop();
    }

    // e.g. skip duplicates
    const folderParts = allParts.filter(part => !namespaceParts.includes(part));
    return folderParts;
  }

  /**
   * Recursively compute size & coverage from leaves upward, using a weighted average.
   */
  private calculateTotals(node: HierarchyNode): { size: number; weightedCoverage: number } {
    if (!node.children.length) {
      // Leaf
      return { size: node.size, weightedCoverage: node.size * node.coverage };
    }

    let totalSize = 0;
    let totalCoverageSum = 0;
    for (const child of node.children) {
      const childResult = this.calculateTotals(child);
      totalSize += childResult.size;
      totalCoverageSum += childResult.weightedCoverage;
    }

    if (totalSize > 0) {
      node.size = totalSize;
      node.coverage = totalCoverageSum / totalSize; // Weighted average
    }

    return { size: totalSize, weightedCoverage: totalCoverageSum };
  }

  private findMaxDepth(node: HierarchyNode): number {
    if (!node.children.length) {
      return node.level;
    }
    let maxDepth = node.level;
    for (const child of node.children) {
      const d = this.findMaxDepth(child);
      if (d > maxDepth) maxDepth = d;
    }
    return maxDepth;
  }

  /**
   * Turn the hierarchy into chart rows. EXACTLY one row has parent=null (the root).
   * All other rows reference their parent's “display name” instead of null.
   */
  private convertHierarchyToChartData(): void {
    if (!this.hierarchyRoot) {
      this.chartData = [];
      return;
    }
    const data: any[] = [];
    this.nodeDisplayNames.clear();

    // 1) Create a unique display label for the root
    const usedLabels = new Set<string>();
    const rootDisplay = this.ensureUniqueName(this.hierarchyRoot.name, usedLabels);

    // Remember it so children can link to it
    this.nodeDisplayNames.set(this.hierarchyRoot.id, rootDisplay);

    // 2) Add the root row: [ rootDisplayName, null, size, coverage ]
    data.push([rootDisplay, null, this.hierarchyRoot.size, this.hierarchyRoot.coverage]);

    // 3) BFS or DFS from the root downward
    const queue = [this.hierarchyRoot];
    while (queue.length > 0) {
      const parentNode = queue.shift()!;
      // Stop if parent’s level is at or above currentMaxDepth
      if (parentNode.level >= this.currentMaxDepth) continue;

      // We already have the parent's display name in the map
      const parentDisplay = this.nodeDisplayNames.get(parentNode.id)!;

      for (const child of parentNode.children) {
        // Make or retrieve a unique display name for the child
        const childDisplay = this.ensureUniqueName(child.name, usedLabels);
        this.nodeDisplayNames.set(child.id, childDisplay);

        data.push([childDisplay, parentDisplay, child.size, child.coverage]);

        if (child.level < this.currentMaxDepth) {
          queue.push(child);
        }
      }
    }

    this.chartData = data;
  }

  /**
   * Create a unique display label if multiple siblings share the same short name.
   * We append a zero-width char and counter to differentiate.
   */
  private ensureUniqueName(base: string, used: Set<string>): string {
    let label = base;
    let counter = 1;
    while (used.has(label)) {
      label = `${base}\u200C#${counter}`;
      counter++;
    }
    used.add(label);
    return label;
  }

  // ===================== Chart Lifecycle Events =====================

  public onChartReady(chartWrapper: any): void {
    this.chartReady = true;

    const chart = chartWrapper.getChart();
    google.visualization.events.addListener(chart, 'onmouseover', (ev: any) => {
      if (ev.row == null) {
        this.hoveredRowIndex = null;
        return;
      }
      this.hoveredRowIndex = ev.row;
    });

    google.visualization.events.addListener(chart, 'onmouseout', () => {
      this.hoveredRowIndex = null;
      this.activeTooltip = null;
      this.cdr.detectChanges();
    });
  }

  /**
   * Our custom mousemove to place the tooltip near the cursor.
   */
  public onMouseMove(event: MouseEvent): void {
    if (this.hoveredRowIndex == null) {
      return;
    }

    // [displayName, parentDisplay, size, coverage]
    const row = this.chartData[this.hoveredRowIndex];
    if (!row) {
      return;
    }

    // row[0] is the short display label. We need to find the node by ID or by label in nodeDisplayNames.
    // We'll do a quick reverse lookup to get the node's ID from that display label:
    const node = this.findNodeByDisplayLabel(row[0]);
    if (!node) {
      return;
    }

    this.activeTooltip = {
      id: node.name,
      coverage: node.coverage,
      lines: node.size,
      path: node.fullPath
    };

    // Position near the cursor
    const containerRect = this.chartContainer?.nativeElement?.getBoundingClientRect();
    if (containerRect) {
      const tooltipWidth = 240;
      const tooltipHeight = 100;

      let x = event.clientX - containerRect.left + 15;
      let y = event.clientY - containerRect.top + 15;

      // If near right/bottom edge, flip
      if (x + tooltipWidth > containerRect.width) {
        x = event.clientX - containerRect.left - tooltipWidth - 15;
      }
      if (y + tooltipHeight > containerRect.height) {
        y = event.clientY - containerRect.top - tooltipHeight - 15;
      }

      this.tooltipX = Math.max(0, x);
      this.tooltipY = Math.max(0, y);
    }

    this.cdr.detectChanges();
  }

  private findNodeByDisplayLabel(displayLabel: string): HierarchyNode | null {
    // Reverse lookup: we know displayLabel => node.id
    // so let's see which node ID in nodeDisplayNames maps to that label
    let matchingId: string | null = null;
    for (const [id, label] of this.nodeDisplayNames.entries()) {
      if (label === displayLabel) {
        matchingId = id;
        break;
      }
    }
    if (!matchingId) return null;
    return this.findNodeById(matchingId);
  }

  private findNodeById(id: string): HierarchyNode | null {
    if (!this.hierarchyRoot) return null;
    return this.findNodeRecursive(this.hierarchyRoot, id);
  }

  private findNodeRecursive(node: HierarchyNode, id: string): HierarchyNode | null {
    if (node.id === id) return node;
    for (const child of node.children) {
      const result = this.findNodeRecursive(child, id);
      if (result) return result;
    }
    return null;
  }

  public onChartError(error: any): void {
    console.error('Google Chart error:', error);
    if (this.isDebugMode && this.chartContainer?.nativeElement) {
      const div = document.createElement('div');
      div.className = 'chart-error';
      div.textContent = `Chart error: ${error.message || JSON.stringify(error)}`;
      this.chartContainer.nativeElement.appendChild(div);
    }
  }

  // ===================== Depth & Layout =====================

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    setTimeout(() => this.updateChartDimensions(), 100);
  }

  private updateChartDimensions(): void {
    if (!this.chartContainer?.nativeElement) return;
    const containerHeight = this.chartContainer.nativeElement.clientHeight;
    if (containerHeight > 300) {
      this.chartHeight = containerHeight - 70;
    }
  }

  public increaseDepth(): void {
    if (this.currentMaxDepth < this.maxHierarchyDepth) {
      this.currentMaxDepth++;
      this.convertHierarchyToChartData(); // rebuild with new depth
    }
  }
  public decreaseDepth(): void {
    if (this.currentMaxDepth > 1) {
      this.currentMaxDepth--;
      this.convertHierarchyToChartData();
    }
  }

  // ===================== Debug & Tooltip Testing =====================

  public toggleDebugMode(): void {
    this.isDebugMode = !this.isDebugMode;
  }

  public debugHierarchy(): void {
    if (!this.hierarchyRoot) {
      console.warn('No hierarchy to debug');
      return;
    }
    console.group('Hierarchy Structure');
    this.printNodeStructure(this.hierarchyRoot, 0);
    console.groupEnd();
  }

  private printNodeStructure(node: HierarchyNode, indent: number): void {
    const prefix = '  '.repeat(indent);
    console.log(
      `${prefix}${node.name} (level=${node.level}, coverage=${node.coverage.toFixed(1)}%, lines=${node.size}, children=${node.children.length})`
    );
    for (const child of node.children) {
      this.printNodeStructure(child, indent + 1);
    }
  }

  public forceShowTooltip(): void {
    if (this.chartData.length <= 1) {
      console.warn('No chart data to show tooltip');
      return;
    }

    // Force a tooltip for row #1 (the first child)
    this.hoveredRowIndex = 1;
    const row = this.chartData[1];
    const node = this.findNodeByDisplayLabel(row[0]);
    if (node) {
      this.activeTooltip = {
        id: node.name,
        coverage: node.coverage,
        lines: node.size,
        path: node.fullPath
      };
      // place it in center
      const rect = this.chartContainer.nativeElement.getBoundingClientRect();
      this.tooltipX = rect.width / 2 - 100;
      this.tooltipY = rect.height / 2 - 50;
      this.cdr.detectChanges();
    } else {
      console.warn('Could not find node for row #1');
    }
  }

  // Show a sample of the chart data in debug mode
  public getChartDataSample(): any[] {
    return this.chartData.slice(0, 3);
  }

  /**
   * Update chart style based on dark/light theme
   */
  private updateChartOptions(): void {
    const backgroundColor = this.isDarkTheme ? '#1e1e1e' : '#ffffff';
    const textColor = this.isDarkTheme ? '#ffffff' : '#333333';
    const borderColor = this.isDarkTheme ? '#444444' : '#dddddd';

    const lowColor = '#f44336';    // Red
    const midColor = '#ffeb3b';    // Yellow
    const highColor = '#4caf50';   // Green

    this.chartOptions = {
      headerHeight: 15,
      fontFamily: 'Roboto, Arial, sans-serif',
      fontSize: 12,
      minColor: lowColor,
      midColor: midColor,
      maxColor: highColor,
      headerColor: backgroundColor,
      backgroundColor: backgroundColor,
      fontColor: textColor,
      showScale: true,
      highlightOnMouseOver: true,
      maxDepth: Math.min(4, this.currentMaxDepth + 1),
      maxPostDepth: 2,
      minHighlightColor: this.isDarkTheme ? '#555555' : '#e0e0e0',
      midHighlightColor: this.isDarkTheme ? '#777777' : '#f0f0f0',
      maxHighlightColor: this.isDarkTheme ? '#999999' : '#ffffff',
      hoverColor: this.isDarkTheme ? '#555555' : '#eeeeee',
      noColor: this.isDarkTheme ? '#333333' : '#f5f5f5',
      useWeightedAverageForAggregation: true,

      // coverage is 0..100
      minColorValue: 0,
      midColorValue: 60,
      maxColorValue: 100,

      headerFontSize: 14,
      borderColor: borderColor,
      borderWidth: 0.5,
      showTooltips: false,
      enableHighlight: true,
      generateTooltip: () => '<div></div>', // disable default tooltip
      method: 'squarify',
      textStyle: {
        color: textColor,
        fontName: 'Roboto, Arial, sans-serif',
        fontSize: 12
      },
      allowHtml: true,
      onmouseover: true
    };
  }

  // Coverage classification for styling
  public getCoverageClass(value: number): string {
    if (value >= 80) return 'high';
    if (value >= 60) return 'medium';
    return 'low';
  }
  public getCoverageStatus(value: number): string {
    if (value >= 80) return 'Good';
    if (value >= 60) return 'Average';
    return 'Poor';
  }
}