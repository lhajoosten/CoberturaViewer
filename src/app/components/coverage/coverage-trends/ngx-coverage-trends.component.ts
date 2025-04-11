import { CommonModule, DatePipe } from "@angular/common";
import { Component, OnInit, OnDestroy, Input, ViewChild, ElementRef, HostListener, AfterViewInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { Subscription } from "rxjs";
import { HistoryEntry, ChartMetric, TimeRange, CoverageData, CoverageSnapshot } from "../../../common/models/coverage.model";
import { CoverageStoreService } from "../../../common/services/coverage-store.service";
import { ThemeService } from "../../../common/utils/theme.utility";
import { NotificationService } from "../../../common/utils/notification.utility";

interface CustomDateRange {
    from: string;
    to: string;
}

interface ImportOptions {
    replace: boolean;
}

interface ExportOptions {
    includeAll: boolean;
}

interface ChartPoint {
    x: number;
    y: number;
    date: Date;
    value: number;
    metricId: string;
}

interface SimpleLinearRegression {
    slope: number;
    intercept: number;
    r2: number;
}

@Component({
    selector: 'app-ngx-coverage-trends',
    standalone: true,
    imports: [CommonModule, FormsModule, NgxChartsModule],
    templateUrl: './ngx-coverage-trends.component.html',
    styleUrls: ['./ngx-coverage-trends.component.scss'],
    providers: [DatePipe]
})
export class NgxCoverageTrendsComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() isDarkTheme = false;
    @Input() snapshots: CoverageSnapshot[] = [];
    @ViewChild('mainChartArea') mainChartArea!: ElementRef;
    @ViewChild('velocityChartArea') velocityChartArea!: ElementRef;
    @ViewChild('distributionChartArea') distributionChartArea!: ElementRef;
    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    // History data
    history: HistoryEntry[] = [];
    filteredHistory: HistoryEntry[] = [];
    displayedHistory: HistoryEntry[] = []; // For pagination
    selectedHistoryEntry: HistoryEntry | null = null;
    hasHistory = false;
    timeRange = '30';
    isLoading = true;
    isFullscreen = false;

    // Date range picker
    showDateRangePicker = false;
    customDateRange: CustomDateRange = {
        from: '',
        to: ''
    };

    // Import/Export
    showImportExportModal = false;
    importExportMode: 'import' | 'export' = 'import';
    importFileName = '';
    importOptions: ImportOptions = {
        replace: false
    };
    exportOptions: ExportOptions = {
        includeAll: true
    };

    // Confirmation modal
    showConfirmationModal = false;
    confirmationMessage = '';
    pendingAction: (() => void) | null = null;

    // Search and filtering
    searchFilter = '';
    currentPage = 1;
    pageSize = 10;
    totalPages = 1;
    sortField: 'date' | 'lineCoverage' | 'branchCoverage' = 'date';
    sortDirection: 'asc' | 'desc' = 'desc';

    // Chart dimensions
    width = 1000;
    mainChartHeight = 300;
    secondaryChartHeight = 250;

    // Chart data
    lineChartData: any[] = [];
    velocityChartData: any[] = [];
    distributionChartData: any[] = [];
    trendLineData: { x: number, y: number }[] = [];
    trendLinePath = '';
    chartType: 'line' | 'area' = 'line';
    selectedPoint: ChartPoint | null = null;
    curveCatmullRom = 'catmullRom';

    // Chart options
    colorScheme: any = {
        domain: ['#4caf50', '#2196f3', '#ff9800', '#f44336']
    };

    velocityColorScheme: any = {
        domain: ['#4caf50', '#f44336']
    };

    distributionColorScheme: any = {
        domain: ['#4caf50', '#8BC34A', '#FFC107', '#FF9800', '#f44336']
    };

    targetReference: any[] = [];

    // Metric definitions
    metrics: ChartMetric[] = [
        { id: 'lineCoverage', label: 'Line Coverage', color: '#4caf50', enabled: true, accessor: (d: { data: { summary: { lineCoverage: any; }; }; }, _: any, __: any) => d.data.summary.lineCoverage },
        { id: 'branchCoverage', label: 'Branch Coverage', color: '#2196f3', enabled: true, accessor: (d: { data: { summary: { branchCoverage: any; }; }; }, _: any, __: any) => d.data.summary.branchCoverage },
        { id: 'methodRate', label: 'Method Coverage', color: '#ff9800', enabled: false, accessor: (d: { data: { summary: { methodRate: any; }; }; }, _: any, __: any) => d.data.summary.methodRate || 0 },
        { id: 'classRate', label: 'Class Coverage', color: '#f44336', enabled: false, accessor: (d: { data: { summary: { classRate: any; }; }; }, _: any, __: any) => d.data.summary.classRate || 0 }
    ];

    // Available time ranges
    timeRanges: TimeRange[] = [
        { value: '7', label: 'Last 7 Days', days: 7 },
        { value: '14', label: 'Last 14 Days', days: 14 },
        { value: '30', label: 'Last 30 Days', days: 30 },
        { value: '90', label: 'Last 90 Days', days: 90 },
        { value: '365', label: 'Last Year', days: 365 },
        { value: '0', label: 'All Time', days: 0 }
    ];

    // Chart state
    showTarget = true;
    targetCoverage = 80;
    showTrendLine = false;

    // Derived metrics
    coverageVelocity = 0;
    averageCoverage = 0;
    projectionsData: { weeksToTarget: number | null; targetDate: Date | null; estimatedDateString: string } = {
        weeksToTarget: null,
        targetDate: null,
        estimatedDateString: 'N/A'
    };

    // Regression data
    regressionResults: SimpleLinearRegression | null = null;

    private resizeTimeout: any;
    private subscriptions: Subscription = new Subscription();

    constructor(
        private coverageStore: CoverageStoreService,
        private themeService: ThemeService,
        private notificationService: NotificationService,
        private datePipe: DatePipe
    ) { }

    ngOnInit(): void {
        this.isLoading = true;

        // Subscribe to theme changes
        this.subscriptions.add(
            this.themeService.darkTheme$.subscribe(isDark => {
                this.isDarkTheme = isDark;
                this.updateColorSchemes();
            })
        );

        // Try to load history from localStorage
        this.loadHistoryFromLocalStorage();

        // Subscribe to current coverage data
        this.subscriptions.add(
            this.coverageStore.getCoverageData().subscribe(data => {
                if (data) {
                    // Check if we should add this to history
                    this.addCurrentToHistory(data);
                }
                this.isLoading = false;
            })
        );

        // Set initial chart options
        this.updateChartOptions();

        // Initialize custom date range
        this.initializeCustomDateRange();
    }

    ngAfterViewInit(): void {
        // Set initial size based on container
        setTimeout(() => this.updateChartDimensions(), 0);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }
    }

    @HostListener('window:resize')
    onResize(): void {
        // Debounce resize event
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            this.updateChartDimensions();
        }, 200);
    }

    /**
     * Load history data from localStorage
     */
    private loadHistoryFromLocalStorage(): void {
        const savedHistory = localStorage.getItem('coverageHistory');
        if (savedHistory) {
            try {
                // Parse the saved history data, converting date strings back to Date objects
                const parsed = JSON.parse(savedHistory);
                this.history = parsed.map((entry: any) => ({
                    ...entry,
                    date: new Date(entry.date)
                })) as HistoryEntry[];

                // Sort by date to ensure correct order
                this.history.sort((a, b) => a.date.getTime() - b.date.getTime());

                this.hasHistory = this.history.length > 0;
                this.updateFilteredHistory();
                this.calculateDerivedMetrics();
                this.prepareChartData();
                this.updatePagination();
            } catch (e) {
                console.error('Failed to parse saved history:', e);
                this.notificationService.showError(
                    'History Load Error',
                    'Failed to load saved history data. Starting with empty history.'
                );
                this.history = [];
                this.hasHistory = false;
            }
        } else {
            this.history = [];
            this.hasHistory = false;
        }

        this.isLoading = false;
    }

    /**
     * Update chart dimensions based on container size
     */
    private updateChartDimensions(): void {
        if (this.mainChartArea && this.mainChartArea.nativeElement) {
            const rect = this.mainChartArea.nativeElement.getBoundingClientRect();
            if (rect.width > 0) {
                this.width = rect.width;

                // Also update the trend line if it's visible
                if (this.showTrendLine) {
                    this.calculateTrendLine();
                }
            }
        }
    }

    /**
     * Update color schemes based on theme
     */
    private updateColorSchemes(): void {
        // Line chart colors
        this.colorScheme = {
            domain: this.metrics.map(m => m.color)
        };

        // Velocity chart colors
        this.velocityColorScheme = {
            domain: this.isDarkTheme
                ? ['#4caf50', '#f44336'] // Positive/negative for dark theme
                : ['#4caf50', '#f44336'] // Positive/negative for light theme
        };

        // Distribution chart colors
        this.distributionColorScheme = {
            domain: this.isDarkTheme
                ? ['#38a169', '#68d391', '#f6e05e', '#ed8936', '#e53e3e'] // Dark theme
                : ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336']  // Light theme
        };
    }

    /**
     * Initialize custom date range with defaults
     */
    private initializeCustomDateRange(): void {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);

        this.customDateRange = {
            from: this.formatDateForInput(thirtyDaysAgo),
            to: this.formatDateForInput(today)
        };
    }

    /**
     * Format date for input fields
     */
    private formatDateForInput(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Update chart options when target changes
     */
    updateChartOptions(): void {
        if (this.showTarget) {
            this.targetReference = [
                {
                    name: `Target: ${this.targetCoverage}%`,
                    value: this.targetCoverage
                }
            ];
        } else {
            this.targetReference = [];
        }

        // Update trend line if enabled
        if (this.showTrendLine) {
            this.calculateTrendLine();
        }
    }

    /**
     * Calculate trend line for main chart
     */
    private calculateTrendLine(): void {
        if (!this.filteredHistory || this.filteredHistory.length < 2) {
            this.trendLineData = [];
            this.trendLinePath = '';
            return;
        }

        // Get active line rate data
        const data = this.filteredHistory.map(entry => ({
            x: entry.date.getTime(),
            y: entry.data.summary.lineCoverage
        }));

        // Calculate regression
        this.regressionResults = this.calculateLinearRegression(data);

        if (!this.regressionResults) {
            this.trendLineData = [];
            this.trendLinePath = '';
            return;
        }

        // Generate points for trend line (start and end)
        const startX = data[0].x;
        const endX = data[data.length - 1].x;
        const startY = this.regressionResults.intercept + (this.regressionResults.slope * startX);
        const endY = this.regressionResults.intercept + (this.regressionResults.slope * endX);

        this.trendLineData = [
            { x: startX, y: startY },
            { x: endX, y: endY }
        ];

        // Convert to SVG path
        // We need to map the dates and values to chart coordinates
        // This is an approximation since we don't have direct access to the chart's scales
        if (this.mainChartArea && this.mainChartArea.nativeElement) {
            const chartWidth = this.width;
            const chartHeight = this.mainChartHeight;

            // Map coordinates to chart space
            const xScale = chartWidth / (endX - startX);
            const x1 = 0; // Start at left edge
            const x2 = chartWidth; // End at right edge

            // Y scale is inverted (0,0 is top-left in SVG)
            const yScale = chartHeight / 100; // Assuming 0-100% scale
            const y1 = chartHeight - (startY * yScale);
            const y2 = chartHeight - (endY * yScale);

            this.trendLinePath = `M ${x1} ${y1} L ${x2} ${y2}`;
        }
    }

    /**
     * Calculate simple linear regression
     */
    private calculateLinearRegression(data: { x: number, y: number }[]): SimpleLinearRegression | null {
        if (data.length < 2) return null;

        let sumX = 0;
        let sumY = 0;
        let sumXY = 0;
        let sumXX = 0;
        let sumYY = 0;
        const n = data.length;

        for (const point of data) {
            sumX += point.x;
            sumY += point.y;
            sumXY += point.x * point.y;
            sumXX += point.x * point.x;
            sumYY += point.y * point.y;
        }

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Calculate R-squared (coefficient of determination)
        const yMean = sumY / n;
        let totalVariation = 0;
        let explainedVariation = 0;

        for (const point of data) {
            const predictedY = intercept + slope * point.x;
            totalVariation += Math.pow(point.y - yMean, 2);
            explainedVariation += Math.pow(predictedY - yMean, 2);
        }

        const r2 = explainedVariation / totalVariation;

        return { slope, intercept, r2 };
    }

    /**
     * Format percentage values for axis labels
     */
    percentTickFormatting = (value: number) => `${value}%`;

    /**
     * Format date values for axis labels
     */
    dateTickFormatting = (value: any) => {
        const date = new Date(value);
        return this.datePipe.transform(date, 'MMM d') || '';
    };

    /**
     * Format date for tooltip
     */
    formatTooltipDate(date: Date): string {
        return this.datePipe.transform(date, 'MMM d, y') || '';
    }

    /**
     * Format date for display in table
     */
    formatDate(date: Date): string {
        return this.datePipe.transform(date, 'MMM d, y h:mm a') || '';
    }

    /**
     * Get the display period for stats
     */
    getDisplayPeriod(): string {
        if (this.timeRange === '0') {
            return 'all time';
        }
        const days = parseInt(this.timeRange, 10);
        if (days <= 7) return 'last week';
        if (days <= 14) return 'last 2 weeks';
        if (days <= 30) return 'last month';
        if (days <= 90) return 'last quarter';
        return 'last year';
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen(): void {
        this.isFullscreen = !this.isFullscreen;
        // Implement fullscreen API logic here
        const container = document.querySelector('.trends-container') as HTMLElement;
        if (container) {
            if (this.isFullscreen) {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
    }

    /**
     * Toggle date range picker visibility
     */
    toggleDateRangePicker(): void {
        this.showDateRangePicker = !this.showDateRangePicker;
    }

    /**
     * Apply custom date range filter
     */
    applyCustomDateRange(): void {
        if (!this.customDateRange.from || !this.customDateRange.to) {
            this.notificationService.showWarning(
                'Invalid Date Range',
                'Please select both start and end dates.'
            );
            return;
        }

        const fromDate = new Date(this.customDateRange.from);
        const toDate = new Date(this.customDateRange.to);
        toDate.setHours(23, 59, 59, 999); // Include the entire day

        if (fromDate > toDate) {
            this.notificationService.showWarning(
                'Invalid Date Range',
                'Start date must be before end date.'
            );
            return;
        }

        // Apply custom filter
        this.filteredHistory = this.history.filter(entry =>
            entry.date >= fromDate && entry.date <= toDate
        );

        // Update derived data
        this.calculateDerivedMetrics();
        this.prepareChartData();
        this.updatePagination();

        // Change time range to custom
        this.timeRange = 'custom';

        // Hide date picker
        this.showDateRangePicker = false;

        this.notificationService.showInfo(
            'Custom Range Applied',
            `Showing data from ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}`
        );
    }

    /**
     * Toggle chart type between line and area
     */
    toggleChartType(): void {
        this.chartType = this.chartType === 'line' ? 'area' : 'line';
    }

    /**
     * Handle chart point selection
     */
    onChartPointSelect(event: any): void {
        if (!event || !this.mainChartArea) return;

        // Extract data from the event
        const date = new Date(event.name);
        const value = event.value;
        const metricId = event.series;

        // Calculate position
        const rect = this.mainChartArea.nativeElement.getBoundingClientRect();
        // This is an approximation since we don't have direct access to the chart's coordinates
        const x = event.event.clientX - rect.left;
        const y = event.event.clientY - rect.top;

        this.selectedPoint = { x, y, date, value, metricId };

        // Find the closest history entry to this date
        const entry = this.findClosestHistoryEntry(date);
        if (entry) {
            this.selectHistoryEntry(entry);
        }
    }

    /**
     * Find history entry closest to given date
     */
    private findClosestHistoryEntry(date: Date): HistoryEntry | null {
        if (!this.filteredHistory.length) return null;

        let closestEntry = this.filteredHistory[0];
        let smallestDiff = Math.abs(date.getTime() - closestEntry.date.getTime());

        for (const entry of this.filteredHistory) {
            const diff = Math.abs(date.getTime() - entry.date.getTime());
            if (diff < smallestDiff) {
                smallestDiff = diff;
                closestEntry = entry;
            }
        }

        return closestEntry;
    }

    /**
     * Select history entry for highlighting
     */
    selectHistoryEntry(entry: HistoryEntry): void {
        this.selectedHistoryEntry = entry;
    }

    /**
     * Check if entry is currently selected
     */
    isSelectedEntry(entry: HistoryEntry): boolean {
        return this.selectedHistoryEntry === entry;
    }

    /**
     * Export chart as image
     */
    exportChartImage(chartType: 'main' | 'velocity' | 'distribution'): void {
        let chartElement: ElementRef | null = null;
        let filename = 'coverage-chart.png';

        switch (chartType) {
            case 'main':
                chartElement = this.mainChartArea;
                filename = 'coverage-trends.png';
                break;
            case 'velocity':
                chartElement = this.velocityChartArea;
                filename = 'coverage-velocity.png';
                break;
            case 'distribution':
                chartElement = this.distributionChartArea;
                filename = 'coverage-distribution.png';
                break;
        }

        if (!chartElement || !chartElement.nativeElement) {
            this.notificationService.showError('Export Failed', 'Chart element not found');
            return;
        }

        try {
            const svg = chartElement.nativeElement.querySelector('svg');
            if (!svg) {
                this.notificationService.showError('Export Failed', 'SVG element not found');
                return;
            }

            // Create canvas for export
            const canvas = document.createElement('canvas');
            const rect = svg.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            const context = canvas.getContext('2d');
            if (!context) {
                this.notificationService.showError('Export Failed', 'Could not get canvas context');
                return;
            }

            // Fill background
            context.fillStyle = this.isDarkTheme ? '#121212' : '#ffffff';
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
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(downloadUrl);

                        this.notificationService.showSuccess(
                            'Export Complete',
                            `Chart has been exported as ${filename}`
                        );
                    }
                });
            };

            img.src = url;
        } catch (error) {
            console.error('Error exporting chart:', error);
            this.notificationService.showError(
                'Export Failed',
                'An error occurred while exporting the chart'
            );
        }
    }

    /**
     * Get total class count
     */
    getTotalClassCount(): number {
        if (!this.filteredHistory.length) return 0;

        const latestEntry = this.filteredHistory[this.filteredHistory.length - 1];
        if (!latestEntry.data.packages) return 0;

        return latestEntry.data.packages.reduce((total: any, pkg: { classes: string | any[]; }) => {
            return total + (pkg.classes?.length || 0);
        }, 0);
    }

    /**
     * Load demo data for testing
     */
    loadDemoData(): void {
        // Ask for confirmation
        this.confirmationMessage = 'This will load sample data for demonstration purposes. Continue?';
        this.pendingAction = () => this.actuallyLoadDemoData();
        this.showConfirmationModal = true;
    }

    /**
     * Actually load the demo data after confirmation
     */
    private actuallyLoadDemoData(): void {
        this.isLoading = true;

        // Create demo data with specific dates
        const currentDate = new Date();
        const demoHistory: HistoryEntry[] = [];

        // Generate 90 days of data
        for (let i = 0; i < 90; i++) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - (90 - i));

            // Start with base coverage
            let lineCoverage = 65 + (Math.sin(i / 5) * 3); // Oscillating baseline

            // Add general upward trend
            lineCoverage += (i / 90) * 15;

            // Add some randomness
            lineCoverage += (Math.random() * 2) - 1;

            // Ensure within bounds
            lineCoverage = Math.max(40, Math.min(95, lineCoverage));

            // Branch rate usually trails a bit behind line rate
            const branchCoverage = lineCoverage - (5 + Math.random() * 5);

            demoHistory.push({
                date: date,
                data: {
                    summary: {
                        lineCoverage: lineCoverage,
                        branchCoverage: branchCoverage,
                        linesValid: 3000 + Math.floor(Math.random() * 200),
                        linesCovered: Math.floor((3000 + Math.floor(Math.random() * 200)) * (lineCoverage / 100)),
                        methodCoverage: lineCoverage - (Math.random() * 3),
                        classCoverage: lineCoverage + (Math.random() * 3),
                        complexity: 0,
                        timestamp: date.getTime().toString()
                    },
                    packages: []
                }
            });
        }

        // Replace existing history
        this.history = demoHistory;
        this.hasHistory = true;

        // Reset filters
        this.timeRange = '30';
        this.searchFilter = '';
        this.updateFilteredHistory();
        this.calculateDerivedMetrics();
        this.prepareChartData();
        this.updatePagination();
        this.saveHistoryToLocalStorage();

        this.isLoading = false;
        this.notificationService.showSuccess(
            'Demo Data Loaded',
            '90 days of sample coverage data has been loaded'
        );
    }

    /**
     * Properly converts timestamp to Date object based on format
     */
    private convertTimestampToDate(timestamp: string | number): Date {
        if (!timestamp) {
            return new Date(); // Default to current time if no timestamp
        }

        // Convert to number if it's a string
        const tsNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

        // Check if it's a Unix timestamp in seconds (10 digits) or milliseconds (13 digits)
        if (tsNum.toString().length <= 10) {
            // It's in seconds, multiply by 1000 to get milliseconds
            return new Date(tsNum * 1000);
        } else {
            // It's already in milliseconds
            return new Date(tsNum);
        }
    }

    /**
     * Add current coverage data to history
     */
    addCurrentToHistory(data: CoverageData): void {
        // Use the timestamp from the data if available, otherwise use current time
        const timestamp = data.summary.timestamp ?
            this.convertTimestampToDate(data.summary.timestamp) :
            new Date();

        // Check if we already have an entry with this timestamp
        const existingEntryIndex = this.history.findIndex(entry =>
            entry.date.getTime() === timestamp.getTime()
        );

        if (existingEntryIndex !== -1) {
            // Update existing entry instead of adding a new one
            this.history[existingEntryIndex].data = data;
        } else {
            // Add new entry with the correct timestamp
            this.history.push({ date: timestamp, data });
        }

        // Sort by date to ensure correct order
        this.history.sort((a, b) => a.date.getTime() - b.date.getTime());

        this.hasHistory = true;
        this.updateFilteredHistory();
        this.calculateDerivedMetrics();
        this.prepareChartData();
        this.updatePagination();
        this.saveHistoryToLocalStorage();
    }

    /**
     * Update filtered history based on selected time range
     */
    updateFilteredHistory(): void {
        if (!this.history.length) {
            this.filteredHistory = [];
            return;
        }

        let filtered: HistoryEntry[] = [...this.history];

        // Apply time range filter
        if (this.timeRange !== '0' && this.timeRange !== 'custom') { // '0' means all time
            const days = parseInt(this.timeRange, 10);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);

            filtered = filtered.filter(entry => entry.date >= cutoffDate);
        }

        // Apply search filter if any
        if (this.searchFilter.trim()) {
            const searchLower = this.searchFilter.toLowerCase();
            filtered = filtered.filter(entry => {
                // Search in date
                const dateStr = this.formatDate(entry.date).toLowerCase();
                if (dateStr.includes(searchLower)) return true;

                // Search in coverage values
                const lineCoverageStr = entry.data.summary.lineCoverage.toFixed(2);
                const branchCoverageStr = entry.data.summary.branchCoverage.toFixed(2);
                if (lineCoverageStr.includes(searchLower) || branchCoverageStr.includes(searchLower)) return true;

                return false;
            });
        }

        // Apply sorting
        filtered = this.applySorting(filtered);

        this.filteredHistory = filtered;

        // After updating filtered history, recalculate metrics and update charts
        this.calculateDerivedMetrics();
        this.prepareChartData();
        this.updatePagination();
    }

    /**
     * Apply sorting to history data
     */
    private applySorting(data: HistoryEntry[]): HistoryEntry[] {
        return [...data].sort((a, b) => {
            let comparison = 0;

            switch (this.sortField) {
                case 'date':
                    comparison = a.date.getTime() - b.date.getTime();
                    break;
                case 'lineCoverage':
                    comparison = a.data.summary.lineCoverage - b.data.summary.lineCoverage;
                    break;
                case 'branchCoverage':
                    comparison = a.data.summary.branchCoverage - b.data.summary.branchCoverage;
                    break;
                default:
                    comparison = a.date.getTime() - b.date.getTime();
            }

            return this.sortDirection === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * Sort history data by field
     */
    sortHistory(field: 'date' | 'lineCoverage' | 'branchCoverage'): void {
        if (this.sortField === field) {
            // Toggle direction if same field
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // New field, set default direction
            this.sortField = field;
            this.sortDirection = field === 'date' ? 'desc' : 'desc'; // Default newest first for dates
        }

        this.updateFilteredHistory();
    }

    /**
     * Get sort icon class based on current sort state
     */
    getSortIconClass(field: string): string {
        if (this.sortField !== field) return 'fa-sort';
        return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
    }

    /**
     * Apply history filter
     */
    applyHistoryFilter(): void {
        this.updateFilteredHistory();
    }

    /**
     * Reset history filter
     */
    resetHistoryFilter(): void {
        this.searchFilter = '';
        this.updateFilteredHistory();
    }

    /**
     * Update pagination
     */
    private updatePagination(): void {
        this.totalPages = Math.max(1, Math.ceil(this.filteredHistory.length / this.pageSize));
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        this.updateDisplayedHistory();
    }

    /**
     * Update displayed history based on pagination
     */
    private updateDisplayedHistory(): void {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.filteredHistory.length);
        this.displayedHistory = this.filteredHistory.slice(startIndex, endIndex);
    }

    /**
     * Go to specific page
     */
    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.updateDisplayedHistory();
    }

    /**
     * Update time range selection
     */
    updateTimeRange(): void {
        this.updateFilteredHistory();
    }

    /**
     * Calculate metrics like velocity and projections
     */
    private calculateDerivedMetrics(): void {
        if (this.filteredHistory.length < 2) {
            this.coverageVelocity = 0;
            this.averageCoverage = this.filteredHistory.length ?
                this.filteredHistory[0].data.summary.lineCoverage : 0;
            return;
        }

        // Calculate coverage velocity (points per week)
        const oldestEntry: HistoryEntry = this.filteredHistory[0];
        const newestEntry: HistoryEntry = this.filteredHistory[this.filteredHistory.length - 1];

        const coverageDiff = newestEntry.data.summary.lineCoverage - oldestEntry.data.summary.lineCoverage;
        const daysDiff = (newestEntry.date.getTime() - oldestEntry.date.getTime()) / (1000 * 60 * 60 * 24);
        const weeksDiff = Math.max(daysDiff / 7, 1); // Avoid division by zero

        this.coverageVelocity = coverageDiff / weeksDiff;

        // Calculate average coverage
        this.averageCoverage = this.filteredHistory.reduce(
            (sum, entry) => sum + entry.data.summary.lineCoverage, 0
        ) / this.filteredHistory.length;

        // Generate projection data
        if (this.coverageVelocity > 0) {
            const weeksToTarget = this.targetCoverage > newestEntry.data.summary.lineCoverage ?
                (this.targetCoverage - newestEntry.data.summary.lineCoverage) / this.coverageVelocity : 0;

            const targetDate = new Date(newestEntry.date);
            targetDate.setDate(targetDate.getDate() + Math.ceil(weeksToTarget * 7));

            this.projectionsData = {
                weeksToTarget: Math.ceil(weeksToTarget),
                targetDate: targetDate,
                estimatedDateString: targetDate.toLocaleDateString()
            };
        } else {
            this.projectionsData = {
                weeksToTarget: null,
                targetDate: null,
                estimatedDateString: 'N/A (no upward trend)'
            };
        }
    }

    /**
     * Update charts when target coverage changes
     */
    updateTargetCoverage(): void {
        this.calculateDerivedMetrics();
        this.updateChartOptions();
    }

    /**
     * Toggle metric visibility
     */
    toggleMetric(metricId: string): void {
        const metric = this.metrics.find(m => m.id === metricId);
        if (metric) {
            metric.enabled = !metric.enabled;
            this.prepareChartData();
        }
    }

    /**
     * Prepare data for all charts
     */
    prepareChartData(): void {
        this.prepareLineChartData();
        this.prepareVelocityChartData();
        this.prepareDistributionChartData();

        // Update trend line if enabled
        if (this.showTrendLine) {
            this.calculateTrendLine();
        }
    }

    /**
     * Prepare data for the main line chart
     */
    private prepareLineChartData(): void {
        const enabledMetrics = this.metrics.filter(m => m.enabled);

        if (!this.filteredHistory.length || !enabledMetrics.length) {
            this.lineChartData = [];
            return;
        }

        // Create series for each enabled metric
        this.lineChartData = enabledMetrics.map(metric => {
            return {
                name: metric.label,
                series: this.filteredHistory.map(entry => {
                    return {
                        name: entry.date,
                        value: metric.accessor(entry, 0, []) || 0 // Handle undefined values
                    };
                })
            };
        });
    }

    /**
     * Prepare data for the velocity chart
     */
    private prepareVelocityChartData(): void {
        if (this.filteredHistory.length < 2) {
            this.velocityChartData = [];
            return;
        }

        // Calculate weekly velocity data
        const velocityData = this.calculateWeeklyVelocity(this.filteredHistory);

        // Format data for ngx-charts bar chart
        this.velocityChartData = velocityData.map(item => {
            return {
                name: item.week,
                value: item.change,
                // Use different colors for positive/negative values
                color: item.change >= 0 ? this.velocityColorScheme.domain[0] : this.velocityColorScheme.domain[1]
            };
        });
    }

    /**
     * Calculate weekly velocity data
     */
    private calculateWeeklyVelocity(history: HistoryEntry[]): any[] {
        if (!history.length) return [];

        // Group entries by week
        const weekMap = new Map<string, HistoryEntry[]>();

        history.forEach(entry => {
            const date = entry.date;
            const year = date.getFullYear();
            const week = this.getWeekNumber(date);
            const key = `${year}-W${week.toString().padStart(2, '0')}`;

            if (!weekMap.has(key)) {
                weekMap.set(key, []);
            }

            weekMap.get(key)?.push(entry);
        });

        // Calculate average line coverage for each week
        const weeklyData: { week: string, avgCoverage: number }[] = [];

        weekMap.forEach((entries, week) => {
            const totalCoverage = entries.reduce((sum, entry) => sum + entry.data.summary.lineCoverage, 0);
            weeklyData.push({
                week,
                avgCoverage: totalCoverage / entries.length
            });
        });

        // Sort by week
        weeklyData.sort((a, b) => a.week.localeCompare(b.week));

        // Calculate week-over-week changes
        const velocityData = weeklyData.map((weekData, i) => {
            const prevWeek = i > 0 ? weeklyData[i - 1].avgCoverage : weekData.avgCoverage;
            return {
                week: weekData.week,
                avgCoverage: weekData.avgCoverage,
                change: weekData.avgCoverage - prevWeek
            };
        });

        return velocityData;
    }

    /**
     * Get ISO week number from date
     */
    private getWeekNumber(date: Date): number {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    /**
     * Prepare data for the distribution chart
     */
    private prepareDistributionChartData(): void {
        if (!this.filteredHistory.length) {
            this.distributionChartData = [];
            return;
        }

        // Get latest entry for distribution data
        const latestEntry: HistoryEntry = this.filteredHistory[this.filteredHistory.length - 1];
        if (!latestEntry || !latestEntry.data.packages) {
            this.distributionChartData = [];
            return;
        }

        // Extract classes for distribution
        const allClasses: { name: string, coverage: number }[] = [];
        latestEntry.data.packages.forEach(pkg => {
            pkg.classes.forEach(cls => {
                allClasses.push({
                    name: cls.name,
                    coverage: cls.lineCoverage
                });
            });
        });

        // Group classes by coverage range
        const excellent = allClasses.filter(c => c.coverage >= 90).length;
        const good = allClasses.filter(c => c.coverage >= 75 && c.coverage < 90).length;
        const moderate = allClasses.filter(c => c.coverage >= 50 && c.coverage < 75).length;
        const poor = allClasses.filter(c => c.coverage < 50).length;

        // Format data for horizontal bar chart
        this.distributionChartData = [
            {
                name: 'Excellent (90-100%)',
                value: excellent
            },
            {
                name: 'Good (75-90%)',
                value: good
            },
            {
                name: 'Moderate (50-75%)',
                value: moderate
            },
            {
                name: 'Poor (0-50%)',
                value: poor
            }
        ];

        // Sort by coverage category
        this.distributionChartData.reverse();
    }

    /**
     * Load a specific history entry into the current view
     */
    loadHistoryEntry(entry: HistoryEntry): void {
        this.coverageStore.setCoverageData(entry.data);
        this.notificationService.showInfo(
            'Coverage Data Loaded',
            `Loaded coverage data from ${this.formatDate(entry.date)}`
        );
    }

    /**
     * Remove a history entry
     */
    removeHistoryEntry(entry: HistoryEntry): void {
        this.confirmationMessage = 'Are you sure you want to remove this history entry?';
        this.pendingAction = () => {
            const index = this.history.indexOf(entry);
            if (index !== -1) {
                this.history.splice(index, 1);
                this.hasHistory = this.history.length > 0;
                this.updateFilteredHistory();
                this.saveHistoryToLocalStorage();
                this.notificationService.showInfo(
                    'Entry Removed',
                    'History entry has been removed'
                );
            }
        };
        this.showConfirmationModal = true;
    }

    /**
     * Clear all history data
     */
    clearAllHistory(): void {
        this.confirmationMessage = 'Are you sure you want to clear all history data? This action cannot be undone.';
        this.pendingAction = () => {
            this.history = [];
            this.hasHistory = false;
            this.filteredHistory = [];
            this.displayedHistory = [];
            this.saveHistoryToLocalStorage();
            this.notificationService.showInfo(
                'History Cleared',
                'All history data has been removed'
            );
        };
        this.showConfirmationModal = true;
    }

    /**
     * Save history to localStorage
     */
    private saveHistoryToLocalStorage(): void {
        try {
            localStorage.setItem('coverageHistory', JSON.stringify(this.history));
        } catch (e) {
            console.error('Failed to save history to localStorage:', e);
            this.notificationService.showError(
                'Save Error',
                'Failed to save history data to local storage'
            );
        }
    }

    /**
     * Import data button handler
     */
    importData(): void {
        this.importExportMode = 'import';
        this.importFileName = '';
        this.importOptions = { replace: false };
        this.showImportExportModal = true;
    }

    /**
     * Export data button handler 
     */
    exportData(): void {
        this.importExportMode = 'export';
        this.exportOptions = { includeAll: true };
        this.showImportExportModal = true;
    }

    /**
     * Handle file input change
     */
    handleFileInput(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const file = input.files[0];
        this.importFileName = file.name;

        // Read file content
        const reader = new FileReader();
        reader.onload = () => {
            try {
                // Store file content to use when confirmed
                (this as any).importFileContent = reader.result as string;
            } catch (error) {
                this.notificationService.showError(
                    'File Error',
                    'Failed to read the import file'
                );
            }
        };
        reader.readAsText(file);
    }

    /**
     * Confirm import action
     */
    confirmImport(): void {
        if (!(this as any).importFileContent) {
            this.notificationService.showWarning(
                'No File Selected',
                'Please select a file to import'
            );
            return;
        }

        try {
            const importedData = JSON.parse((this as any).importFileContent);

            if (!Array.isArray(importedData)) {
                throw new Error('Invalid data format');
            }

            // Process the data
            const importedHistory = importedData.map((entry: any) => ({
                ...entry,
                date: new Date(entry.date)
            }));

            if (this.importOptions.replace) {
                this.history = importedHistory;
            } else {
                // Merge with existing history, avoiding duplicates
                for (const entry of importedHistory) {
                    const existingIndex = this.history.findIndex(e =>
                        e.date.getTime() === entry.date.getTime()
                    );

                    if (existingIndex === -1) {
                        this.history.push(entry);
                    }
                }

                // Sort by date
                this.history.sort((a, b) => a.date.getTime() - b.date.getTime());
            }

            this.hasHistory = this.history.length > 0;
            this.updateFilteredHistory();
            this.saveHistoryToLocalStorage();

            this.closeImportExportModal();
            this.notificationService.showSuccess(
                'Import Successful',
                `Imported ${importedHistory.length} history entries`
            );

        } catch (error) {
            this.notificationService.showError(
                'Import Failed',
                'The selected file contains invalid data'
            );
        }
    }

    /**
     * Confirm export action
     */
    confirmExport(): void {
        try {
            const dataToExport = this.exportOptions.includeAll ? this.history : this.filteredHistory;

            // Create JSON data
            const jsonData = JSON.stringify(dataToExport, null, 2);

            // Create file and trigger download
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `coverage-history-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.closeImportExportModal();
            this.notificationService.showSuccess(
                'Export Successful',
                `Exported ${dataToExport.length} history entries`
            );

        } catch (error) {
            this.notificationService.showError(
                'Export Failed',
                'An error occurred while exporting data'
            );
        }
    }

    // /**
    //  * Export history data to file
    //  */
    // exportHistoryData(): void {
    //     try {
    //         const historyData = this.exportOptions.includeAll 
    //             ? this.originalSnapshots 
    //             : this.filteredSnapshots;

    //         if (historyData.length === 0) {
    //             this.notificationService.showWarning(
    //                 'No Data', 
    //                 'There is no history data to export'
    //             );
    //             return;
    //         }

    //         // Prepare data for export
    //         const dataToExport = JSON.stringify({
    //             version: '1.0',
    //             exportDate: new Date().toISOString(),
    //             history: historyData
    //         }, null, 2);

    //         // Create a blob and download
    //         const blob = new Blob([dataToExport], { type: 'application/json' });
    //         const url = window.URL.createObjectURL(blob);
    //         const a = document.createElement('a');
    //         a.href = url;
    //         a.download = `coverage-history-${new Date().toISOString().split('T')[0]}.json`;
    //         document.body.appendChild(a);
    //         a.click();
    //         document.body.removeChild(a);
    //         window.URL.revokeObjectURL(url);

    //         this.closeImportExportModal();
    //         this.notificationService.showSuccess(
    //             'Export Complete', 
    //             `${historyData.length} history entries exported successfully`
    //         );
    //     } catch (error) {
    //         console.error('Error exporting history data:', error);
    //         this.notificationService.showError(
    //             'Export Failed', 
    //             'An error occurred while exporting history data'
    //         );
    //     }
    // }

    /**
     * Close import/export modal
     */
    closeImportExportModal(): void {
        this.showImportExportModal = false;
        // Clear file input
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
        (this as any).importFileContent = null;
    }

    /**
     * Close confirmation modal
     */
    closeConfirmationModal(): void {
        this.showConfirmationModal = false;
        this.pendingAction = null;
    }

    /**
     * Execute the pending action after confirmation
     */
    confirmAction(): void {
        if (this.pendingAction) {
            this.pendingAction();
        }
        this.closeConfirmationModal();
    }

    /**
     * Get coverage CSS class based on percentage
     */
    getCoverageClass(rate: number): string {
        if (rate >= 90) return 'excellent';
        if (rate >= 75) return 'good';
        if (rate >= 50) return 'average';
        return 'poor';
    }

    /**
     * Get coverage color based on percentage
     */
    getCoverageColor(rate: number): string {
        if (rate >= 90) return 'var(--success-color)';
        if (rate >= 75) return 'var(--accent-dark)';
        if (rate >= 50) return 'var(--warning-color)';
        return 'var(--error-color)';
    }
}