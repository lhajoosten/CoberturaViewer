import { Component, OnInit, OnDestroy, Input } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { trigger, style, transition, animate } from '@angular/animations';
import { Subscription } from "rxjs";
import { Coverage } from "../../../../models/coverage.model";
import { CoverageDataService } from "../../../../services/coverage-data.service";
import { CoverageStoreService } from "../../../../services/coverage-store.service";
import { TreemapLayoutService } from "../../../../services/utils/treemap-layout.service";
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
export class CoverageTreemapComponent implements OnInit, OnDestroy {
    // Theme & loading states
    @Input() isDarkTheme = false;
    isLoading = true;
    colorMode: 'default' | 'colorblind' = 'default';

    // Filter states
    minCoverage = 0;
    selectedPackage = '';
    groupSmallNodes = false;
    searchTerm = '';
    showFilters = false;
    showLabels = true;
    minLines = 0;
    sortBy = 'size';
    hasActiveFilters = false;

    // Data
    originalData: Coverage[] = [];
    filteredData: Coverage[] = [];
    packageList: string[] = [];
    coverageRanges: any[] = [];

    // For node selection
    selectedNode: Coverage | null = null;
    similarClasses: Coverage[] = [];

    // Subscriptions
    private subscriptions: Subscription = new Subscription();

    constructor(
        private coverageDataService: CoverageDataService,
        private coverageStoreService: CoverageStoreService,
        private treemapLayoutService: TreemapLayoutService
    ) { }

    get hasData(): boolean {
        return this.filteredData && this.filteredData.length > 0;
    }

    ngOnInit(): void {
        // Set default coverage ranges from service
        this.coverageRanges = this.treemapLayoutService.getDefaultCoverageRanges();

        // Check for dark theme preference
        this.checkThemePreference();

        // Load coverage data
        this.loadCoverageData();
    }

    ngOnDestroy(): void {
        // Clean up subscriptions
        this.subscriptions.unsubscribe();
    }

    private checkThemePreference(): void {
        // Check if user prefers dark theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.isDarkTheme = prefersDark;

        // Update color ranges based on theme
        this.coverageRanges = this.treemapLayoutService.getDefaultCoverageRanges(this.isDarkTheme);
    }

    private loadCoverageData(): void {
        this.isLoading = true;

        // Subscribe to the coverage data from the store service
        // This will update whenever a new report is uploaded
        const subscription = this.coverageStoreService.getCoverageData().subscribe({
            next: (coverageData) => {
                if (coverageData) {
                    // Transform the CoverageData to the format needed for the treemap
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
    }

    // Handler for node selection
    onNodeSelected(node: Coverage): void {
        this.selectedNode = node;

        // Find similar classes in the same package
        if (node.packageName) {
            this.similarClasses = this.filteredData.filter(item =>
                item.packageName === node.packageName &&
                item.className !== node.className
            ).slice(0, 10); // Limit to 10 similar classes
        } else {
            this.similarClasses = [];
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
}