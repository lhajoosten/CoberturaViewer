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
import { TreemapExclusionsComponent } from "../treemap-exclusions/treemap-exclusions.component";
import { ExclusionPattern, TreemapFilter } from "../../../../models/treemap-config.model";

@Component({
    selector: 'app-coverage-treemap',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        TreemapControlsComponent,
        TreemapDetailsComponent,
        TreemapExclusionsComponent,
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
    sortBy: 'size' | 'coverage' | 'name' = 'size';
    enableDomainGrouping = true;
    hasActiveFilters = false;

    // Exclusion functionality
    showExclusionsPanel = false;
    exclusionPatterns: ExclusionPattern[] = [];

    // Data
    originalData: Coverage[] = [];
    filteredData: Coverage[] = [];
    hierarchicalData: any = null; // The actual D3 hierarchy data
    packageList: string[] = [];
    domainList: string[] = [];
    coverageRanges: any[] = [];

    // Current coverage data
    private currentCoverageData: CoverageData | null = null;

    // For node selection
    selectedNode: Coverage | null = null;
    selectedClass: ClassInfo | null = null;
    similarClasses: Coverage[] = [];

    // Filters
    filters: TreemapFilter = {
        coverageThreshold: 0,
        minValidLines: 0,
        excludeEmptyPackages: true,
        excludeGeneratedCode: true,
        exclusionPatterns: [],
        searchTerm: '',
        selectedPackage: ''
    }

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

        // Load saved exclusion patterns from localStorage
        this.loadSavedExclusionPatterns();

        // Load coverage data
        this.loadCoverageData();
    }

    ngOnDestroy(): void {
        // Clean up subscriptions
        this.subscriptions.unsubscribe();
    }

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

    private saveExclusionPatterns(): void {
        localStorage.setItem('treemap-exclusion-patterns', JSON.stringify(this.exclusionPatterns));
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

                    // Extract domain and package lists
                    this.extractDomainAndPackageLists();

                    // Apply initial filters
                    this.applyFilters();
                } else {
                    // No data available
                    this.originalData = [];
                    this.filteredData = [];

                    // Update hasActiveFilters flag
                    this.hasActiveFilters = this.minCoverage > 0 ||
                        !!this.selectedPackage ||
                        !!this.searchTerm ||
                        this.groupSmallNodes ||
                        this.minLines > 0 ||
                        this.sortBy !== 'size' ||
                        this.exclusionPatterns.some(p => p.enabled);

                    // Reset selected node when filters change
                    this.selectedNode = null;
                    this.selectedClass = null;[];
                }

                this.isLoading = false;
            }
        });

        this.subscriptions.add(subscription);
    }

    private extractDomainAndPackageLists(): void {
        const uniquePackages = new Set<string>();
        const uniqueDomains = new Set<string>();

        this.originalData.forEach(item => {
            if (item.packageName) {
                uniquePackages.add(item.packageName);

                // Extract domain from package name (first two segments)
                const parts = item.packageName.split('.');
                if (parts.length >= 2) {
                    uniqueDomains.add(`${parts[0]}.${parts[1]}`);
                }
            }
        });

        this.packageList = Array.from(uniquePackages).sort();
        this.domainList = Array.from(uniqueDomains).sort();
    }

    private applyFilters(): void {
        // First apply exclusion patterns at the Coverage level
        let filteredData = this.applyExclusionPatterns(this.originalData);

        // Create a filter object to pass to the treemap visualization
        const filter: TreemapFilter = {
            // Include coverage threshold
            coverageThreshold: this.minCoverage > 0 ? this.minCoverage : undefined,

            // Include minimum lines requirement
            minValidLines: this.minLines > 0 ? this.minLines : undefined,

            // Always exclude empty packages for cleaner visualization
            excludeEmptyPackages: true,

            // Always exclude compiler-generated code
            excludeGeneratedCode: true,

            // Include only enabled exclusion patterns
            exclusionPatterns: this.exclusionPatterns.filter(p => p.enabled),

            // Add search term if provided
            searchTerm: this.searchTerm || undefined,

            // Add package filter if selected
            selectedPackage: this.selectedPackage || undefined
        };

        // Apply domain grouping if enabled
        if (this.enableDomainGrouping) {
            filteredData = this.treemapLayoutService.groupPackagesByDomain(filteredData);
        }

        // Group small nodes if enabled
        if (this.groupSmallNodes) {
            filteredData = this.treemapLayoutService.groupSmallNodes(filteredData, 10);
        }

        // Update the filtered data
        this.filteredData = filteredData;

        // Update the treemap visualization with the new filters and sort settings
        if (this.treemapVisualization) {
            this.filters = filter; // Set the filter property for reference
            this.treemapVisualization.filters = filter;
            this.treemapVisualization.sortBy = this.sortBy as 'size' | 'coverage' | 'name';
            // Force a refresh if the instance exists
            this.treemapVisualization.refreshLayout();
        }

        // Update active filters flag for UI feedback
        this.hasActiveFilters = this.minCoverage > 0 ||
            !!this.selectedPackage ||
            !!this.searchTerm ||
            this.groupSmallNodes ||
            this.minLines > 0 ||
            this.sortBy !== 'size' ||
            this.exclusionPatterns.some(p => p.enabled);

        // Reset selected node when filters change
        this.selectedNode = null;
        this.selectedClass = null;
    }

    private applyExclusionPatterns(data: Coverage[]): Coverage[] {
        // Skip the entire filtering if no patterns are enabled
        if (!this.exclusionPatterns.some(p => p.enabled)) {
            return data;
        }

        // Apply filtering
        return data.filter(item => {
            const filename = item.filename || '';
            const packageName = item.packageName || '';
            const className = item.className || '';

            // Exclude items from /obj/ directories - these are compilation artifacts
            if (filename.includes('/obj/') || filename.includes('\\obj\\')) {
                return false;
            }

            // Exclude compiler-generated code
            if (className && (
                className.includes('<>') ||
                className.includes('<PrivateImplementationDetails>') ||
                (className.includes('<') && className.includes('>d__'))
            )) {
                return false;
            }

            // Check user-defined exclusion patterns
            for (const pattern of this.exclusionPatterns) {
                if (!pattern.enabled) continue;

                switch (pattern.type) {
                    case 'class':
                        if (className.includes(pattern.pattern)) {
                            return false;
                        }
                        break;
                    case 'package':
                        if (packageName.includes(pattern.pattern)) {
                            return false;
                        }
                        break;
                    case 'regex':
                        try {
                            const regex = new RegExp(pattern.pattern);
                            if (regex.test(className) || regex.test(packageName)) {
                                return false;
                            }
                        } catch (e) {
                            console.error('Invalid regex pattern:', pattern.pattern);
                        }
                        break;
                }
            }

            return true;
        });
    }

    private findSimilarDomains(domainNode: Coverage): void {
        if (!domainNode.isDomainGroup || !domainNode.packageName) {
            this.similarClasses = [];
            return;
        }

        // Find other domain groups with similar coverage
        this.similarClasses = this.filteredData.filter(item =>
            item.isDomainGroup &&
            item.packageName !== domainNode.packageName &&
            Math.abs(item.coverage - domainNode.coverage) < 15
        ).slice(0, 5);
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
            !item.isDomainGroup && // Exclude domain groups
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

    // Handler for node selection
    onNodeSelected(node: Coverage): void {
        // Special handling for domain group nodes
        if (node.isDomainGroup && node.children) {
            // Show domain summary instead of individual class
            this.selectedNode = {
                ...node,
                isNamespace: true // Treat as namespace for details view
            };
            this.selectedClass = null;

            // Find similar domains (with similar coverage)
            this.findSimilarDomains(node);
            return;
        }

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


    // Toggle exclusions panel
    onToggleExclusionsPanel(): void {
        this.showExclusionsPanel = !this.showExclusionsPanel;
    }

    // Handle exclusion patterns change
    onExclusionPatternsChange(patterns: ExclusionPattern[]): void {
        this.exclusionPatterns = patterns;
        this.saveExclusionPatterns();
    }

    // Apply exclusion patterns
    onApplyExclusions(patterns: ExclusionPattern[]): void {
        this.exclusionPatterns = patterns;
        this.saveExclusionPatterns();

        // Update just the filters without re-filtering all the data
        if (this.treemapVisualization) {
            const filter: TreemapFilter = {
                // Include any other active filters
                coverageThreshold: this.minCoverage > 0 ? this.minCoverage : undefined,
                minValidLines: this.minLines > 0 ? this.minLines : undefined,
                excludeEmptyPackages: true,
                excludeGeneratedCode: true,
                exclusionPatterns: patterns.filter(p => p.enabled),
                searchTerm: this.searchTerm || undefined,
                selectedPackage: this.selectedPackage || undefined
            };

            this.filters = filter; // Set the filter property for reference
            this.treemapVisualization.filters = filter;
            this.treemapVisualization.updateFilters(filter);
        } else {
            // Fall back to the full filter application if visualization isn't available
            this.applyFilters();
        }

        // Update hasActiveFilters flag
        this.hasActiveFilters = this.minCoverage > 0 ||
            !!this.selectedPackage ||
            !!this.searchTerm ||
            this.groupSmallNodes ||
            this.minLines > 0 ||
            this.sortBy !== 'size' ||
            this.exclusionPatterns.some(p => p.enabled);
    }

    // Toggle domain grouping
    onToggleDomainGrouping(enabled: boolean): void {
        this.enableDomainGrouping = enabled;
        this.applyFilters();
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
        if (this.treemapVisualization) {
            this.treemapVisualization.updateLabels(value);
        }
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
        this.sortBy = value as 'size' | 'coverage' | 'name';
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

        if (node.isDomainGroup) {
            this.findSimilarDomains(node);
        } else {
            this.findClassDetails(node);
        }
    }

    // Reset zoom to show the entire treemap
    resetZoom(): void {
        if (this.treemapVisualization) {
            this.treemapVisualization.resetZoom();
        }
    }

    // Toggle labels visibility
    toggleLabels(): void {
        this.showLabels = !this.showLabels;
        this.onShowLabelsChange(this.showLabels);
    }

    // Export treemap as SVG
    exportSvg(): void {
        if (!this.treemapVisualization) return;

        try {
            // Get the SVG element
            const svgElement = this.treemapVisualization.getSvgElement();
            if (!svgElement) {
                console.error('No SVG element found');
                return;
            }

            // Create a clone to avoid modifying the original
            const svgClone = svgElement.cloneNode(true) as SVGElement;

            // Set width and height explicitly
            svgClone.setAttribute('width', '1200');
            svgClone.setAttribute('height', '800');

            // Add CSS styles inline
            const styleElement = document.createElement('style');
            styleElement.textContent = this.getCssStyles();
            svgClone.insertBefore(styleElement, svgClone.firstChild);

            // Convert to string
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgClone);

            // Create a blob and download link
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = 'coverage-treemap.svg';
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting SVG:', error);
        }
    }

    // Get CSS styles for SVG export
    private getCssStyles(): string {
        return `
            .node rect {
                stroke-width: 1px;
            }
            .node.depth-1 rect {
                stroke-width: 2px;
            }
            .node.domain-group rect {
                stroke-width: 2px;
                stroke-dasharray: 2, 2;
            }
            .node-label {
                font-family: Arial, sans-serif;
                text-shadow: 0 1px 2px rgba(0,0,0,0.3);
            }
            .dark-theme .node-label {
                fill: #ffffff;
            }
            .aggregation-indicator circle {
                fill: rgba(0,0,0,0.4);
                stroke: #ffffff;
            }
            .aggregation-indicator text {
                fill: #ffffff;
                font-weight: bold;
                text-anchor: middle;
            }
        `;
    }

    /**
 * Find and highlight a node by name
 */
    public findAndHighlightNode(nodeName: string): void {
        if (this.treemapVisualization) {
            this.treemapVisualization.highlightNode(nodeName);
        }
    }

    /**
     * Handle changes like screen rotation or tab activation
     */
    public handleVisibilityChange(): void {
        if (this.treemapVisualization) {
            // Small delay to ensure DOM has updated
            setTimeout(() => {
                this.treemapVisualization.refreshLayout();
            }, 100);
        }
    }
}