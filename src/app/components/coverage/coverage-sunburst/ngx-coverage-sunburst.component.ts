import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, ChangeDetectorRef, NgZone, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { CoverageStoreService } from '../../../common/services/coverage-store.service';
import { NotificationService } from '../../../common/utils/notification.utility';
import { ThemeService } from '../../../common/utils/theme.utility';
import { FileUploaderComponent } from '../../file-uploader/file-uploader.component';
import { CoverageData } from '../../../common/models/coverage.model';


interface Breadcrumb {
    name: string;
    node: any;
}

/**
 * Coverage Sunburst Component
 * Visualizes code coverage using different chart types
 */
@Component({
    selector: 'app-ngx-coverage-sunburst',
    standalone: true,
    imports: [CommonModule, FormsModule, NgxChartsModule, FileUploaderComponent],
    templateUrl: './ngx-coverage-sunburst.component.html',
    styleUrls: ['./ngx-coverage-sunburst.component.scss'],
    animations: [
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
export class NgxCoverageSunburstComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

    // Chart data and configuration
    originalData: any = null;
    chartData: any[] = [];
    hierarchyData: any[] = [];
    colorScheme: any = {
        domain: [
            '#00cc78', // success (excellent)
            '#7c49e3', // primary-light (good)
            '#ffb400', // warning (moderate)
            '#e53e3e'  // error (poor)
        ]
    };

    // Chart dimensions
    chartDimensions: [number, number] = [700, 400];

    // Debug mode
    debugMode = false;

    // Chart type options
    chartType: 'advanced-pie' | 'pie' | 'bubble' | 'bar' | 'heatmap' = 'advanced-pie';

    // Add properties for new chart types
    bubbleChartData: any[] = [];
    heatmapData: any[] = [];
    barChartData: any[] = [];
    barColors: any[] = [];
    polarData: any[] = [];

    // Filters
    showFilters = false;
    minCoverage = 0;
    packageFilter = '';
    sizeThreshold = 0;
    showExcellent = true;
    showGood = true;
    showModerate = true;
    showPoor = true;

    // Sort options
    sortBy: 'coverage' | 'size' | 'name' = 'coverage';

    // Child nodes
    childNodes: any[] = [];
    filteredChildNodes: any[] = [];
    childFilter = '';
    childSortBy = 'coverage';
    childSortDir: 'asc' | 'desc' = 'desc';

    // Legend state
    showLegend = true;

    // State
    currentNode: any = null;
    breadcrumbs: Breadcrumb[] = [];
    isLoading = false;
    isDarkTheme = false;
    isFullScreen = false;

    // Tooltip state
    showTooltip = false;
    activeNode: any = null;
    tooltipTop = 0;
    tooltipLeft = 0;

    // Cleanup
    private destroy$ = new Subject<void>();
    private themeSubscription?: Subscription;
    // Add a private property
    private tooltipUpdateTimeout: any = null;

    constructor(
        private coverageStoreService: CoverageStoreService,
        private themeService: ThemeService,
        private notificationService: NotificationService,
        private router: Router,
        private zone: NgZone,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.initThemeListener();
        this.subscribeToStoreData();
    }

    ngAfterViewInit() {
        setTimeout(() => this.updateChartDimensions(), 0);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();

        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }

        // Clean up tooltip timeout
        if (this.tooltipUpdateTimeout) {
            clearTimeout(this.tooltipUpdateTimeout);
        }
    }

    /**
     * Initialize theme listener
     */
    private initThemeListener(): void {
        this.themeSubscription = this.themeService.darkTheme$
            .pipe(takeUntil(this.destroy$))
            .subscribe(isDark => {
                this.isDarkTheme = isDark;
                this.updateColorScheme();
                this.cdr.detectChanges();
            });
    }

    /**
     * Subscribe to coverage data from the store
     */
    private subscribeToStoreData(): void {
        console.log('Subscribing to coverage data...');
        this.coverageStoreService.getCoverageData()
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data) => {
                    if (data) {
                        console.log('Received coverage data:', data);
                        this.originalData = data;
                        this.initializeView();
                    }
                    this.isLoading = false;
                },
                error: (error) => {
                    console.error('Error loading coverage data:', error);
                    this.notificationService.showError('Data Load Error', 'Failed to load coverage data');
                    this.isLoading = false;
                }
            });
    }

    /**
     * Handle file upload complete event
     */
    onUploadComplete(): void {
        // The coverage store should already have the data
        this.isLoading = true;
    }

    /**
     * Update color scheme based on theme
     */
    private updateColorScheme(): void {
        this.colorScheme = {
            domain: this.isDarkTheme
                ? ['#00cc78', '#7c49e3', '#ffb400', '#e53e3e'] // dark theme colors
                : ['#00cc78', '#5b2ac3', '#ffb400', '#e53e3e']  // light theme colors
        };
    }

    /**
     * Update chart dimensions based on container size
     */
    updateChartDimensions() {
        if (!this.chartContainer) return;

        const width = this.chartContainer.nativeElement.clientWidth || 700;
        const height = Math.max(width * 0.6, 400);
        this.chartDimensions = [width, height];
        this.cdr.detectChanges();
    }

    /**
     * Initialize view with root level data
     */
    private initializeView(): void {
        if (!this.originalData) return;

        // Start with root node in breadcrumbs
        this.breadcrumbs = [{
            name: 'All Code',
            node: {
                name: 'root',
                isPackage: true,
                coverage: this.originalData.summary?.lineCoverage || 0,
                size: this.originalData.summary?.linesValid || 0,
                covered: this.originalData.summary?.linesCovered || 0,
            }
        }];

        // Generate chart data from root
        this.generateChartData(this.originalData);

        // Initialize current node
        this.currentNode = this.breadcrumbs[0].node;
    }

    /**
     * Generate chart data based on current level
     */
    private generateChartData(data: CoverageData): void {
        console.log('Generating chart data from:', data);

        if (!data) return;

        // Determine current level data
        const currentLevel = this.breadcrumbs[this.breadcrumbs.length - 1];

        // Build chart data based on level
        if (currentLevel.name === 'All Code') {
            this.buildPackagesData(data.packages);
        } else {
            const node = currentLevel.node;

            if (node.extra?.isPackage) {
                // Package level - show classes
                const packageData = this.findPackageByName(data.packages, node.name);
                if (packageData) {
                    this.buildClassesData(packageData.classes || []);
                }
            } else {
                // Class level - show methods if available
                const classData = this.findClass(data, node.name);
                if (classData) {
                    this.buildMethodsData(classData.methods || []);
                }
            }
        }

        // Apply filters
        this.applyFilters();
    }

    /**
     * Build data for packages level
     */
    buildPackagesData(packages: any[]): void {
        if (!packages || packages.length === 0) {
            this.chartData = [];
            this.childNodes = [];
            return;
        }

        const transformedData = packages.map(pkg => ({
            name: pkg.name || 'Unknown',
            value: pkg.linesValid || 0,
            size: pkg.linesValid || 0,
            coverage: pkg.lineCoverage || 0,
            covered: pkg.linesCovered || 0,
            uncovered: (pkg.linesValid || 0) - (pkg.linesCovered || 0),
            isPackage: true,
            extra: {
                isPackage: true,
                children: pkg.classes || [],
                hasChildren: (pkg.classes && pkg.classes.length > 0) || false
            }
        }));

        console.log("Transformed package data:", transformedData);

        this.chartData = transformedData;
        this.childNodes = packages.map(pkg => ({
            name: pkg.name,
            size: pkg.linesValid,
            coverage: pkg.lineCoverage,
            isPackage: true,
            classes: pkg.classes
        }));

        this.filterChildNodes();
    }



    /**
     * Build data for methods level
     */
    private buildMethodsData(methods: any[]): void {
        if (!methods || methods.length === 0) {
            this.chartData = [];
            this.childNodes = [];
            return;
        }

        const transformedData = methods.map(method => ({
            name: method.name,
            value: method.linesValid,
            size: method.linesValid,
            coverage: method.lineCoverage,
            covered: method.linesCovered,
            uncovered: method.linesValid - method.linesCovered,
            isMethod: true,
            extra: {
                isMethod: true,
                startLine: method.startLine,
                endLine: method.endLine
            }
        }));

        this.chartData = transformedData;
        this.childNodes = methods.map(method => ({
            name: method.name,
            size: method.linesValid,
            coverage: method.lineCoverage,
            isMethod: true,
            startLine: method.startLine,
            endLine: method.endLine
        }));

        this.filterChildNodes();
    }

    /**
     * Find package by name in the data
     */
    private findPackageByName(packages: any[], name: string): any {
        return packages.find(pkg => pkg.name === name);
    }

    /**
     * Find class by name in the data
     */
    private findClass(data: CoverageData, className: string): any {
        for (const pkg of data.packages || []) {
            for (const cls of pkg.classes || []) {
                if (this.getShortClassName(cls.name) === className) {
                    return cls;
                }
            }
        }
        return null;
    }

    /**
     * Get short class name from fully qualified name
     */
    private getShortClassName(fullName: string): string {
        if (!fullName) return '';
        const parts = fullName.split('.');
        return parts[parts.length - 1];
    }

    /**
     * Reset all filters to default values
     */
    resetFilters(): void {
        this.minCoverage = 0;
        this.packageFilter = '';
        this.sizeThreshold = 0;
        this.showExcellent = true;
        this.showGood = true;
        this.showModerate = true;
        this.showPoor = true;
        this.applyFilters();
    }

    /**
     * Apply filters to the chart data
     */
    applyFilters(): void {
        if (!this.originalData) return;

        // Get current node from breadcrumbs
        const currentLevel = this.breadcrumbs[this.breadcrumbs.length - 1];

        // Get the appropriate data source based on current level
        let dataSource: any[] = [];
        if (currentLevel.name === 'All Code') {
            dataSource = this.originalData.packages || [];
        } else {
            const node = currentLevel.node;
            if (node.extra?.isPackage) {
                // Find package and get classes
                const pkg = this.findPackageByName(this.originalData.packages, node.name);
                dataSource = pkg?.classes || [];
            } else {
                // Find class and get methods
                const cls = this.findClass(this.originalData, node.name);
                dataSource = cls?.methods || [];
            }
        }

        // Apply filters to data source
        let filtered = [...dataSource];

        // Apply package/name filter
        if (this.packageFilter) {
            const searchTerm = this.packageFilter.toLowerCase();
            filtered = filtered.filter(item =>
                (item.name || '').toLowerCase().includes(searchTerm));
        }

        // Apply size threshold
        if (this.sizeThreshold > 0) {
            filtered = filtered.filter(item => (item.linesValid || 0) >= this.sizeThreshold);
        }

        // Apply coverage level filters
        const coverageFilters: any = [];
        if (this.showExcellent) coverageFilters.push('excellent');
        if (this.showGood) coverageFilters.push('good');
        if (this.showModerate) coverageFilters.push('moderate');
        if (this.showPoor) coverageFilters.push('poor');

        if (coverageFilters.length < 4) { // Not all selected
            filtered = filtered.filter(item => {
                const coverageClass = this.getCoverageClass(item.lineCoverage);
                return coverageFilters.includes(coverageClass);
            });
        }

        // Apply minimum coverage filter
        if (this.minCoverage > 0) {
            filtered = filtered.filter(item => (item.lineCoverage || 0) >= this.minCoverage);
        }

        // Transform data for current level
        if (currentLevel.name === 'All Code') {
            this.buildPackagesData(filtered);
        } else if (currentLevel.node.extra?.isPackage) {
            this.buildClassesData(filtered);
        } else {
            this.buildMethodsData(filtered);
        }
    }

    /**
     * Update hierarchy data for tree map
     */
    updateHierarchyData(): void {
        if (!this.chartData || this.chartData.length === 0) {
            this.hierarchyData = [];
            return;
        }

        // Create root node
        const root = {
            name: this.breadcrumbs[this.breadcrumbs.length - 1].name,
            children: this.chartData.map(item => ({
                name: item.name,
                value: item.size,
                extra: {
                    coverage: item.coverage,
                    isPackage: item.isPackage,
                    isMethod: item.isMethod,
                    hasChildren: item.extra?.hasChildren || false
                }
            }))
        };

        this.hierarchyData = [root];
    }

    /**
     * Sort chart data based on current sort preference
     */
    sortData(): void {
        if (!this.chartData || this.chartData.length === 0) return;

        this.chartData.sort((a, b) => {
            if (this.sortBy === 'name') {
                return a.name.localeCompare(b.name);
            } else if (this.sortBy === 'size') {
                return b.value - a.value;
            } else {
                // Default sort by coverage (descending)
                return b.coverage - a.coverage;
            }
        });

        // Sort child nodes the same way
        this.sortChildNodes(this.sortBy as any);
    }

    /**
     * Filter child nodes based on search term
     */
    filterChildNodes(): void {
        if (!this.childNodes) {
            this.filteredChildNodes = [];
            return;
        }

        if (!this.childFilter) {
            this.filteredChildNodes = [...this.childNodes];
        } else {
            const searchTerm = this.childFilter.toLowerCase();
            this.filteredChildNodes = this.childNodes.filter(node =>
                (node.name || '').toLowerCase().includes(searchTerm));
        }

        this.sortChildNodes(this.childSortBy);
    }

    /**
     * Sort child nodes by specified field
     */
    sortChildNodes(field: string): void {
        if (!this.filteredChildNodes || this.filteredChildNodes.length === 0) return;

        if (this.childSortBy === field) {
            // Toggle direction if same field
            this.childSortDir = this.childSortDir === 'asc' ? 'desc' : 'asc';
        } else {
            this.childSortBy = field;
            // Default sort direction based on field
            this.childSortDir = field === 'name' ? 'asc' : 'desc';
        }

        this.filteredChildNodes.sort((a, b) => {
            let result = 0;

            if (field === 'name') {
                result = a.name.localeCompare(b.name);
            } else {
                result = a[field] - b[field];
            }

            return this.childSortDir === 'asc' ? result : -result;
        });
    }

    /**
     * Toggle filters panel visibility
     */
    toggleFilters(): void {
        this.showFilters = !this.showFilters;
    }

    /**
     * Handle chart node selection
     */
    onSelect(event: any): void {
        if (!event || !event.name) return;

        const selectedNode = this.chartData.find(n => n.name === event.name);
        if (!selectedNode) return;

        // If node has children, drill down
        if (selectedNode.extra?.hasChildren ||
            (selectedNode.extra?.methods && selectedNode.extra.methods.length > 0)) {
            this.drillDown(selectedNode);
        } else {
            // Otherwise show details in a notification
            this.notificationService.showInfo(
                selectedNode.name,
                `Coverage: ${selectedNode.coverage.toFixed(1)}%, Lines: ${selectedNode.size}`
            );
        }
    }

    /**
     * Handle chart selection (proxy for onSelect)
     */
    onChartSelect(event: any): void {
        this.onSelect(event);
    }

    /**
     * Handle node activation for tooltip
     */
    onActivate(event: any): void {
        if (!event || !event.value) return;

        // Different data format based on chart type
        const node = event.value.name ? event.value : event;

        // Set tooltip data and active node
        this.activeNode = {
            name: node.name,
            isPackage: node.extra?.isPackage || false,
            isMethod: node.extra?.isMethod || false,
            coverage: node.coverage || node.extra?.coverage,
            size: node.value || node.size,
            covered: Math.round((node.value || node.size) * ((node.coverage || node.extra?.coverage) / 100)),
            hasChildren: node.extra?.hasChildren || false
        };

        // Calculate tooltip position
        if (event.event) {
            const rect = this.chartContainer.nativeElement.getBoundingClientRect();
            this.tooltipLeft = event.event.clientX - rect.left + 10;
            this.tooltipTop = event.event.clientY - rect.top + 10;

            // Ensure tooltip stays within view
            const maxX = rect.width - 280;
            if (this.tooltipLeft > maxX) {
                this.tooltipLeft = maxX;
            }
        }

        this.showTooltip = true;
    }

    /**
     * Handle node deactivation to hide tooltip
     */
    onDeactivate(): void {
        this.zone.run(() => {
            this.showTooltip = false;
        });
    }

    /**
     * Drill down to a child node
     */
    drillDown(node: any): void {
        this.breadcrumbs.push({
            name: node.name,
            node: {
                name: node.name,
                isPackage: node.isPackage,
                coverage: node.coverage,
                size: node.size,
                covered: Math.round(node.size * (node.coverage / 100)),
                extra: {
                    isPackage: node.isPackage,
                    isMethod: node.isMethod,
                    filename: node.filename,
                    methods: node.methods,
                    hasChildren: (node.methods && node.methods.length > 0) || (node.classes && node.classes.length > 0)
                }
            }
        });

        // Update currentNode
        this.currentNode = this.breadcrumbs[this.breadcrumbs.length - 1].node;

        // Reset filters for new level
        this.childFilter = '';

        // Generate chart data for new level
        this.generateChartData(this.originalData);
    }

    /**
     * Navigate to a breadcrumb level
     */
    navigateToBreadcrumb(index: number): void {
        if (index >= this.breadcrumbs.length - 1) return;

        // Truncate breadcrumbs to selected index
        this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);

        // Update currentNode
        this.currentNode = this.breadcrumbs[index].node;

        // Reset filter
        this.childFilter = '';

        // Regenerate chart data
        if (this.originalData) {
            this.generateChartData(this.originalData);
        }
    }

    /**
     * Reset view to root level
     */
    resetView(): void {
        if (this.breadcrumbs.length <= 1) return;

        // Reset to root breadcrumb only
        this.breadcrumbs = this.breadcrumbs.slice(0, 1);
        this.currentNode = this.breadcrumbs[0].node;

        // Reset filters
        this.childFilter = '';

        // Regenerate chart data
        if (this.originalData) {
            this.generateChartData(this.originalData);
        }
    }

    /**
     * Get coverage class based on percentage
     */
    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'moderate';
        return 'poor';
    }

    /**
     * Set the chart type and update the view
     */
    setChartType(type: 'advanced-pie' | 'pie' | 'bubble' | 'bar' | 'heatmap'): void {
        this.chartType = type;

        // Update data for the specific chart type
        switch (type) {
            case 'bubble':
                this.updateBubbleChartData();
                break;
            case 'bar':
                this.updateBarChartData();
                break;
            case 'heatmap':
                this.updateHeatMapData();
                break;
        }
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullScreen(): void {
        const container = this.chartContainer.nativeElement;

        if (!document.fullscreenElement) {
            container.requestFullscreen().then(() => {
                this.isFullScreen = true;
            }).catch((err: { message: any; }) => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen().then(() => {
                this.isFullScreen = false;
            });
        }
    }

    /**
     * Export chart as PNG
     */
    exportChart(): void {
        const container = this.chartContainer.nativeElement;

        if (typeof window === 'undefined') {
            console.warn('Cannot export chart: window not available');
            return;
        }

        // Notify user that export is starting
        this.notificationService.showInfo('Exporting Chart', 'Preparing chart image...');

        // Use html2canvas to take a screenshot
        import('html2canvas').then(html2canvas => {
            html2canvas.default(container, {
                backgroundColor: this.isDarkTheme ? '#121829' : '#ffffff',
                scale: 2 // Higher quality
            }).then(canvas => {
                try {
                    // Convert to image and trigger download
                    const link = document.createElement('a');
                    link.download = `coverage-chart-${new Date().toISOString().split('T')[0]}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                } catch (err) {
                    console.error('Failed to export chart:', err);
                    this.notificationService.showError('Export Failed', 'Could not generate image');
                }
            }).catch(err => {
                console.error('Canvas generation error:', err);
                this.notificationService.showError('Export Failed', 'Error generating chart image');
            });
        }).catch(error => {
            console.error('Failed to load html2canvas:', error);
            this.notificationService.showError('Export Failed', 'Could not load required libraries');
        });
    }

    /**
     * Reload data from server
     */
    reloadData(): void {
        this.isLoading = true;
        // Check if the method exists and use it, otherwise fallback to getCoverageData
        const dataObservable = this.coverageStoreService.getCoverageData();

        dataObservable.pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (data: any) => {
                    if (data) {
                        this.originalData = data;
                        // Reset view to root
                        this.resetView();
                    }
                    this.isLoading = false;
                },
                error: (error: any) => {
                    console.error('Error reloading coverage data:', error);
                    this.notificationService.showError('Data Reload Error', 'Failed to reload coverage data');
                    this.isLoading = false;
                }
            });
    }

    /**
     * Window resize handler
     */
    @HostListener('window:resize')
    onResize(): void {
        this.updateChartDimensions();
    }

    /**
     * Fullscreen change handler
     */
    @HostListener('document:fullscreenchange')
    onFullscreenChange(): void {
        this.isFullScreen = !!document.fullscreenElement;
        this.updateChartDimensions();
    }

    /**
     * Mouse move handler for tooltip positioning
     */
    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (!this.showTooltip) return;

        // Clear existing timeout to prevent rapid updates
        if (this.tooltipUpdateTimeout) {
            clearTimeout(this.tooltipUpdateTimeout);
        }

        // Debounce tooltip position updates
        this.tooltipUpdateTimeout = setTimeout(() => {
            this.zone.run(() => {
                const rect = this.chartContainer.nativeElement.getBoundingClientRect();
                this.tooltipLeft = event.clientX - rect.left + 10;
                this.tooltipTop = event.clientY - rect.top + 10;

                // Ensure tooltip stays within view
                const maxX = rect.width - 280;
                if (this.tooltipLeft > maxX) {
                    this.tooltipLeft = maxX;
                }

                this.cdr.detectChanges();
            });
        }, 20); // 20ms debounce time
    }

    /**
 * Build data for classes level
 */
    private buildClassesData(classes: any[]): void {
        if (!classes || classes.length === 0) {
            this.chartData = [];
            this.childNodes = [];
            return;
        }

        const transformedData = classes.map(cls => ({
            name: this.getShortClassName(cls.name),
            value: cls.linesValid,
            size: cls.linesValid,
            coverage: cls.lineCoverage,
            covered: cls.linesCovered,
            uncovered: cls.linesValid - cls.linesCovered,
            isPackage: false,
            extra: {
                isPackage: false,
                filename: cls.filename,
                methods: cls.methods,
                hasChildren: cls.methods && cls.methods.length > 0
            }
        }));

        this.chartData = transformedData;
        this.childNodes = classes.map(cls => ({
            name: this.getShortClassName(cls.name),
            size: cls.linesValid,
            coverage: cls.lineCoverage,
            isPackage: false,
            methods: cls.methods,
            filename: cls.filename
        }));

        this.filterChildNodes();
    }

    private updateHeatMapData(): void {
        const groups: { [key: string]: any[] } = {
            'High (90-100%)': [],
            'Good (75-90%)': [],
            'Moderate (50-75%)': [],
            'Low (0-50%)': []
        };

        this.chartData.forEach(item => {
            if (item.coverage >= 90) groups['High (90-100%)'].push(item);
            else if (item.coverage >= 75) groups['Good (75-90%)'].push(item);
            else if (item.coverage >= 50) groups['Moderate (50-75%)'].push(item);
            else groups['Low (0-50%)'].push(item);
        });

        this.heatmapData = Object.entries(groups).map(([range, items]) => {
            return {
                name: range,
                series: items.slice(0, 10).map(item => ({
                    name: item.name,
                    value: item.size,
                    extra: {
                        coverage: item.coverage,
                        covered: item.covered,
                        isPackage: item.isPackage
                    }
                }))
            };
        }).filter(group => group.series.length > 0);
    }

    private updateBarChartData(): void {
        // Sort and limit to top 15 items for readability
        const sortedData = [...this.chartData]
            .sort((a, b) => b.size - a.size)
            .slice(0, 15);

        this.barChartData = sortedData.map(item => ({
            name: item.name,
            value: item.coverage,
            extra: {
                size: item.size,
                covered: item.covered,
                isPackage: item.isPackage
            }
        }));

        // Set custom colors based on coverage levels
        this.barColors = this.barChartData.map(d => ({
            name: d.name,
            value: this.getCoverageColor(d.value)
        }));
    }

    private updateBubbleChartData(): void {
        this.bubbleChartData = [{
            name: this.breadcrumbs[this.breadcrumbs.length - 1].name,
            series: this.chartData.map(item => ({
                name: item.name,
                x: item.coverage,
                y: item.uncovered || 0,
                r: Math.sqrt(item.size || 0) * 2,
                value: item.size,
                extra: {
                    coverage: item.coverage,
                    isPackage: item.isPackage,
                    size: item.size,
                    covered: item.covered,
                    uncovered: item.uncovered || (item.size - item.covered)
                }
            }))
        }];
    }

    getCoverageColor(coverage: number): string {
        if (coverage >= 90) return '#00cc78'; // excellent
        if (coverage >= 75) return '#7c49e3'; // good
        if (coverage >= 50) return '#ffb400'; // moderate
        return '#e53e3e'; // poor
    }
}