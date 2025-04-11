import { Component, Input, OnDestroy, OnInit, ElementRef, HostListener, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

// Services
import { CoverageStoreService } from '../../../common/services/coverage-store.service';
import { ThemeService } from '../../../common/utils/theme.utility';
import { NotificationService } from '../../../common/utils/notification.utility';
import { ExportService } from '../../../common/utils/export.utility';
import { InsightGeneratorService } from '../../../common/utils/insight-generator.utility';
import { RecommendationService } from '../../../common/utils/recommendation.utility';
import { RiskAnalysisService } from '../../../common/utils/risk-analysis.utility';

// Models
import { CoverageData, CoverageInsight, ClassRisk, CoverageThresholds } from '../../../common/models/coverage.model';
import { Recommendation } from './recommendations-view/recommendations-view.component';

// Sub-components
import { MetricsViewComponent } from './metrics-view/metrics-view.component';
import { InsightsViewComponent } from './insights-view/insights-view.component';
import { RisksViewComponent } from './risks-view/risks-view.component';
import { DistributionViewComponent } from './distribution-view/distribution-view.component';
import { RecommendationsViewComponent } from './recommendations-view/recommendations-view.component';
import { ThresholdSettingsComponent } from './threshold-settings/threshold-settings.component';

type ViewType = 'metrics' | 'insights' | 'risks' | 'distribution' | 'recommendations';

@Component({
    selector: 'app-coverage-insights',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        MetricsViewComponent,
        InsightsViewComponent,
        RisksViewComponent,
        DistributionViewComponent,
        RecommendationsViewComponent,
        ThresholdSettingsComponent
    ],
    templateUrl: './coverage-insights.component.html',
    styleUrls: ['./coverage-insights.component.scss']
})
export class CoverageInsightsComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    // Coverage data
    coverageData: CoverageData | null = null;

    // UI state
    isFullscreen = false;
    showThresholdSettings = false;
    activeView: ViewType = 'metrics';

    // View tabs configuration
    tabs: Array<{ id: ViewType, label: string, icon: string }> = [
        { id: 'metrics', label: 'Metrics', icon: 'fa-chart-line' },
        { id: 'insights', label: 'Insights', icon: 'fa-lightbulb' },
        { id: 'risks', label: 'Risks', icon: 'fa-exclamation-triangle' },
        { id: 'distribution', label: 'Distribution', icon: 'fa-chart-pie' },
        { id: 'recommendations', label: 'Recommendations', icon: 'fa-list-check' }
    ];

    // Data for child components
    thresholds: CoverageThresholds = { excellent: 90, good: 75, average: 50 };
    highRiskClasses: ClassRisk[] = [];
    insights: CoverageInsight[] = [];
    recommendations: Recommendation[] = [];

    constructor(
        private coverageStore: CoverageStoreService,
        private themeService: ThemeService,
        private notificationService: NotificationService,
        private insightGenerator: InsightGeneratorService,
        private riskAnalysis: RiskAnalysisService,
        private recommendationService: RecommendationService,
        private exportService: ExportService,
        private elementRef: ElementRef,
        private renderer: Renderer2,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.loadThresholds();

        this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
            this.isDarkTheme = isDark;
        });

        this.coverageStore.getCoverageData().subscribe(data => {
            this.coverageData = data;
            if (data) {
                this.processData();
            }
        });
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    /**
     * Process coverage data to generate insights, risks and recommendations
     */
    private processData(): void {
        if (!this.coverageData) return;

        this.generateInsights();
        this.identifyHighRiskClasses();
        this.generateRecommendations();

        // Switch to default view tab if risks is empty
        if (this.activeView === 'risks' && this.highRiskClasses.length === 0) {
            this.setActiveView('metrics');
        }
    }

    /**
     * Load threshold settings from local storage
     */
    private loadThresholds(): void {
        const savedThresholds = localStorage.getItem('coverage-thresholds');
        if (savedThresholds) {
            try {
                this.thresholds = JSON.parse(savedThresholds);
            } catch (e) {
                console.error('Failed to parse saved thresholds:', e);
            }
        }
    }

    /**
     * Update threshold settings
     */
    updateThresholds(newThresholds: CoverageThresholds): void {
        this.thresholds = newThresholds;
        localStorage.setItem('coverage-thresholds', JSON.stringify(this.thresholds));
        this.processData();
        this.notificationService.showSuccess('Thresholds Updated', 'Coverage thresholds have been updated');
    }

    /**
     * Set the active view tab
     */
    setActiveView(view: ViewType): void {
        if (this.activeView === view) return;
        this.activeView = view;
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen(): void {
        this.isFullscreen = !this.isFullscreen;
        if (this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    /**
     * Enter fullscreen mode
     */
    private enterFullscreen(): void {
        const container = this.elementRef.nativeElement.querySelector('.insights-container');
        if (container && container.requestFullscreen) {
            container.requestFullscreen().catch((err: any) => {
                console.error('Error attempting to enable fullscreen:', err);
                this.isFullscreen = false;
            });
        }
        this.renderer.addClass(document.body, 'insights-fullscreen');
    }

    /**
     * Exit fullscreen mode
     */
    private exitFullscreen(): void {
        if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(err => {
                console.error('Error attempting to exit fullscreen:', err);
            });
        }
        this.isFullscreen = false;
        this.renderer.removeClass(document.body, 'insights-fullscreen');
    }

    /**
     * Toggle threshold settings dropdown
     */
    toggleThresholdSettings(): void {
        this.showThresholdSettings = !this.showThresholdSettings;
    }

    /**
     * Navigate to upload screen
     */
    navigateToUpload(): void {
        this.router.navigate(['/upload']);
    }

    /**
     * Export insights as markdown
     */
    exportInsights(): void {
        if (!this.coverageData) return;

        this.exportService.exportInsightsToMarkdown(
            this.coverageData,
            this.insights,
            this.recommendations,
            this.highRiskClasses,
            this.thresholds
        );

        this.notificationService.showSuccess('Export Complete', 'Insights have been exported as Markdown');
    }

    /**
     * Generate insights from coverage data
     */
    private generateInsights(): void {
        if (!this.coverageData) return;
        this.insights = this.insightGenerator.generateInsights(this.coverageData, this.thresholds);
    }

    /**
     * Identify high risk classes
     */
    private identifyHighRiskClasses(): void {
        if (!this.coverageData) return;
        this.highRiskClasses = this.riskAnalysis.identifyHighRiskClasses(this.coverageData, this.thresholds);
    }

    /**
     * Generate recommendations based on coverage data
     */
    private generateRecommendations(): void {
        if (!this.coverageData) return;
        this.recommendations = this.recommendationService.generateRecommendations(
            this.coverageData,
            this.highRiskClasses,
            this.thresholds
        );
    }

    /**
     * Get the appropriate icon for a tab, based on theme
     */
    getTabIcon(view: string): string {
        const tab = this.tabs.find(t => t.id === view);
        if (!tab) return '';

        const iconStyle = this.isDarkTheme ? 'fa-regular' : 'fa-solid';
        return `${iconStyle} ${tab.icon}`;
    }

    /**
     * Handle fullscreen change event
     */
    @HostListener('document:fullscreenchange')
    onFullscreenChange(): void {
        const isCurrentlyFullscreen = !!document.fullscreenElement;
        if (this.isFullscreen !== isCurrentlyFullscreen) {
            this.isFullscreen = isCurrentlyFullscreen;
            if (!isCurrentlyFullscreen) {
                this.renderer.removeClass(document.body, 'insights-fullscreen');
            }
        }
    }

    /**
     * Handle ESC key press
     */
    @HostListener('document:keydown.escape', ['$event'])
    onEscapeKey(event: KeyboardEvent): void {
        if (this.showThresholdSettings) {
            this.toggleThresholdSettings();
            event.preventDefault();
        } else if (this.isFullscreen) {
            this.exitFullscreen();
            event.preventDefault();
        }
    }
}