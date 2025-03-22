import { Component, OnInit, OnDestroy, Input, ViewChild } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { trigger, style, transition, animate } from '@angular/animations';
import { Subscription } from "rxjs";
import { ClassInfo, Coverage, CoverageData } from "../../../../models/coverage.model";
import { CoverageDataService } from "../../../../services/coverage-data.service";
import { CoverageStoreService } from "../../../../services/coverage-store.service";
import { TreemapLayoutService } from "../../../../services/utils/treemap-layout.service";
import { TreemapControlsComponent } from "../treemap-controls/treemap-controls.component";
import { TreemapDetailsComponent } from "../treemap-details/treemap-details.component";
import { ThemeService } from "../../../../services/utils/theme.service";
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
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class CoverageTreemapComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    @ViewChild(TreemapVisualizationComponent) treemapVisualization!: TreemapVisualizationComponent;

    // Theme & loading states
    isLoading = true;

    // Filter states
    minCoverage = 0;
    selectedPackage = '';
    groupSmallNodes = false;
    searchTerm = '';
    showFilters = false;
    showLabels = true;
    colorMode: 'default' | 'colorblind' = 'default';
    minLines = 0;
    sortBy = 'size';
    hasActiveFilters = false;

    // Data
    originalData: Coverage[] = [];
    filteredData: Coverage[] = [];
    hierarchicalData: any = null; // The actual D3 hierarchy data
    packageList: string[] = [];
    coverageRanges: any[] = [];

    // Current coverage data
    private currentCoverageData: CoverageData | null = null;

    // For node selection
    selectedNode: Coverage | null = null;
    selectedClass: ClassInfo | null = null;
    similarClasses: Coverage[] = [];

    // Subscriptions
    private subscriptions: Subscription = new Subscription();

    constructor(
        private coverageDataService: CoverageDataService,
        private coverageStoreService: CoverageStoreService,
        private treemapLayoutService: TreemapLayoutService,
        private themeService: ThemeService
    ) { }

    get hasData(): boolean {
        return this.filteredData && this.filteredData.length > 0;
    }

    ngOnInit(): void {
        // Subscribe to theme changes
        this.subscriptions.add(
            this.themeService.darkTheme$.subscribe(isDark => {
                this.isDarkTheme = isDark;
                this.updateTreemapWithTheme();
            })
        );

        // Set default coverage ranges from service
        this.coverageRanges = this.treemapLayoutService.getDefaultCoverageRanges(this.isDarkTheme);

        // Load coverage data
        this.loadCoverageData();
    }

    ngOnDestroy(): void {
        // Clean up subscriptions
        this.subscriptions.unsubscribe();
    }

    private updateTreemapWithTheme(): void {
        // Update coverage ranges based on theme
        this.coverageRanges = this.colorMode === 'colorblind'
            ? this.treemapLayoutService.getColorblindCoverageRanges()
            : this.treemapLayoutService.getDefaultCoverageRanges(this.isDarkTheme);
    }

    private loadCoverageData(): void {
        this.isLoading = true;

        // Subscribe to the coverage data from the store service
        const subscription = this.coverageStoreService.getCoverageData().subscribe({
            next: (coverageData) => {
                if (coverageData) {
                    // Store the current coverage data
                    this.currentCoverageData = coverageData;

                    // Transform the CoverageData to flat Coverage array
                    this.originalData = this.coverageDataService.transformToHierarchy(coverageData);

                    // Build package list
                    this.extractPackageList();

                    // Apply initial filters
                    this.applyFilters();
                } else {
                    // No data available
                    this.originalData = [];
                    this.filteredData = [];
                }

                this.isLoading = false;
            }
        });

        this.subscriptions.add(subscription);
    }

    private extractPackageList(): void {
        const uniquePackages = new Set<string>();

        this.originalData.forEach(item => {
            if (item.packageName) {
                uniquePackages.add(item.packageName);
            }
        });

        this.packageList = Array.from(uniquePackages).sort();
    }

    private applyFilters(): void {
        let data = [...this.originalData];

        // 1. Filter by min coverage
        if (this.minCoverage > 0) {
            data = data.filter(item => item.coverage >= this.minCoverage);
        }

        // 2. Filter by selected package
        if (this.selectedPackage) {
            data = data.filter(item => item.packageName === this.selectedPackage);
        }

        // 3. Search term filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            data = data.filter(item => {
                const className = item.className.toLowerCase();
                const packageName = item.packageName?.toLowerCase() || '';
                return className.includes(term) || packageName.includes(term);
            });
        }

        // 4. Min lines filter
        if (this.minLines > 0) {
            data = data.filter(item => item.linesValid >= this.minLines);
        }

        // 5. Group small nodes
        if (this.groupSmallNodes) {
            data = this.treemapLayoutService.groupSmallNodes(data, 10);
        }

        // 6. Sorting
        switch (this.sortBy) {
            case 'coverage':
                data.sort((a, b) => b.coverage - a.coverage);
                break;
            case 'name':
                data.sort((a, b) => a.className.localeCompare(b.className));
                break;
            case 'size':
            default:
                data.sort((a, b) => b.linesValid - a.linesValid);
                break;
        }

        this.filteredData = data;

        // Update hasActiveFilters flag
        this.hasActiveFilters = this.minCoverage > 0 ||
            !!this.selectedPackage ||
            !!this.searchTerm ||
            this.groupSmallNodes ||
            this.minLines > 0 ||
            this.sortBy !== 'size';

        // Reset selected node when filters change
        this.selectedNode = null;
        this.selectedClass = null;
    }
    // Handler for node selection
    onNodeSelected(node: Coverage): void {
        this.selectedNode = node;

        // Find the actual class info to show details
        if (this.selectedNode && !this.selectedNode.isNamespace) {
            this.findClassDetails(this.selectedNode);
        }

        // Find similar classes if we have a selected node
        if (this.selectedNode && this.selectedNode.packageName) {
            this.findSimilarClasses();
        } else {
            this.similarClasses = [];
        }
    }

    private async findClassDetails(node: Coverage): Promise<void> {
        // Find the actual class details from the current coverage data
        if (!this.currentCoverageData) return;

        for (const pkg of this.currentCoverageData.packages) {
            if (pkg.name === node.packageName) {
                for (const cls of pkg.classes) {
                    if (cls.name === node.className) {
                        this.selectedClass = cls;
                        return;
                    }
                }
            }
        }

        this.selectedClass = null;
    }

    private findSimilarClasses(): void {
        if (!this.selectedNode || !this.selectedNode.packageName) {
            this.similarClasses = [];
            return;
        }

        // Find classes in the same package with similar coverage
        this.similarClasses = this.filteredData.filter(item =>
            item.packageName === this.selectedNode!.packageName &&
            item.className !== this.selectedNode!.className &&
            Math.abs(item.coverage - this.selectedNode!.coverage) < 15 // Within 15% coverage
        ).slice(0, 5); // Limit to 5 similar classes
    }

    // Public method to allow refreshing the treemap from outside
    public refreshVisualization(): void {
        if (!this.isLoading) {
            this.applyFilters();
        }
    }

    // Control change handlers
    onMinCoverageChange(value: number): void {
        this.minCoverage = value;
        this.applyFilters();
    }

    onSelectedPackageChange(value: string): void {
        this.selectedPackage = value;
        this.applyFilters();
    }

    onGroupSmallNodesChange(value: boolean): void {
        this.groupSmallNodes = value;
        this.applyFilters();
    }

    onSearchTermChange(value: string): void {
        this.searchTerm = value;
        this.applyFilters();
    }

    onShowLabelsChange(value: boolean): void {
        this.showLabels = value;
    }

    onColorModeChange(value: string): void {
        this.colorMode = value as 'default' | 'colorblind';

        // Update color ranges if color mode changes
        if (value === 'colorblind') {
            this.coverageRanges = this.treemapLayoutService.getColorblindCoverageRanges();
        } else {
            this.coverageRanges = this.treemapLayoutService.getDefaultCoverageRanges(this.isDarkTheme);
        }
    }

    onMinLinesChange(value: number): void {
        this.minLines = value;
        this.applyFilters();
    }

    onSortByChange(value: string): void {
        this.sortBy = value;
        this.applyFilters();
    }

    onClearAllFilters(): void {
        // Reset all filters to default values
        this.minCoverage = 0;
        this.selectedPackage = '';
        this.groupSmallNodes = false;
        this.searchTerm = '';
        this.minLines = 0;
        this.sortBy = 'size';

        // Apply the reset filters
        this.applyFilters();
    }

    onToggleFilters(expanded: boolean): void {
        this.showFilters = expanded;
    }

    // Method to close class details panel
    closeDetails(): void {
        this.selectedNode = null;
        this.selectedClass = null;
        this.similarClasses = [];
    }

    // Handle click on a similar class
    onSelectSimilarClass(node: Coverage): void {
        this.selectedNode = node;
        this.findClassDetails(node);
    }

    // Reset zoom to show the entire treemap
    resetZoom(): void {
        if (this.treemapVisualization) {
            this.treemapVisualization.resetZoom();
        }
    }
}