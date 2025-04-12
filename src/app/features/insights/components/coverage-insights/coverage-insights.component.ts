import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { InsightGeneratorService } from '../../services/insight-generator.service';
import { RecommendationService } from '../../services/recommendation.service';
import { RiskAnalysisService } from '../../services/risk-analysis.service';
import { CoverageData, CoverageInsight } from '../../../../core/models/coverage.model';
import { combineLatest } from 'rxjs';
import { Nl2brPipe } from "../../pipes/nl2br.pipe";

@Component({
  selector: 'app-coverage-insights',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule, Nl2brPipe],
  templateUrl: './coverage-insights.component.html',
  styleUrls: ['./coverage-insights.component.scss']
})
export class CoverageInsightsComponent implements OnInit {
  coverageData: CoverageData | null = null;
  insights: CoverageInsight[] = [];
  recommendations: CoverageInsight[] = [];
  hasData = false;
  isDarkTheme = false;

  // Risk analysis
  riskAnalysis: any = null;

  // Risk gauge chart
  gaugeChartType: ChartType = ChartType.Gauge;
  gaugeChartData: any[] = [];
  gaugeChartOptions: any = {};
  gaugeChartWidth = 1000;
  gaugeChartHeight = 200;

  // Distribution pie chart
  pieChartType: ChartType = ChartType.PieChart;
  pieChartData: any[] = [];
  pieChartOptions: any = {};
  pieChartWidth = 1000;
  pieChartHeight = 250;

  constructor(
    private coverageStore: CoverageStoreService,
    private themeStore: ThemeStoreService,
    private insightGenerator: InsightGeneratorService,
    private recommendationService: RecommendationService,
    private riskAnalysisService: RiskAnalysisService
  ) { }

  ngOnInit(): void {
    // Load coverage data and generate insights
    combineLatest([
      this.coverageStore.getCoverageData(),
      this.themeStore.isDarkTheme$
    ]).subscribe(([data, isDark]) => {
      this.coverageData = data;
      this.isDarkTheme = isDark;
      this.hasData = !!data;

      if (this.hasData && data) {
        // Generate insights
        this.insights = this.insightGenerator.generateInsights(data);
        this.recommendations = this.recommendationService.generateRecommendations(data);

        // Perform risk analysis
        this.riskAnalysis = this.riskAnalysisService.analyzeRisks(data);

        // Update charts
        this.updateCharts();
      }
    });
  }

  toggleInsight(insight: CoverageInsight): void {
    insight.expanded = !insight.expanded;
  }

  updateCharts(): void {
    this.updateRiskGauge();
    this.updateDistributionChart();
  }

  private updateRiskGauge(): void {
    if (!this.riskAnalysis) return;

    // Prepare gauge data
    this.gaugeChartData = [
      ['Label', 'Value'],
      ['Risk', this.riskAnalysis.riskScore]
    ];

    // Configure gauge options
    this.gaugeChartOptions = {
      width: this.gaugeChartWidth,
      height: this.gaugeChartHeight,
      redFrom: 66,
      redTo: 100,
      yellowFrom: 33,
      yellowTo: 66,
      greenFrom: 0,
      greenTo: 33,
      minorTicks: 5,
      max: 100,
      animation: {
        duration: 1000,
        easing: 'out'
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff'
    };
  }

  private updateDistributionChart(): void {
    if (!this.coverageData) return;

    // Calculate coverage distribution
    const classes = this.coverageData.packages.flatMap(pkg => pkg.classes);
    const distribution = {
      excellent: 0,
      good: 0,
      adequate: 0,
      poor: 0
    };

    classes.forEach(cls => {
      if (cls.lineCoverage >= 90) distribution.excellent++;
      else if (cls.lineCoverage >= 75) distribution.good++;
      else if (cls.lineCoverage >= 50) distribution.adequate++;
      else distribution.poor++;
    });

    // Prepare pie chart data
    this.pieChartData = [
      ['Coverage', 'Classes'],
      ['Excellent (90%+)', distribution.excellent],
      ['Good (75-90%)', distribution.good],
      ['Adequate (50-75%)', distribution.adequate],
      ['Poor (<50%)', distribution.poor]
    ];

    // Configure pie chart options
    this.pieChartOptions = {
      title: 'Coverage Distribution',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#4caf50', '#8bc34a', '#ffb300', '#f44336'],
      is3D: false,
      pieHole: 0.4,
      legend: {
        position: 'right',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      chartArea: {
        left: 10,
        top: 30,
        width: '80%',
        height: '80%'
      },
      sliceVisibilityThreshold: 0.05
    };
  }

  getRiskLevelClass(risk: 'high' | 'medium' | 'low'): string {
    switch (risk) {
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      case 'low': return 'risk-low';
      default: return '';
    }
  }
}