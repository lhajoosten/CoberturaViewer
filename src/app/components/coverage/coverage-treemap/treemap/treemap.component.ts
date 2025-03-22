import { CommonModule } from "@angular/common";
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Input, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { trigger, style, transition, animate } from '@angular/animations';
import { Subscription } from "rxjs";
import { CoverageData, TreeNode } from "../../../../models/coverage.model";
import { CoverageDataService } from "../../../../services/coverage-data.service";
import { CoverageStoreService } from "../../../../services/coverage-store.service";
import { ThemeService } from "../../../../services/utils/theme.service";
import { TreemapControlsComponent } from "../treemap-controls/treemap-controls.component";
import { TreemapDetailsComponent } from "../treemap-details/treemap-details.component";
import { TreemapVisualizationComponent } from "../treemap-visualization/treemap-visualization.component";

@Component({
    selector: 'app-coverage-treemap',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TreemapControlsComponent,
        TreemapDetailsComponent,
        TreemapVisualizationComponent
    ],
    templateUrl: './treemap.component.html',
    styleUrls: ['./treemap.component.scss'],
    animations: [
        trigger('slideInOut', [
            transition(':enter', [
                style({ transform: 'translateX(100%)' }),
                animate('300ms ease-out', style({ transform: 'translateX(0)' }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
            ])
        ]),
        trigger('slideDown', [
            transition(':enter', [
                style({ maxHeight: '0', opacity: 0, overflow: 'hidden' }),
                animate('300ms ease-out', style({ maxHeight: '1000px', opacity: 1 }))
            ]),
            transition(':leave', [
                style({ maxHeight: '1000px', opacity: 1, overflow: 'hidden' }),
                animate('300ms ease-in', style({ maxHeight: '0', opacity: 0 }))
            ])
        ])
    ]
})
export class CoverageTreemapComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    // Core data properties
    coverageData: CoverageData | null = null;
    hierarchyData: TreeNode | null = null;
    filteredData: TreeNode | null = null;
    isLoading = false;
    hasData = false;

    // Visualization state
    isZoomed = false;
    snapshots: any[] = [];

    // User interface options
    minCoverage = 0;
    searchTerm = '';
    showFilters = false;
    selectedPackage = '';
    packageList: string[] = [];
    minLines = 0;
    sortBy: 'size' | 'coverage' | 'name' = 'size';

    // Display configuration
    colorMode: 'default' | 'colorblind' = 'default';
    themeDark = false;
    showLabels = true;
    groupSmallNodes = false; // Default to enabled

    // Selected node details
    selectedNode: any = null;
    inFocusMode = false;
    focusedNode: any = null;
    navigationPath: any[] = [];
    similarClasses: any[] = [];

    // Coverage legend ranges
    coverageRanges = [
        { min: 90, max: 100, label: '90-100%', color: '#4caf50' }, // Green
        { min: 75, max: 89.99, label: '75-89%', color: '#8bc34a' }, // Light green
        { min: 50, max: 74.99, label: '50-74%', color: '#ffb400' }, // Yellow
        { min: 0, max: 49.99, label: '0-49%', color: '#f44336' }   // Red
    ];

    constructor(
        private coverageStore: CoverageStoreService,
        private coverageDataService: CoverageDataService,
        private themeService: ThemeService
    ) { }

    ngOnInit(): void {
        this.loadCoverageHistory();

        // Subscribe to coverage data
        this.coverageStore.getCoverageData().subscribe(data => {
            this.isLoading = true;
            this.coverageData = data;
            this.hasData = !!data;

            if (data) {
                // Process data
                this.initializePackageList();
                this.saveCoverageSnapshot();

                // Transform data to hierarchy
                this.hierarchyData = this.coverageDataService.transformToHierarchy(data);
                this.updateFilteredData();

                setTimeout(() => {
                    this.isLoading = false;
                }, 0);
            } else {
                this.isLoading = false;
            }
        });

        // Subscribe to theme changes
        this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
            this.isDarkTheme = isDark;
            this.themeDark = isDark;
        });
    }

    ngAfterViewInit(): void {
        // Nothing to do here since visualization is now handled by child component
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    /**
     * Update filtered data based on current filters
     */
    private updateFilteredData(): void {
        if (!this.hierarchyData) return;

        // Apply filters to data
        let filteredData = this.hierarchyData;

        // Filter by coverage
        if (this.minCoverage > 0) {
            filteredData = this.coverageDataService.filterByCoverage(filteredData, this.minCoverage);
        }

        // Apply search if needed
        if (this.searchTerm) {
            this.coverageDataService.applySearch(filteredData, this.searchTerm);
        }

        // Store filtered data
        this.filteredData = filteredData;
    }

    /**
     * Initialize package list from coverage data
     */
    private initializePackageList(): void {
        if (!this.coverageData) return;

        this.packageList = this.coverageData.packages
            .map(pkg => pkg.name || 'Default Package')
            .filter((value, index, self) => self.indexOf(value) === index)
            .sort();
    }

    /**
     * Update visualization based on current filters
     */
    updateVisualization(): void {
        this.updateFilteredData();
    }

    /**
     * Search functionality
     */
    onSearchTermChange(term: string): void {
        this.searchTerm = term;
        this.updateVisualization();
    }

    onResetSearch(): void {
        this.searchTerm = '';
        this.updateVisualization();
    }

    /**
     * Filter by coverage
     */
    onMinCoverageChange(value: number): void {
        this.minCoverage = value;
        this.updateVisualization();
    }

    /**
     * Toggle small node grouping
     */
    onGroupSmallNodesChange(value: boolean): void {
        this.groupSmallNodes = value;
    }

    /**
     * Set color scheme for colorblind users
     */
    onColorModeChange(mode: 'default' | 'colorblind'): void {
        this.colorMode = mode;
    }

    /**
     * Toggle node labels
     */
    onShowLabelsChange(value: boolean): void {
        this.showLabels = value;
    }

    /**
     * Toggle filter panel
     */
    onShowFiltersChange(value: boolean): void {
        this.showFilters = value;
    }

    /**
     * Change package filter
     */
    onSelectedPackageChange(value: string): void {
        this.selectedPackage = value;
        this.updateVisualization();
    }

    /**
     * Change minimum lines filter
     */
    onMinLinesChange(value: number): void {
        this.minLines = value;
        this.updateVisualization();
    }

    /**
     * Change sort method
     */
    onSortByChange(value: string): void {
        this.sortBy = value as 'size' | 'coverage' | 'name';
        this.updateVisualization();
    }

    /**
     * Clear all filters
     */
    onClearFilters(): void {
        this.minCoverage = 0;
        this.selectedPackage = '';
        this.minLines = 0;
        this.searchTerm = '';
        this.updateVisualization();
    }

    /**
     * Select a node for detailed view
     */
    onNodeSelected(node: any): void {
        this.selectedNode = node;

        // Find similar classes
        if (node && !node.data.isNamespace) {
            this.findSimilarClasses(node);
        }
    }

    /**
     * Clear selected node
     */
    onCloseDetails(): void {
        this.selectedNode = null;
    }

    /**
     * Get color class for CSS styling
     */
    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }

    /**
     * Format coverage as text
     */
    getCoverageText(coverage: number): string {
        return `${coverage.toFixed(1)}%`;
    }

    /**
     * Find classes with similar coverage
     */
    findSimilarClasses(node: any): void {
        if (!node || !this.coverageData) {
            this.similarClasses = [];
            return;
        }

        const nodeCoverage = node.data.coverage;
        const similarThreshold = 5; // Within 5% coverage

        // Flatten all classes
        let allClasses: any[] = [];
        this.coverageData.packages.forEach(pkg => {
            pkg.classes.forEach(cls => {
                allClasses.push({
                    name: cls.name,
                    path: `${pkg.name || 'Default Package'}.${cls.name}`,
                    coverage: cls.lineRate,
                    package: pkg.name
                });
            });
        });

        // Find classes with similar coverage
        this.similarClasses = allClasses
            .filter(cls =>
                // Not the same class
                cls.path !== node.data.path &&
                // Similar coverage (within threshold)
                Math.abs(cls.coverage - nodeCoverage) <= similarThreshold)
            .sort((a, b) => Math.abs(a.coverage - nodeCoverage) - Math.abs(b.coverage - nodeCoverage))
            .slice(0, 5); // Top 5 similar classes
    }

    /**
     * Select a similar node
     */
    onSelectSimilarNode(item: any): void {
        // Implementation would need to find the node in the hierarchy
        // This is a simplified version
        this.onNodeSelected({
            data: {
                name: item.name,
                path: item.path,
                coverage: item.coverage,
                isNamespace: false
            }
        });
    }

    // History tracking methods (simplified)
    saveCoverageSnapshot(): void {
        // Implementation would save current coverage data to history
    }

    loadCoverageHistory(): void {
        // Implementation would load saved coverage history
    }

    clearHistory(): void {
        localStorage.removeItem('coverage-history');
        this.snapshots = [];
    }
}