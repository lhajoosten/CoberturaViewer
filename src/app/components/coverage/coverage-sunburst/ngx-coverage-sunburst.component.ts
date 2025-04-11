import { trigger, animate, transition, style } from "@angular/animations";
import { CommonModule } from "@angular/common";
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { NgxChartsModule } from "@swimlane/ngx-charts";
import { BehaviorSubject, Subscription } from "rxjs";
import { CoverageData } from "../../../common/models/coverage.model";
import { CoverageStoreService } from "../../../common/services/coverage-store.service";
import { ThemeService } from "../../../common/utils/theme.utility";
import { NotificationService } from "../../../common/utils/notification.utility";

@Component({
    selector: 'app-ngx-coverage-sunburst',
    standalone: true,
    imports: [CommonModule, FormsModule, NgxChartsModule],
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
export class NgxCoverageSunburstComponent implements OnInit, OnDestroy {
    @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;

    // Chart data and configuration
    chartData: any[] = [];
    colorScheme: any = {
        domain: ['#4CAF50', '#8BC34A', '#FFC107', '#FF9800', '#F44336'] // Default colors
    };

    // Chart type (can toggle between pie and advanced-pie)
    chartType: 'pie' | 'advanced-pie' = 'advanced-pie';

    // Chart dimensions
    width = 500;
    height = 400;

    // State
    isDarkTheme = false;
    isLoading = true;
    currentNode: any = null;
    breadcrumbs: Array<{ name: string, node: any }> = [];

    // Tooltip
    tooltipX = 0;
    tooltipY = 0;
    showTooltip = false;
    tooltipNode: any = null;

    private subscriptions: Subscription = new Subscription();

    constructor(
        private coverageStoreService: CoverageStoreService,
        private themeService: ThemeService,
        private notificationService: NotificationService
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
            this.coverageStoreService.getCoverageData().subscribe(data => {
                this.isLoading = true;

                if (data) {
                    // Initialize breadcrumbs if empty
                    if (this.breadcrumbs.length === 0) {
                        this.breadcrumbs = [{
                            name: 'All Code',
                            node: {
                                name: 'All Code',
                                coverage: data.summary.lineCoverage,
                                value: data.summary.linesValid,
                                children: data.packages
                            }
                        }];
                    }

                    // Generate chart data based on current level
                    this.generateChartData(data);
                } else {
                    this.chartData = [];
                    this.currentNode = null;
                }

                this.isLoading = false;
            })
        );

        // Set initial size based on container
        setTimeout(() => this.updateChartDimensions(), 0);
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
                // Keep the chart square-ish but respect container
                const minDimension = Math.min(rect.width, rect.height) - 40; // Leave some padding
                this.width = minDimension;
                this.height = minDimension;
            }
        }
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
     * Generate chart data based on current breadcrumb level
     */
    private generateChartData(coverageData: CoverageData): void {
        if (!coverageData || this.breadcrumbs.length === 0) {
            this.chartData = [];
            return;
        }

        // Get current level from breadcrumbs
        const currentLevel = this.breadcrumbs[this.breadcrumbs.length - 1];
        this.currentNode = currentLevel.node;

        // Transform data based on current node
        this.chartData = [];

        if (currentLevel.name === 'All Code') {
            // Top level - show packages
            this.chartData = coverageData.packages.map(pkg => ({
                name: pkg.name || 'Default Package',
                value: pkg.classes.reduce((sum, cls) => sum + cls.lines.length, 0),
                coverage: pkg.lineCoverage,
                extra: {
                    isPackage: true,
                    children: pkg.classes
                }
            }));
        } else if (currentLevel.node.extra && currentLevel.node.extra.isPackage) {
            // Package level - show classes
            const packageClasses = currentLevel.node.extra.children || [];
            this.chartData = packageClasses.map((cls: any) => ({
                name: cls.name,
                value: cls.lines?.length || 0,
                coverage: cls.lineCoverage,
                extra: {
                    isPackage: false,
                    filename: cls.filename
                }
            }));
        }

        // Sort by coverage (high to low)
        this.chartData.sort((a, b) => b.coverage - a.coverage);

        // Apply color function based on coverage
        this.chartData.forEach(item => {
            item.color = this.getCoverageColor(item.coverage);
        });
    }

    /**
     * Get the coverage color based on percentage
     */
    private getCoverageColor(coverage: number): string {
        if (coverage >= 90) return this.colorScheme.domain[0]; // Excellent
        if (coverage >= 75) return this.colorScheme.domain[1]; // Good
        if (coverage >= 50) return this.colorScheme.domain[2]; // Moderate
        return this.colorScheme.domain[4]; // Poor
    }

    /**
     * Handle node selection to drill down
     */
    onSelect(event: any): void {
        if (!event) return;

        // Update current node
        this.currentNode = event;

        // If node has children, drill down
        if (event.extra && event.extra.children && event.extra.children.length > 0) {
            this.breadcrumbs.push({
                name: event.name,
                node: event
            });

            // Regenerate chart data
            const coverageData = (this.coverageStoreService.getCoverageData() as BehaviorSubject<CoverageData | null>).getValue();
            if (coverageData) {
                this.generateChartData(coverageData);
            }
        }
    }

    /**
     * Handle node hover
     */
    onActivate(event: any): void {
        if (event.value) {
            const node = event.value;

            // Set tooltip data
            this.tooltipNode = {
                name: node.name,
                isPackage: node.extra?.isPackage || false,
                coverage: node.coverage,
                value: node.value
            };

            // Calculate tooltip position
            if (event.event) {
                const rect = this.chartContainer.nativeElement.getBoundingClientRect();
                this.tooltipX = event.event.clientX - rect.left + 10;
                this.tooltipY = event.event.clientY - rect.top + 10;

                // Ensure tooltip stays within view
                const maxX = rect.width - 280;
                if (this.tooltipX > maxX) {
                    this.tooltipX = maxX;
                }
            }

            this.showTooltip = true;
        }
    }

    /**
     * Handle mouse leave
     */
    onDeactivate(): void {
        this.showTooltip = false;
    }

    /**
     * Reset view to top level
     */
    resetView(): void {
        if (this.breadcrumbs.length <= 1) return;

        // Reset to root level
        this.breadcrumbs = this.breadcrumbs.slice(0, 1);

        // Regenerate chart data
        const coverageData = (this.coverageStoreService.getCoverageData() as BehaviorSubject<CoverageData | null>).getValue();
        if (coverageData) {
            this.generateChartData(coverageData);
        }
    }

    /**
     * Navigate to specific breadcrumb level
     */
    navigateToBreadcrumb(index: number): void {
        if (index >= this.breadcrumbs.length - 1) return;

        // Truncate breadcrumbs to selected index
        this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);

        // Regenerate chart data
        const coverageData = (this.coverageStoreService.getCoverageData() as BehaviorSubject<CoverageData | null>).getValue();
        if (coverageData) {
            this.generateChartData(coverageData);
        }
    }

    /**
     * Toggle between pie chart and advanced pie chart
     */
    toggleChartType(): void {
        this.chartType = this.chartType === 'pie' ? 'advanced-pie' : 'pie';
    }

    /**
     * Calculate covered lines based on coverage percentage
     */
    getCoveredLines(node: any): string {
        if (!node || node.value === undefined || node.coverage === undefined) return '0';

        const coveredLines = Math.round(node.value * (node.coverage / 100));
        return `${coveredLines} / ${node.value}`;
    }

    /**
     * Export chart as PNG
     */
    exportChart(): void {
        const svg = this.chartContainer.nativeElement.querySelector('svg');
        if (!svg) {
            this.notificationService.showWarning('Export Failed', 'No chart found to export');
            return;
        }

        try {
            // Clone SVG for export
            const clonedSvg = svg.cloneNode(true) as SVGElement;

            // Create a canvas
            const canvas = document.createElement('canvas');
            canvas.width = this.width;
            canvas.height = this.height;

            // Get canvas context
            const context = canvas.getContext('2d');
            if (!context) {
                this.notificationService.showError('Export Failed', 'Failed to get canvas context');
                return;
            }

            // Fill background
            context.fillStyle = this.isDarkTheme ? '#1a1a1a' : '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Convert SVG to image
            const svgData = new XMLSerializer().serializeToString(clonedSvg);
            const img = new Image();

            img.onload = () => {
                context.drawImage(img, 0, 0);

                // Create download link
                canvas.toBlob(blob => {
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'coverage-chart.png';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);

                        // Show notification
                        this.notificationService.showSuccess('Export Complete', 'Chart exported successfully');
                    }
                });
            };

            img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
        } catch (error) {
            console.error('Error exporting chart:', error);
            this.notificationService.showError('Export Failed', 'Could not export the chart');
        }
    }

    /**
     * Get CSS class for coverage value
     */
    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'moderate';
        return 'poor';
    }
}