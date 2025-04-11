import { trigger, transition, style, animate } from "@angular/animations";
import { CommonModule } from "@angular/common";
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, NgZone, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { Subscription } from "rxjs";
import { TreeNode, ClassInfo, CoverageData } from "../../../models/coverage.model";
import { ExclusionPattern } from "../../../models/treemap-config.model";
import { CoverageDataService } from "../../../services/coverage-data.service";
import { CoverageStoreService } from "../../../services/coverage-store.service";
import { NotificationService } from "../../../services/utils/notification.service";
import { ThemeService } from "../../../services/utils/theme.service";

@Component({
    selector: 'app-ngx-coverage-treemap',
    standalone: true,
    imports: [CommonModule, FormsModule, NgxChartsModule],
    templateUrl: './ngx-coverage-treemap.component.html',
    styleUrls: ['./ngx-coverage-treemap.component.scss'],
    animations: [
        trigger('slideInRight', [
            transition(':enter', [
                style({ transform: 'translateX(100%)' }),
                animate('300ms ease-out', style({ transform: 'translateX(0)' }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
            ])
        ]),
        trigger('fadeIn', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('200ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class NgxCoverageTreemapComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;

    @Output() nodeSelected = new EventEmitter<any>();

    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

    // Chart data
    chartData: any[] = [];
    colorScheme: any = {
        domain: ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336']
    };

    // Configuration and filters
    minCoverage = 0;
    selectedPackage = '';
    searchTerm = '';
    showLabels = true;
    groupSmallNodes = false;
    enableDomainGrouping = true;
    sortBy: 'size' | 'coverage' | 'name' = 'size';
    exclusionPatterns: ExclusionPattern[] = [];
    showExclusionsPanel = false;

    // New pattern form
    newPattern: ExclusionPattern = {
        pattern: '',
        type: 'class',
        description: '',
        enabled: true
    };

    // Sample patterns to suggest
    samplePatterns = [
        {
            label: 'Event classes',
            pattern: {
                pattern: '*Event',
                type: 'class' as const,
                description: 'Domain events typically have high coverage by design',
                enabled: true
            }
        },
        {
            label: 'DTO classes',
            pattern: {
                pattern: '*DTO',
                type: 'class' as const,
                description: 'Data Transfer Objects are simple containers',
                enabled: true
            }
        },
        {
            label: 'Test infrastructure',
            pattern: {
                pattern: '*Test*',
                type: 'package' as const,
                description: 'Test support classes should not count in coverage',
                enabled: true
            }
        },
        {
            label: 'Generated code',
            pattern: {
                pattern: '.*\\$.*',
                type: 'regex' as const,
                description: 'Auto-generated code with $ character',
                enabled: true
            }
        }
    ];

    // State
    isLoading = true;
    hasActiveFilters = false;
    packageList: string[] = [];
    hierarchyRoot: TreeNode | null = null;

    // Tooltip
    tooltipX = 0;
    tooltipY = 0;
    showTooltip = false;
    tooltipNode: any = null;

    // Selected node details
    selectedNode: TreeNode | null = null;
    selectedClass: ClassInfo | null = null;
    similarClasses: any[] = [];

    // Charts dimensions
    width = 800;
    height = 600;

    // Map to maintain original data references
    private nodeMap = new Map<string, TreeNode>();
    private subscriptions: Subscription = new Subscription();

    get enabledExclusionPatternsCount(): number {
        return this.exclusionPatterns.filter(p => p.enabled).length;
    }

    constructor(
        private coverageStore: CoverageStoreService,
        private coverageDataService: CoverageDataService,
        private themeService: ThemeService,
        private notificationService: NotificationService,
        private zone: NgZone
    ) { }

    ngOnInit(): void {
        // Subscribe to theme changes
        this.subscriptions.add(
            this.themeService.darkTheme$.subscribe(isDark => {
                this.isDarkTheme = isDark;
                this.updateColorScheme();
            })
        );

        // Subscribe to coverage data
        this.subscriptions.add(
            this.coverageStore.getCoverageData().subscribe(data => {
                this.isLoading = true;

                if (data) {
                    // Build hierarchy
                    this.hierarchyRoot = this.coverageDataService.buildHierarchy(data, {
                        groupSmallNodes: this.groupSmallNodes,
                        simplifyNames: true
                    });

                    // Extract package list from data
                    this.extractPackageList(data);

                    // Transform hierarchy into chart data
                    this.updateChartData();
                } else {
                    this.hierarchyRoot = null;
                    this.chartData = [];
                    this.packageList = [];
                }

                this.isLoading = false;
            })
        );

        // Load saved exclusion patterns
        this.loadSavedExclusionPatterns();

        // Initialize chart dimensions
        this.updateChartDimensions();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    @HostListener('window:resize')
    onResize(): void {
        this.updateChartDimensions();
    }

    /**
     * Update chart dimensions based on container size
     */
    private updateChartDimensions(): void {
        if (this.chartContainer && this.chartContainer.nativeElement) {
            const rect = this.chartContainer.nativeElement.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
                this.width = rect.width;
                this.height = rect.height;
            }
        }
    }

    /**
     * Extract package list from coverage data
     */
    private extractPackageList(data: CoverageData): void {
        const packages = new Set<string>();

        data.packages.forEach(pkg => {
            if (pkg.name) {
                packages.add(pkg.name);
            }
        });

        this.packageList = Array.from(packages).sort();
    }

    /**
     * Update color scheme based on theme
     */
    private updateColorScheme(): void {
        this.colorScheme = {
            domain: this.isDarkTheme
                ? ['#38a169', '#68d391', '#f6e05e', '#ed8936', '#e53e3e']  // Dark theme
                : ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336']  // Light theme
        };
    }

    /**
     * Update chart options when display settings change
     */
    updateChartOptions(): void {
        this.updateChartData();
    }

    /**
     * Transform hierarchy to the format expected by ngx-charts
     */
    private updateChartData(): void {
        if (!this.hierarchyRoot || !this.hierarchyRoot.children?.length) {
            this.chartData = [];
            return;
        }

        this.nodeMap.clear();

        // Transform hierarchy to ngx-charts format
        const result: any[] = [];

        // Skip root, process children
        for (const child of this.hierarchyRoot.children) {
            // Apply filters
            if (this.shouldFilterNode(child)) {
                continue;
            }

            const nodeKey = `${child.packageName || ''} -${child.name} `;
            this.nodeMap.set(nodeKey, child);

            // Create node data
            const nodeData: any = {
                name: child.name,
                value: child.value || child.linesValid,
                extra: {
                    coverage: child.lineCoverage,
                    isNamespace: child.isNamespace,
                    isGroupedNode: child.isGroupedNode,
                    packageName: child.packageName,
                    linesValid: child.linesValid,
                    linesCovered: child.linesCovered,
                    branchCoverage: child.branchCoverage,
                    filename: child.filename,
                    originalData: child.originalData,
                    isDomainGroup: child.isDomainGroup
                }
            };

            // Customize color based on coverage
            nodeData.color = this.getCoverageColorValue(child.lineCoverage);

            // Process children
            if (child.children && child.children.length > 0) {
                nodeData.children = [];

                for (const grandchild of child.children) {
                    // Apply filters to children
                    if (this.shouldFilterNode(grandchild)) {
                        continue;
                    }

                    const childKey = `${grandchild.packageName || child.name} -${grandchild.name} `;
                    this.nodeMap.set(childKey, grandchild);

                    const childData = {
                        name: grandchild.name,
                        value: grandchild.value || grandchild.linesValid,
                        color: this.getCoverageColorValue(grandchild.lineCoverage),
                        extra: {
                            lineCoverage: grandchild.lineCoverage,
                            isNamespace: grandchild.isNamespace,
                            isGroupedNode: grandchild.isGroupedNode,
                            packageName: grandchild.packageName || child.name,
                            linesValid: grandchild.linesValid,
                            linesCovered: grandchild.linesCovered,
                            branchCoverage: grandchild.branchCoverage,
                            filename: grandchild.filename,
                            originalData: grandchild.originalData
                        }
                    };

                    nodeData.children.push(childData);
                }

                // Sort children
                this.sortNodes(nodeData.children);
            }

            // Only add node if it has children or is a leaf node
            if (!nodeData.children || nodeData.children.length > 0) {
                result.push(nodeData);
            }
        }

        // Sort top-level nodes
        this.sortNodes(result);

        this.chartData = result;
        this.updateFiltersState();
    }

    /**
     * Sort nodes based on current sort property
     */
    private sortNodes(nodes: any[]): void {
        switch (this.sortBy) {
            case 'coverage':
                nodes.sort((a, b) => (b.extra?.coverage || 0) - (a.extra?.coverage || 0));
                break;
            case 'name':
                nodes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'size':
            default:
                nodes.sort((a, b) => (b.value || 0) - (a.value || 0));
                break;
        }
    }

    /**
 * Check if a node should be filtered based on current filters
 */
    private shouldFilterNode(node: TreeNode): boolean {
        // Coverage threshold filter
        if (this.minCoverage > 0 && node.lineCoverage < this.minCoverage) {
            return true;
        }

        // Package filter
        if (this.selectedPackage && node.packageName !== this.selectedPackage) {
            // Exception: if this is the package itself, don't filter it
            if (!(node.isNamespace && node.name === this.selectedPackage)) {
                return true;
            }
        }

        // Search term filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            if (!node.name.toLowerCase().includes(term) &&
                (!node.packageName || !node.packageName.toLowerCase().includes(term))) {
                return true;
            }
        }

        // Exclusion patterns filter
        if (this.exclusionPatterns && this.exclusionPatterns.length > 0) {
            for (const pattern of this.exclusionPatterns.filter(p => p.enabled)) {
                const target = pattern.type === 'class' ? node.name : (node.packageName || '');
                let isMatch = false;

                if (pattern.type === 'regex') {
                    try {
                        isMatch = new RegExp(pattern.pattern).test(target);
                    } catch (e) {
                        console.error('Invalid regex pattern:', pattern.pattern);
                    }
                } else {
                    // Handle wildcard matching (* as wildcard)
                    if (pattern.pattern.includes('*')) {
                        const regexPattern = pattern.pattern.replace(/\*/g, '.*');
                        isMatch = new RegExp(`^${regexPattern}$`).test(target);
                    } else {
                        isMatch = target.includes(pattern.pattern);
                    }
                }

                if (isMatch) {
                    if (pattern.type === 'class' && !node.isNamespace) return true;
                    if (pattern.type === 'package') return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if any filters are currently active
     */
    private updateFiltersState(): void {
        this.hasActiveFilters = this.minCoverage > 0 ||
            !!this.selectedPackage ||
            !!this.searchTerm ||
            this.exclusionPatterns.some(p => p.enabled);
    }

    /**
     * Apply current filters to the data
     */
    applyFilters(): void {
        this.updateChartData();
    }

    /**
     * Reset all filters to default values
     */
    resetFilters(): void {
        this.minCoverage = 0;
        this.selectedPackage = '';
        this.searchTerm = '';

        // Keep exclusion patterns but disable them
        this.exclusionPatterns.forEach(p => p.enabled = false);
        this.saveExclusionPatterns();

        this.updateChartData();
        this.notificationService.showInfo('Filters Reset', 'All filters have been cleared');
    }

    /**
     * Rebuild hierarchy when grouping option changes
     */
    rebuildHierarchy(): void {
        const coverageData = this.coverageStore.getCurrentCoverageData();
        if (coverageData) {
            this.isLoading = true;
            this.hierarchyRoot = this.coverageDataService.buildHierarchy(coverageData, {
                groupSmallNodes: this.groupSmallNodes,
                simplifyNames: true
            });
            this.updateChartData();
            this.isLoading = false;
        }
    }

    /**
     * Handle node activation (hover)
     */
    onActivate(event: any): void {
        if (event && event.value && event.value.extra) {
            const node = event.value;

            // Set tooltip data
            this.tooltipNode = {
                name: node.name,
                isNamespace: node.extra.isNamespace,
                isGroupedNode: node.extra.isGroupedNode,
                packageName: node.extra.packageName,
                coverage: node.extra.coverage,
                linesValid: node.extra.linesValid,
                linesCovered: node.extra.linesCovered,
                branchCoverage: node.extra.branchCoverage,
                filename: node.extra.filename,
                isDomainGroup: node.extra.isDomainGroup
            };

            // Calculate tooltip position
            if (event.event) {
                const rect = this.chartContainer.nativeElement.getBoundingClientRect();
                this.tooltipX = event.event.clientX - rect.left + 10;
                this.tooltipY = event.event.clientY - rect.top + 10;

                // Ensure tooltip stays within view
                const maxX = rect.width - 320;
                if (this.tooltipX > maxX) {
                    this.tooltipX = maxX;
                }
            }

            this.showTooltip = true;
        }
    }

    /**
     * Handle node deactivation (mouse leave)
     */
    onDeactivate(): void {
        this.showTooltip = false;
    }

    /**
     * Handle node selection
     */
    onSelect(event: any): void {
        this.zone.run(() => {
            if (!event || !event.extra) return;

            const node = event;

            // Look up complete node data from map
            const nodeKey = `${node.extra.packageName || ''} -${node.name} `;
            const originalNode = this.nodeMap.get(nodeKey);

            if (originalNode) {
                this.selectedNode = originalNode;

                // Find class details if this is a class node
                if (!originalNode.isNamespace) {
                    this.findClassDetails(originalNode);
                } else {
                    this.selectedClass = null;
                    this.similarClasses = [];
                }
            } else {
                // Fallback if node not found in map
                this.selectedNode = {
                    name: node.name,
                    lineCoverage: node.extra.coverage,
                    isNamespace: node.extra.isNamespace,
                    packageName: node.extra.packageName,
                    linesValid: node.extra.linesValid,
                    linesCovered: node.extra.linesCovered,
                    branchCoverage: node.extra.branchCoverage,
                    filename: node.extra.filename,
                    children: [],
                    value: node.value
                };
                this.selectedClass = null;
                this.similarClasses = [];
            }

            // Emit selected node
            this.nodeSelected.emit(this.selectedNode as any);
        });
    }

    /**
     * Find class details from coverage data
     */
    private findClassDetails(node: TreeNode): void {
        const coverageData = this.coverageStore.getCurrentCoverageData();
        if (!coverageData || !node.packageName || !node.name) {
            this.selectedClass = null;
            return;
        }

        // Search for class in coverage data
        for (const pkg of coverageData.packages) {
            if (pkg.name === node.packageName) {
                const classInfo = pkg.classes.find(cls => cls.name === node.name);
                if (classInfo) {
                    this.selectedClass = classInfo;

                    // Find similar classes
                    this.findSimilarClasses(classInfo, node.packageName);
                    return;
                }
            }
        }

        this.selectedClass = null;
        this.similarClasses = [];
    }

    /**
     * Find classes with similar coverage in the same package
     */
    private findSimilarClasses(classInfo: ClassInfo, packageName: string): void {
        const coverageData = this.coverageStore.getCurrentCoverageData();
        if (!coverageData) {
            this.similarClasses = [];
            return;
        }

        // Find the package
        const pkg = coverageData.packages.find(p => p.name === packageName);
        if (!pkg) {
            this.similarClasses = [];
            return;
        }

        // Find similar classes (within 15% coverage, exclude self)
        this.similarClasses = pkg.classes
            .filter(cls =>
                cls.name !== classInfo.name &&
                Math.abs(cls.lineCoverage - classInfo.lineCoverage) < 15
            )
            .slice(0, 5) // Limit to 5 similar classes
            .map(cls => ({
                name: cls.name,
                packageName: packageName,
                coverage: cls.lineCoverage,
                linesValid: cls.linesValid || 0,
                linesCovered: cls.linesCovered || 0
            }));
    }

    /**
     * Select a child node from the package details view
     */
    selectChildNode(node: TreeNode): void {
        this.selectedNode = node;
        if (!node.isNamespace) {
            this.findClassDetails(node);
        } else {
            this.selectedClass = null;
            this.similarClasses = [];
        }
    }

    /**
     * Select a similar class from the list
     */
    selectSimilarClass(item: any): void {
        // Construct a synthetic node to match the TreeNode format
        const node: TreeNode = {
            name: item.name,
            packageName: item.packageName,
            lineCoverage: item.coverage,
            linesValid: item.linesValid,
            linesCovered: item.linesCovered,
            isNamespace: false,
            value: item.linesValid
        };

        this.selectChildNode(node);
    }

    /**
     * Close the details panel
     */
    closeDetails(): void {
        this.selectedNode = null;
        this.selectedClass = null;
        this.similarClasses = [];
    }

    /**
     * Get coverage CSS class based on percentage
     */
    getCoverageClass(rate: number): string {
        if (rate >= 90) return 'excellent';
        if (rate >= 75) return 'good';
        if (rate >= 50) return 'moderate';
        return 'poor';
    }

    /**
     * Get coverage color value for chart
     */
    getCoverageColorValue(rate: number): string {
        const colors = this.isDarkTheme
            ? ['#38a169', '#68d391', '#f6e05e', '#ed8936', '#e53e3e']
            : ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336'];

        if (rate >= 90) return colors[0];
        if (rate >= 75) return colors[1];
        if (rate >= 50) return colors[2];
        if (rate >= 25) return colors[3];
        return colors[4];
    }

    /**
     * Count of covered lines in the selected class
     */
    getCoveredLineCount(): number {
        if (!this.selectedClass) return 0;
        return this.selectedClass.lines.filter(line => line.hits > 0).length;
    }

    /**
     * Count of uncovered lines in the selected class
     */
    getUncoveredLineCount(): number {
        if (!this.selectedClass) return 0;
        return this.selectedClass.lines.filter(line => line.hits === 0).length;
    }

    /**
     * Count of branch lines in the selected class
     */
    getBranchLineCount(): number {
        if (!this.selectedClass) return 0;
        return this.selectedClass.lines.filter(line => line.branch).length;
    }

    // Exclusion pattern management

    /**
     * Toggle the exclusions panel
     */
    toggleExclusionsPanel(): void {
        this.showExclusionsPanel = !this.showExclusionsPanel;

        // Reset new pattern form when opening
        if (this.showExclusionsPanel) {
            this.newPattern = {
                pattern: '',
                type: 'class',
                description: '',
                enabled: true
            };
        }
    }

    /**
     * Load saved exclusion patterns from localStorage
     */
    private loadSavedExclusionPatterns(): void {
        const savedPatterns = localStorage.getItem('treemap-exclusion-patterns');
        if (savedPatterns) {
            try {
                this.exclusionPatterns = JSON.parse(savedPatterns);
            } catch (e) {
                console.error('Error loading saved exclusion patterns:', e);
                this.exclusionPatterns = [];
            }
        }
    }

    /**
     * Save exclusion patterns to localStorage
     */
    private saveExclusionPatterns(): void {
        localStorage.setItem('treemap-exclusion-patterns', JSON.stringify(this.exclusionPatterns));
    }

    /**
     * Add a new exclusion pattern
     */
    addPattern(): void {
        if (!this.newPattern.pattern) return;

        this.exclusionPatterns.push({
            ...this.newPattern,
            enabled: true
        });

        // Reset form
        this.newPattern = {
            pattern: '',
            type: 'class',
            description: '',
            enabled: true
        };

        this.saveExclusionPatterns();
        this.notificationService.showSuccess('Pattern Added', 'Exclusion pattern has been added');
    }

    /**
     * Remove an exclusion pattern
     */
    removePattern(index: number): void {
        if (index >= 0 && index < this.exclusionPatterns.length) {
            this.exclusionPatterns.splice(index, 1);
            this.saveExclusionPatterns();
            this.notificationService.showInfo('Pattern Removed', 'Exclusion pattern has been removed');
        }
    }

    /**
     * Toggle an exclusion pattern's enabled state
     */
    onPatternToggle(): void {
        this.saveExclusionPatterns();
    }

    /**
     * Apply exclusion patterns and update visualization
     */
    applyExclusions(): void {
        this.saveExclusionPatterns();
        this.updateChartData();
        this.toggleExclusionsPanel();
        this.notificationService.showSuccess('Exclusions Applied', 'Exclusion patterns have been applied');
    }

    /**
     * Enable all exclusion patterns
     */
    enableAllPatterns(): void {
        this.exclusionPatterns.forEach(p => p.enabled = true);
        this.saveExclusionPatterns();
    }

    /**
     * Disable all exclusion patterns
     */
    disableAllPatterns(): void {
        this.exclusionPatterns.forEach(p => p.enabled = false);
        this.saveExclusionPatterns();
    }

    /**
     * Add a predefined sample pattern
     */
    addSamplePattern(pattern: ExclusionPattern): void {
        // Check if a similar pattern already exists
        const exists = this.exclusionPatterns.some(p =>
            p.pattern === pattern.pattern && p.type === pattern.type
        );

        if (!exists) {
            this.exclusionPatterns.push({ ...pattern });
            this.saveExclusionPatterns();
            this.notificationService.showSuccess('Pattern Added', 'Sample pattern has been added');
        } else {
            this.notificationService.showInfo('Pattern Exists', 'This pattern already exists in your list');
        }
    }

    /**
     * Export chart as image
     */
    exportChart(): void {
        try {
            const svg = this.chartContainer.nativeElement.querySelector('svg');
            if (!svg) {
                this.notificationService.showError('Export Failed', 'SVG element not found');
                return;
            }

            // Create canvas for export
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) {
                this.notificationService.showError('Export Failed', 'Could not get canvas context');
                return;
            }

            // Set canvas dimensions
            const svgRect = svg.getBoundingClientRect();
            canvas.width = svgRect.width;
            canvas.height = svgRect.height;

            // Fill background
            context.fillStyle = this.isDarkTheme ? '#1a1a1a' : '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Convert SVG to image
            const svgData = new XMLSerializer().serializeToString(svg);
            const img = new Image();

            // Create a Blob from the SVG data
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                context.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);

                // Create download link
                canvas.toBlob(blob => {
                    if (blob) {
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = 'coverage-treemap.png';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(downloadUrl);

                        this.notificationService.showSuccess('Export Complete', 'Treemap has been exported as PNG');
                    }
                });
            };

            img.src = url;
        } catch (error) {
            console.error('Error exporting chart:', error);
            this.notificationService.showError('Export Failed', 'An error occurred while exporting the chart');
        }
    }

    /**
     * Custom label formatting for treemap
     */
    labelFormatting = (item: any): string => {
        if (!this.showLabels) return '';

        const name = item.name || '';
        let label = name;

        // For large nodes, add coverage percentage
        if (item.value > 100) {
            label = `${name} (${item.extra?.coverage?.toFixed(1) || 0}%)`;
        }

        // Truncate if too long
        if (label.length > 25) {
            label = label.substring(0, 22) + '...';
        }

        return label;
    };

    /**
     * Custom value formatting for tooltips
     */
    valueFormatting = (value: number): string => {
        return `${value} lines`;
    };
}