import { Component, OnInit, OnDestroy, Input, ViewChild, NgZone } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { trigger, style, transition, animate } from '@angular/animations';
import { Subscription } from "rxjs";
import { ClassInfo, Coverage, CoverageData, TreeNode } from "../../../../models/coverage.model";
import { BuildHierarchyOptions, CoverageDataService } from "../../../../services/coverage-data.service";
import { CoverageStoreService } from "../../../../services/coverage-store.service";
import { TreemapLayoutService } from "../../../../services/utils/treemap-layout.service";
import { TreemapControlsComponent } from "../treemap-controls/treemap-controls.component";
import { TreemapDetailsComponent } from "../treemap-details/treemap-details.component";
import { ThemeService } from "../../../../services/utils/theme.service";
import { TreemapVisualizationComponent } from "../treemap-visualization/treemap-visualization.component";
import { TreemapExclusionsComponent } from "../treemap-exclusions/treemap-exclusions.component";
import { CoverageRange, ExclusionPattern, TreemapFilter } from "../../../../models/treemap-config.model";

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

    // --- Filter states ---
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
    showExclusionsPanel = false;
    exclusionPatterns: ExclusionPattern[] = [];

    // --- Data ---
    hierarchyRoot: TreeNode | null = null;
    currentCoverageData: CoverageData | null = null;
    packageList: string[] = [];
    domainList: string[] = [];
    coverageRanges: CoverageRange[] = [];

    // --- Selection ---
    selectedNode: any | null = null;
    selectedClass: ClassInfo | null = null;
    similarClasses: any[] = [];

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
        private themeService: ThemeService,
        private zone: NgZone
    ) { }

    get hasData(): boolean {
        // Check if the hierarchyRoot exists and has children
        return !!this.hierarchyRoot?.children?.length;
    }

    ngOnInit(): void {
        this.subscriptions.add(
            this.themeService.darkTheme$.subscribe(isDark => {
                this.isDarkTheme = isDark;
                this.updateTreemapWithTheme(); // This now updates ranges
            })
        );

        // Initialize coverage ranges based on theme
        this.updateTreemapWithTheme();

        this.loadSavedExclusionPatterns();
        this.loadCoverageData(); // Load and build hierarchy
    }

    ngOnDestroy(): void {
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
        // Update coverage ranges based on theme and color mode
        this.coverageRanges = this.colorMode === 'colorblind'
            ? this.treemapLayoutService.getColorblindCoverageRanges()
            : this.treemapLayoutService.getDefaultCoverageRanges(this.isDarkTheme);
        // Note: If visualization component exists, might need to trigger update
        if (this.treemapVisualization) {
            this.treemapVisualization.updateCoverageRanges(this.coverageRanges);
        }
    }

    private loadCoverageData(): void {
        this.isLoading = true;
        this.subscriptions.add(
            this.coverageStoreService.getCoverageData().subscribe({
                next: (coverageData) => {
                    this.currentCoverageData = coverageData; // Store raw data
                    if (coverageData) {
                        const hierarchyOptions: BuildHierarchyOptions = {
                            groupSmallNodes: this.groupSmallNodes, // Use component state
                            smallNodeThreshold: 10 // Or make this configurable
                        };
                        // Build the hierarchy using the service
                        this.hierarchyRoot = this.coverageDataService.buildHierarchy(coverageData, hierarchyOptions);

                        // Extract package list for filter dropdown (can still do this from raw data)
                        this.extractDomainAndPackageLists(coverageData);

                        // Initial filter application (updates filter object, visualization reacts)
                        this.applyFilters();
                    } else {
                        this.hierarchyRoot = null; // Clear hierarchy
                        this.packageList = [];
                        this.domainList = [];
                    }
                    this.isLoading = false;
                },
                error: (err) => {
                    console.error("Error loading coverage data:", err);
                    this.isLoading = false;
                    this.hierarchyRoot = null;
                }
            })
        );
    }

    private extractDomainAndPackageLists(coverageData: CoverageData): void {
        const uniquePackages = new Set<string>();
        const uniqueDomains = new Set<string>();

        coverageData.packages.forEach(item => {
            if (item.name) {
                uniquePackages.add(item.name);
                const parts = item.name.split('.');
                if (parts.length >= 2) {
                    uniqueDomains.add(`${parts[0]}.${parts[1]}`);
                }
            }
        });
        this.packageList = Array.from(uniquePackages).sort();
        this.domainList = Array.from(uniqueDomains).sort();
    }

    private applyFilters(): void {
        this.isLoading = true; // Show loading while filters potentially update viz

        // Update the filters object based on component state
        this.filters = {
            coverageThreshold: this.minCoverage > 0 ? this.minCoverage : undefined,
            minValidLines: this.minLines > 0 ? this.minLines : undefined,
            excludeEmptyPackages: true, // Default behavior
            excludeGeneratedCode: true, // Default behavior
            exclusionPatterns: this.exclusionPatterns.filter(p => p.enabled),
            searchTerm: this.searchTerm || undefined,
            selectedPackage: this.selectedPackage || undefined
        };

        // Update hasActiveFilters flag (logic remains similar)
        this.hasActiveFilters = this.minCoverage > 0 ||
            !!this.selectedPackage ||
            !!this.searchTerm ||
            this.groupSmallNodes || // Keep UI state flag
            this.minLines > 0 ||
            this.sortBy !== 'size' || // Keep UI state flag
            this.exclusionPatterns.some(p => p.enabled);

        // Reset selection when filters change
        this.selectedNode = null;
        this.selectedClass = null;
        this.similarClasses = [];

        // Give visualization a moment to potentially update based on @Input changes
        setTimeout(() => { this.isLoading = false; }, 50);
    }

    private findClassDetails(selectedTreeNode: any): void {
        // Find class details from the RAW data using properties from the TreeNode
        if (!this.currentCoverageData || !selectedTreeNode?.packageName || !selectedTreeNode?.name) {
            this.selectedClass = null;
            return;
        }
        const nodeName = selectedTreeNode.name;
        const nodePackage = selectedTreeNode.packageName;

        for (const pkg of this.currentCoverageData.packages) {
            if (pkg.name === nodePackage) {
                const foundClass = pkg.classes.find(cls => cls.name === nodeName);
                if (foundClass) {
                    this.selectedClass = foundClass;
                    this.findSimilarClasses(foundClass, nodePackage); // Find similar based on ClassInfo
                    return;
                }
            }
        }
        this.selectedClass = null;
        this.similarClasses = [];
    }

    private findSimilarClasses(selectedClsInfo: ClassInfo, packageName: string): void {
        // Find similar classes based on the raw ClassInfo data
        if (!this.currentCoverageData) {
            this.similarClasses = [];
            return;
        }
        const targetPackage = this.currentCoverageData.packages.find(p => p.name === packageName);
        if (!targetPackage) {
            this.similarClasses = [];
            return;
        }

        this.similarClasses = targetPackage.classes
            .filter(cls => cls.name !== selectedClsInfo.name && Math.abs(cls.lineRate - selectedClsInfo.lineRate) < 15)
            .slice(0, 5)
            // Map back to a structure the details component expects if needed
            .map(cls => ({
                className: cls.name,
                packageName: packageName,
                coverage: cls.lineRate,
                linesValid: cls.lines?.length || 0,
                // Add other needed props...
            }));
    }

    // --- Event Handlers ---

    // Node selection handler - receives data emitted by visualization
    onNodeSelected(nodeData: any): void {
        // Run the state updates within Angular's zone
        this.zone.run(() => {
            this.selectedNode = nodeData;
            this.selectedClass = null; // Reset class details initially

            if (nodeData && !nodeData.isNamespace) {
                this.findClassDetails(nodeData);
            } else {
                this.similarClasses = [];
            }
            console.log('Node selected (inside zone):', this.selectedNode?.name); // Add log to confirm
        });
    }

    // Toggle exclusions panel
    onToggleExclusionsPanel(): void {
        this.showExclusionsPanel = !this.showExclusionsPanel;
    }

    // Handle exclusion patterns change (only updates state and saves)
    onExclusionPatternsChange(patterns: ExclusionPattern[]): void {
        this.exclusionPatterns = patterns;
        this.saveExclusionPatterns();
        // Optionally re-apply filters immediately if needed, or let user click apply
        // this.applyFilters();
    }

    // Apply exclusion patterns (updates filter object)
    onApplyExclusions(patterns: ExclusionPattern[]): void {
        this.exclusionPatterns = patterns;
        this.saveExclusionPatterns();
        this.applyFilters(); // Re-apply filters to update the filter object
        this.showExclusionsPanel = false; // Close panel after applying
    }

    // --- Control change handlers ---
    // These now just update state and call applyFilters()
    onMinCoverageChange(value: number): void { this.minCoverage = value; this.applyFilters(); }
    onSelectedPackageChange(value: string): void { this.selectedPackage = value; this.applyFilters(); }
    onSearchTermChange(value: string): void { this.searchTerm = value; this.applyFilters(); }
    onMinLinesChange(value: number): void { this.minLines = value; this.applyFilters(); }
    onSortByChange(value: string): void { this.sortBy = value as 'size' | 'coverage' | 'name'; this.applyFilters(); }

    // Grouping/Labels/Color affect visualization directly, update state and let viz handle it
    onGroupSmallNodesChange(value: boolean): void {
        this.groupSmallNodes = value;
        this.loadCoverageData();
        // The visualization component should react to this @Input change
    }
    onShowLabelsChange(value: boolean): void {
        this.showLabels = value;
        // The visualization component should react to this @Input change
    }
    onColorModeChange(value: string): void {
        this.colorMode = value as 'default' | 'colorblind';
        this.updateTreemapWithTheme(); // Update ranges and potentially viz
        // The visualization component should react to this @Input change
    }
    onToggleDomainGrouping(enabled: boolean): void {
        this.enableDomainGrouping = enabled;
        // The visualization component should react to this @Input change
    }

    onClearAllFilters(): void {
        // Reset filter states
        this.minCoverage = 0;
        this.selectedPackage = '';
        this.groupSmallNodes = false; // Reset UI toggle state
        this.searchTerm = '';
        this.minLines = 0;
        this.sortBy = 'size'; // Reset sort state
        // Keep exclusion patterns unless explicitly cleared
        this.applyFilters(); // Apply the reset filter state
    }

    onToggleFilters(expanded: boolean): void { this.showFilters = expanded; }
    closeDetails(): void { this.selectedNode = null; this.selectedClass = null; this.similarClasses = []; }


    onSelectSimilarClass(node: any): void {
        // Ensure this also runs in zone if it directly updates state
        // that affects the template immediately
        this.zone.run(() => {
            this.onNodeSelected(node); // Reuse selection logic which is now zoned
        });
    }

    // --- Methods interacting directly with visualization component ---
    resetZoom(): void { if (this.treemapVisualization) { this.treemapVisualization.resetZoom(); } }
    exportSvg(): void { if (this.treemapVisualization) { this.treemapVisualization.exportSvg(); } }
    findAndHighlightNode(nodeName: string): void { if (this.treemapVisualization) { this.treemapVisualization.findAndHighlightNode(nodeName); } }
    handleVisibilityChange(): void { if (this.treemapVisualization) { this.treemapVisualization.handleVisibilityChange(); } }
}