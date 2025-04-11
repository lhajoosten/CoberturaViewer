import { trigger, transition, style, animate } from "@angular/animations";
import { CommonModule } from "@angular/common";
import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, NgZone, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { Subscription } from "rxjs";
import { TreeNode, ClassInfo, CoverageData } from "../../../common/models/coverage.model";
import { CoverageDataService } from "../../../common/services/coverage-data.service";
import { CoverageStoreService } from "../../../common/services/coverage-store.service";
import { NotificationService } from "../../../common/utils/notification.utility";
import { ThemeService } from "../../../common/utils/theme.utility";
import { ExclusionPattern } from "../../../common/models/treemap.model";

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
    showFiltersPanel = false;

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

    // Navigation
    currentLevel: TreeNode | null = null;
    navigationPath: TreeNode[] = [];
    colorMode: 'coverage' | 'type' | 'size' = 'coverage';
    showOutlines = true;

    // Add a legend configuration property
    legend = {
        show: true,
        position: 'bottom' as const
    };

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
    width = window.innerWidth - 40; // Start with a reasonable default width
    height = window.innerHeight - 200; // Start with a reasonable default height

    // Map to maintain original data references
    private nodeMap = new Map<string, TreeNode>();
    private subscriptions: Subscription = new Subscription();

    get enabledExclusionPatternsCount(): number {
        return this.exclusionPatterns.filter(p => p.enabled).length;
    }

    private resizeTimer: any;

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

        // Set initial dimensions immediately to avoid the fixed 400px initial state
        this.updateChartDimensions();

        // Use a small delay to ensure initial size calculation is correct
        setTimeout(() => this.updateChartDimensions(), 100);

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

                    // Reset navigation
                    this.resetNavigation();

                    // Update dimensions again after data is loaded
                    setTimeout(() => this.updateChartDimensions(), 50);
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
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    @HostListener('window:resize')
    onResize(): void {
        // Use a debounce to avoid too many updates
        if (this.resizeTimer) {
            clearTimeout(this.resizeTimer);
        }

        this.resizeTimer = setTimeout(() => {
            this.updateChartDimensions();
        }, 50);
    }

    /**
     * Update chart dimensions based on container size
     */
    private updateChartDimensions(): void {
        if (this.chartContainer && this.chartContainer.nativeElement) {
            // Get the container's parent to ensure we measure the right element
            const container = this.chartContainer.nativeElement;

            // Get dimensions from container
            setTimeout(() => {
                // Use setTimeout to ensure DOM has settled
                const rect = container.getBoundingClientRect();

                // Check if container has reasonable dimensions
                if (rect.width > 20 && rect.height > 20) {
                    // Calculate available width and height, accounting for padding/margin
                    // Subtract panel width (320px) if panel is open
                    const panelAdjustment =
                        (this.showExclusionsPanel || this.showFiltersPanel || this.selectedNode) ? 320 : 0;

                    // New width based on container minus any open panels
                    const newWidth = Math.max(rect.width - panelAdjustment, 300);

                    // Calculate height based on container (minus control area)
                    // We need to account for controls and navigation taking up space
                    const controlHeight =
                        56 + (this.navigationPath.length > 0 ? 48 : 0); // Estimated height of controls
                    const newHeight = Math.max(rect.height - controlHeight, 300);

                    // Only trigger update if dimensions actually changed
                    if (this.width !== newWidth || this.height !== newHeight) {
                        this.zone.run(() => {
                            this.width = newWidth;
                            this.height = newHeight;
                        });
                    }
                }
            }, 0);
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
        // For coverage colors, use the application's color system
        if (this.colorMode === 'coverage') {
            this.colorScheme = {
                domain: this.isDarkTheme
                    ? ['#00cc78', '#7c49e3', '#ffb400', '#e53e3e'] // success, primary-light, warning, error
                    : ['#00cc78', '#5b2ac3', '#ffb400', '#e53e3e']  // success, primary, warning, error
            };
        } else if (this.colorMode === 'type') {
            // For type coloring, use complementary colors from the application palette
            this.colorScheme = {
                domain: this.isDarkTheme
                    ? ['#7c49e3', '#00ff95', '#ffb400', '#e53e3e']  // primary-light, accent, warning, error
                    : ['#5b2ac3', '#00cc78', '#ffb400', '#e53e3e']  // primary, accent-dark, warning, error
            };
        } else {
            // For size-based coloring, use gradient of primary colors
            this.colorScheme = {
                domain: this.isDarkTheme
                    ? ['#1e2133', '#262b40', '#2e355a', '#4a1eb0', '#5b2ac3', '#7c49e3'] // dark to primary-light
                    : ['#f8f9fa', '#e2e8f0', '#4a1eb0', '#5b2ac3', '#7c49e3']            // light to primary-light
            };
        }
    }

    /**
     * Update chart options when display settings change
     */
    updateChartOptions(): void {
        // Update chart options based on current settings

        // Update stroke width based on showOutlines setting
        if (this.chartContainer && this.chartContainer.nativeElement) {
            const svg = this.chartContainer.nativeElement.querySelector('svg');
            if (svg) {
                setTimeout(() => {
                    const cells = svg.querySelectorAll('.cell');
                    cells.forEach((cell: SVGElement) => {
                        cell.style.strokeWidth = this.showOutlines ? '1px' : '0';
                    });
                }, 50);
            }
        }

        // Update color scheme based on colorMode
        if (this.colorMode === 'coverage') {
            this.updateColorScheme();
        }

        // Refresh chart data
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

        // Create a true hierarchical structure for the treemap
        // Start with the root node if we're at the top level
        if (!this.currentLevel) {
            // Transform hierarchy to ngx-charts format with recursive processing
            const result = this.processTreeNodes(this.hierarchyRoot.children);

            // Sort top-level nodes
            this.sortNodes(result);
            this.chartData = result;
        } else {
            // We're at a specific level, showing children of that level
            if (this.currentLevel.children) {
                const result = this.processTreeNodes(this.currentLevel.children);
                this.sortNodes(result);
                this.chartData = result;
            } else {
                this.chartData = [];
            }
        }

        this.updateFiltersState();
    }

    /**
     * Process tree nodes recursively to create the treemap structure
     */
    private processTreeNodes(nodes: TreeNode[]): any[] {
        const result: any[] = [];

        for (const node of nodes) {
            // Apply filters
            if (this.shouldFilterNode(node)) {
                continue;
            }

            const nodeKey = `${node.packageName || ''} -${node.name} `;
            this.nodeMap.set(nodeKey, node);

            // Create node data
            const nodeData: any = {
                name: node.name,
                value: node.value || node.linesValid || 1, // Ensure minimum value
                extra: {
                    coverage: node.lineCoverage,
                    isNamespace: node.isNamespace,
                    isGroupedNode: node.isGroupedNode,
                    packageName: node.packageName,
                    linesValid: node.linesValid,
                    linesCovered: node.linesCovered,
                    branchCoverage: node.branchCoverage,
                    filename: node.filename,
                    originalData: node.originalData,
                    isDomainGroup: node.isDomainGroup
                },
                // Customize color based on selected mode
                color: this.getNodeColor(node)
            };

            // Process children recursively if current level is visible
            // (don't go too deep if we're at a specific level)
            if (node.children && node.children.length > 0 &&
                (!this.currentLevel || this.currentLevel === this.hierarchyRoot)) {
                nodeData.children = [];

                for (const child of node.children) {
                    // Apply filters to children
                    if (this.shouldFilterNode(child)) {
                        continue;
                    }

                    const childKey = `${child.packageName || node.name} -${child.name} `;
                    this.nodeMap.set(childKey, child);

                    const childData = {
                        name: child.name,
                        value: child.value || child.linesValid || 1,
                        extra: {
                            coverage: child.lineCoverage,
                            isNamespace: child.isNamespace,
                            isGroupedNode: child.isGroupedNode,
                            packageName: child.packageName || node.name,
                            linesValid: child.linesValid,
                            linesCovered: child.linesCovered,
                            branchCoverage: child.branchCoverage,
                            filename: child.filename,
                            originalData: child.originalData,
                            isDomainGroup: child.isDomainGroup
                        },
                        color: this.getNodeColor(node)
                    };

                    nodeData.children.push(childData);
                }

                // Sort children
                if (nodeData.children.length > 0) {
                    this.sortNodes(nodeData.children);
                }
            }

            result.push(nodeData);
        }

        return result;
    }

    /**
 * Get node color based on current color mode
 */
    private getNodeColor(node: TreeNode): string {
        switch (this.colorMode) {
            case 'coverage':
                return this.getCoverageColorValue(node.lineCoverage);

            case 'type':
                // Color by node type using application colors
                if (node.isNamespace) {
                    return this.isDarkTheme ? '#262b40' : '#e2e8f0';  // card-header-bg/border
                } else if (node.isGroupedNode) {
                    return this.isDarkTheme ? '#7c49e3' : '#5b2ac3';  // primary-light/primary
                } else {
                    // Classes based on domain
                    const isDomain = node.packageName?.includes('.domain.') || false;
                    const isUtil = node.packageName?.includes('.util.') || node.name.includes('Util');
                    const isService = node.name.includes('Service');

                    if (isDomain) {
                        return this.isDarkTheme ? '#00ff95' : '#00cc78';  // accent/accent-dark
                    } else if (isService) {
                        return this.isDarkTheme ? '#00cc78' : '#00cc78';  // success
                    } else if (isUtil) {
                        return this.isDarkTheme ? '#ffb400' : '#ffb400';  // warning
                    } else {
                        return this.isDarkTheme ? '#a0aec0' : '#718096';  // text-muted-dark/text-muted
                    }
                }

            case 'size':
                // Use a gradient based on primary colors from the app
                const maxSize = this.getMaxSiblingSize(node);
                const ratio = maxSize > 0 ? (node.value || 0) / maxSize : 0;

                const colors = this.isDarkTheme
                    ? ['#1e2133', '#262b40', '#2e355a', '#4a1eb0', '#5b2ac3', '#7c49e3'] // dark gradient to primary-light
                    : ['#f8f9fa', '#e2e8f0', '#4a1eb0', '#5b2ac3', '#7c49e3'];           // light to primary-light

                // Map ratio to color index
                const index = Math.min(colors.length - 1, Math.floor(ratio * colors.length));
                return colors[index];

            default:
                return this.getCoverageColorValue(node.lineCoverage);
        }
    }

    /**
 * Get the maximum size among siblings
 */
    private getMaxSiblingSize(node: TreeNode): number {
        if (!this.hierarchyRoot || !this.hierarchyRoot.children) return 1;

        // Find parent node
        const findParentNode = (nodes: TreeNode[], target: TreeNode): TreeNode | null => {
            for (const n of nodes) {
                if (n.children && n.children.includes(target)) {
                    return n;
                }
                if (n.children) {
                    const parent = findParentNode(n.children, target);
                    if (parent) return parent;
                }
            }
            return null;
        };

        // Get siblings
        let siblings: TreeNode[] = this.hierarchyRoot.children;
        if (node.parent) {
            siblings = node.parent.children || [];
        } else {
            const parent = findParentNode(this.hierarchyRoot.children, node);
            if (parent && parent.children) {
                siblings = parent.children;
            }
        }

        // Find max size
        let maxSize = 1;
        for (const sibling of siblings) {
            maxSize = Math.max(maxSize, sibling.value || sibling.linesValid || 0);
        }

        return maxSize;
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

        // Package filter - only filter if not the package itself
        if (this.selectedPackage && node.packageName !== this.selectedPackage) {
            // Special case: if this is the package itself, don't filter it
            if (!(node.isNamespace && node.name === this.selectedPackage)) {
                return true;
            }
        }

        // Search term filter - case insensitive search in name and package
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            const nodeName = node.name.toLowerCase();
            const packageName = (node.packageName || '').toLowerCase();

            if (!nodeName.includes(term) && !packageName.includes(term)) {
                return true;
            }
        }

        // Exclusion patterns filter
        if (this.exclusionPatterns && this.exclusionPatterns.length > 0) {
            const enabledPatterns = this.exclusionPatterns.filter(p => p.enabled);

            if (enabledPatterns.length > 0) {
                for (const pattern of enabledPatterns) {
                    // Choose what to match based on pattern type
                    const target = pattern.type === 'class' ? node.name : (node.packageName || '');

                    // Skip pattern if target doesn't match node type
                    if (pattern.type === 'class' && node.isNamespace) continue;
                    if (pattern.type === 'package' && !node.isNamespace) continue;

                    // Check for match based on pattern type
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
                            const escapedPattern = pattern.pattern
                                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                                .replace(/\*/g, '.*');
                            isMatch = new RegExp(`^${escapedPattern}$`).test(target);
                        } else {
                            isMatch = target.includes(pattern.pattern);
                        }
                    }

                    if (isMatch) {
                        return true;
                    }
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
        this.showFiltersPanel = false;
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
     * Toggle filters panel visibility
     */
    toggleFiltersPanel(): void {
        this.showFiltersPanel = !this.showFiltersPanel;
        if (this.showFiltersPanel) {
            this.showExclusionsPanel = false;
        }
        // Update chart size when panel state changes
        setTimeout(() => this.updateChartDimensions(), 50);
    }

    /**
     * Update range value display for min coverage slider
     */
    updateRangeValue(): void {
        // This is just to ensure the component updates when the range changes
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
                isDomainGroup: node.extra.isDomainGroup,
                // Add extra useful info:
                uncoveredLines: node.extra.linesValid - node.extra.linesCovered,
                percentOfTotal: (node.value / this.getTotalLines()) * 100
            };

            // Calculate tooltip position - improve positioning to avoid clipping
            if (event.event) {
                const rect = this.chartContainer.nativeElement.getBoundingClientRect();
                const tooltipWidth = 300;
                const tooltipHeight = 180; // Approximate tooltip height

                // Initial position - consider mouse pointer offset
                let posX = event.event.clientX - rect.left + 15;
                let posY = event.event.clientY - rect.top + 15;

                // Adjust if tooltip would go outside right edge
                if (posX + tooltipWidth > rect.width) {
                    posX = event.event.clientX - rect.left - tooltipWidth - 15;
                }

                // Adjust if tooltip would go outside bottom edge
                if (posY + tooltipHeight > rect.height) {
                    posY = event.event.clientY - rect.top - tooltipHeight - 15;
                }

                // Ensure tooltips don't go outside left/top edges
                posX = Math.max(10, posX);
                posY = Math.max(10, posY);

                this.tooltipX = posX;
                this.tooltipY = posY;
            }

            this.showTooltip = true;
        }
    }

    /**
     * Get total lines in the current view
     */
    private getTotalLines(): number {
        if (!this.chartData) return 1;

        // Sum up all values from chartData
        let total = 0;
        const sumValues = (nodes: any[]) => {
            for (const node of nodes) {
                total += node.value || 0;
                if (node.children && node.children.length) {
                    sumValues(node.children);
                }
            }
        };

        sumValues(this.chartData);
        return Math.max(1, total); // Avoid division by zero
    }

    /**
     * Handle node deactivation (mouse leave)
     */
    onDeactivate(): void {
        this.showTooltip = false;
    }

    /**
     * Handle node selection - this now supports zooming into nodes
     */
    onSelect(event: any): void {
        this.zone.run(() => {
            if (!event || !event.extra) return;

            const node = event;

            // Look up complete node data from map
            const nodeKey = `${node.extra.packageName || ''} -${node.name} `;
            const originalNode = this.nodeMap.get(nodeKey);

            if (originalNode) {
                // For namespace/package nodes, navigate into them
                if (originalNode.isNamespace && originalNode.children && originalNode.children.length > 0) {
                    this.navigateToNode(originalNode);
                    return;
                }

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
     * Navigate to a specific node level
     */
    navigateToNode(node: TreeNode): void {
        if (!node) return;

        this.isLoading = true;

        // Update navigation path
        this.currentLevel = node;

        // Build navigation path
        this.updateNavigationPath(node);

        // Update chart with new focus
        setTimeout(() => {
            this.updateChartData();
            this.isLoading = false;
        }, 100);
    }

    /**
     * Update the navigation breadcrumb path
     */
    private updateNavigationPath(node: TreeNode): void {
        if (!this.hierarchyRoot) return;

        // Start with empty path
        this.navigationPath = [];

        // Add root
        this.navigationPath.push(this.hierarchyRoot);

        // Find path to current node
        if (node !== this.hierarchyRoot) {
            const findPathToNode = (current: TreeNode, target: TreeNode, path: TreeNode[]): boolean => {
                if (current === target) return true;

                if (current.children) {
                    for (const child of current.children) {
                        path.push(child);
                        if (findPathToNode(child, target, path)) return true;
                        path.pop();
                    }
                }

                return false;
            };

            findPathToNode(this.hierarchyRoot, node, this.navigationPath);
        }
    }

    /**
     * Navigate up one level
     */
    navigateUp(): void {
        if (this.navigationPath.length > 1) {
            // Go to parent node (second last in path)
            const parentIndex = this.navigationPath.length - 2;
            if (parentIndex >= 0) {
                this.navigateToNode(this.navigationPath[parentIndex]);
            }
        } else {
            // Reset to root view
            this.resetNavigation();
        }
    }

    /**
     * Reset navigation to root level
     */
    resetNavigation(): void {
        this.currentLevel = null;
        this.navigationPath = [];
        this.updateChartData();
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
            branchCoverage: item.branchCoverage,
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

        // Update chart size when panel is closed
        setTimeout(() => this.updateChartDimensions(), 50);
    }

    /**
     * Get coverage CSS class based on percentage
     */
    getCoverageClass(rate: number): string {
        if (rate >= 90) return 'success';
        if (rate >= 75) return 'info';
        if (rate >= 50) return 'warning';
        return 'error';
    }

    /**
     * Get coverage color value for chart
     */
    getCoverageColorValue(rate: number): string {
        // Use application color tokens
        if (rate >= 90) {
            return this.isDarkTheme ? '#00cc78' : '#00cc78';  // success
        } else if (rate >= 75) {
            return this.isDarkTheme ? '#7c49e3' : '#5b2ac3';  // primary/primary-light
        } else if (rate >= 50) {
            return this.isDarkTheme ? '#ffb400' : '#ffb400';  // warning
        } else {
            return this.isDarkTheme ? '#e53e3e' : '#e53e3e';  // error
        }
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

        // Hide filters panel if showing exclusions
        if (this.showExclusionsPanel) {
            this.showFiltersPanel = false;
        }

        // Reset new pattern form when opening
        if (this.showExclusionsPanel) {
            this.newPattern = {
                pattern: '',
                type: 'class',
                description: '',
                enabled: true
            };
        }

        // Update chart size when panel state changes
        setTimeout(() => this.updateChartDimensions(), 50);
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
        try {
            localStorage.setItem('treemap-exclusion-patterns', JSON.stringify(this.exclusionPatterns));
            this.notificationService.showSuccess('Settings Saved', 'Exclusion patterns have been saved');
        } catch (error) {
            console.error('Error saving exclusion patterns:', error);
            this.notificationService.showError('Save Failed', 'Could not save exclusion patterns');
        }
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
        // If labels are disabled, return nothing
        if (!this.showLabels) return '';

        const name = item.name || '';
        const value = item.value || 0;
        const coverage = item.extra?.coverage;
        const isNamespace = item.extra?.isNamespace;

        // Different strategies for packages vs classes
        if (isNamespace) {
            // For packages, always try to show the package name
            if (name.length > 15) {
                return name.substring(0, 12) + '...';
            }
            return name;
        }

        // For classes, show name and coverage based on size
        if (value < 15) {
            // Very small nodes - no label or just abbreviated
            return value < 8 ? '' : name.substring(0, 2) + '..';
        } else if (value < 30) {
            // Small nodes - just name, possibly abbreviated
            return name.length > 10 ? name.substring(0, 8) + '..' : name;
        } else {
            // Larger nodes - name and coverage
            let label = name;
            if (name.length > 20) {
                label = name.substring(0, 18) + '..';
            }

            if (coverage !== undefined) {
                label += `\n${coverage.toFixed(0)}%`;
            }

            return label;
        }
    };

    /**
     * Custom value formatting for tooltips
     */
    valueFormatting = (value: number): string => {
        return `${value} lines`;
    };

    /**
     * Get the percentage of the node size relative to the total size
     */
    getNodeSizePercentage(node: TreeNode): number {
        if (!node || !this.hierarchyRoot) return 0;

        const nodeValue = node.linesValid || node.value || 0;
        let totalValue = 0;

        // Calculate total lines in the entire hierarchy
        const calculateTotalLines = (nodes: TreeNode[]) => {
            for (const n of nodes) {
                if (!n.isNamespace || n === node) {
                    totalValue += n.linesValid || n.value || 0;
                }

                if (n.children && n.children.length > 0) {
                    calculateTotalLines(n.children);
                }
            }
        };

        if (this.hierarchyRoot.children) {
            calculateTotalLines(this.hierarchyRoot.children);
        }

        return totalValue > 0 ? (nodeValue / totalValue) * 100 : 0;
    }

    /**
     * Get the legend title based on current color mode
     */
    getLegendTitle(): string {
        switch (this.colorMode) {
            case 'coverage':
                return 'Coverage Levels';
            case 'type':
                return 'Node Types';
            case 'size':
                return 'Node Sizes';
            default:
                return 'Legend';
        }
    }

    /**
     * Get legend info text based on current color mode
     */
    getLegendInfo(): string {
        switch (this.colorMode) {
            case 'coverage':
                return 'Colors represent the code coverage percentage of each node.';
            case 'type':
                return 'Colors represent the type of component (package, class, etc.).';
            case 'size':
                return 'Colors represent the relative size of nodes compared to siblings.';
            default:
                return 'The treemap shows code coverage data hierarchically.';
        }
    }
}