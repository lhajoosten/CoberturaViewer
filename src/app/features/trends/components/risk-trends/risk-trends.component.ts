import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { TrendAnalysisService } from '../../services/trend-analysis.service';
import { RiskAnalysisService } from '../../../insights/services/risk-analysis.service';
import { CoverageData } from '../../../../core/models/coverage.model';

@Component({
  selector: 'app-risk-trends',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './risk-trends.component.html',
  styleUrls: ['./risk-trends.component.scss']
})
export class RiskTrendsComponent implements OnInit {
  // Data
  hasData = false;
  currentData: CoverageData | null = null;
  riskHistory: any[] = [];
  classRiskHistory: any[] = [];
  isDarkTheme = false;
  selectedTimeframe = 30; // days

  // Risk overview chart
  riskChartType = ChartType.LineChart;
  riskChartData: any[] = [];
  riskChartOptions: any = {};

  // High risk classes chart
  classRiskChartType = ChartType.ColumnChart
  classRiskChartData: any[] = [];
  classRiskChartOptions: any = {};

  constructor(
    private coverageStore: CoverageStoreService,
    private themeStore: ThemeStoreService,
    private trendService: TrendAnalysisService,
    private riskService: RiskAnalysisService
  ) { }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
      this.updateChartOptions();
    });

    // Get current coverage data
    this.coverageStore.getCoverageData().subscribe(data => {
      this.currentData = data;
      this.hasData = !!data;

      if (this.hasData && data) {
        // Load risk history from localStorage or create it
        this.loadRiskHistory();

        // Add current data to risk history if not already there
        this.addCurrentRiskData(data);

        // Prepare charts
        this.prepareChartData();
        this.updateChartOptions();
      }
    });
  }

  changeTimeframe(days: number): void {
    this.selectedTimeframe = days;
    this.prepareChartData();
  }

  private loadRiskHistory(): void {
    try {
      const riskHistoryStr = localStorage.getItem('risk-history');
      if (riskHistoryStr) {
        const parsedHistory = JSON.parse(riskHistoryStr);
        this.riskHistory = parsedHistory.map((item: any) => ({
          ...item,
          date: new Date(item.date)
        }));
      }

      const classRiskHistoryStr = localStorage.getItem('class-risk-history');
      if (classRiskHistoryStr) {
        this.classRiskHistory = JSON.parse(classRiskHistoryStr);
      }
    } catch (error) {
      console.error('Error loading risk history:', error);
      this.riskHistory = [];
      this.classRiskHistory = [];
    }
  }

  private addCurrentRiskData(data: CoverageData): void {
    // Check if we already have an entry for today
    const today = new Date().toDateString();
    const existingEntry = this.riskHistory.find(entry =>
      new Date(entry.date).toDateString() === today);

    if (existingEntry) return;

    // Analyze risks for current data
    const riskAnalysis = this.riskService.analyzeRisks(data);

    // Add to risk history
    const riskEntry = {
      date: new Date(),
      riskScore: riskAnalysis.riskScore,
      riskLevel: riskAnalysis.riskLevel,
      coverageGap: riskAnalysis.coverageGap,
      highRiskCount: riskAnalysis.highRiskClasses.length,
      mediumRiskCount: riskAnalysis.mediumRiskClasses.length
    };

    this.riskHistory.push(riskEntry);

    // Save top risky classes
    const topRiskyClasses = [...riskAnalysis.highRiskClasses]
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 5)
      .map(cls => ({
        name: cls.path,
        riskScore: cls.riskScore,
        coverage: cls.coverage,
        date: new Date().toISOString()
      }));

    // Add to class risk history
    this.classRiskHistory.push({
      date: new Date().toISOString(),
      classes: topRiskyClasses
    });

    // Keep only last 60 entries
    if (this.riskHistory.length > 60) {
      this.riskHistory = this.riskHistory.slice(-60);
    }

    if (this.classRiskHistory.length > 30) {
      this.classRiskHistory = this.classRiskHistory.slice(-30);
    }

    // Save to localStorage
    localStorage.setItem('risk-history', JSON.stringify(this.riskHistory));
    localStorage.setItem('class-risk-history', JSON.stringify(this.classRiskHistory));
  }

  private prepareChartData(): void {
    if (this.riskHistory.length === 0) return;

    // Filter history based on timeframe
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.selectedTimeframe);

    const filteredHistory = this.riskHistory
      .filter(entry => entry.date >= cutoffDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // Prepare risk score chart data
    this.riskChartData = [
      ['Date', 'Risk Score', 'High Risk Classes', 'Medium Risk Classes']
    ];

    filteredHistory.forEach(entry => {
      this.riskChartData.push([
        entry.date,
        entry.riskScore,
        entry.highRiskCount,
        entry.mediumRiskCount
      ]);
    });

    // Prepare class risk chart from most recent entry
    if (this.classRiskHistory.length > 0) {
      const latestClassData = this.classRiskHistory[this.classRiskHistory.length - 1];

      this.classRiskChartData = [
        ['Class', 'Risk Score', { role: 'style' }, { role: 'annotation' }]
      ];

      latestClassData.classes.forEach((cls: any) => {
        // Color based on coverage
        let color = '#f44336'; // red for low coverage
        if (cls.coverage >= 80) {
          color = '#4caf50'; // green for high coverage
        } else if (cls.coverage >= 60) {
          color = '#ffb300'; // amber for medium coverage
        }

        this.classRiskChartData.push([
          cls.name,
          cls.riskScore,
          color,
          cls.coverage.toFixed(1) + '%'
        ]);
      });
    }
  }

  private updateChartOptions(): void {
    // Risk trend chart options
    this.riskChartOptions = {
      title: 'Risk Trends',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#f44336', '#ff9800', '#ffb300'],
      hAxis: {
        title: 'Date',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        format: 'MM/dd'
      },
      vAxis: {
        title: 'Score',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        minValue: 0
      },
      legend: {
        position: 'top',
        alignment: 'center',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      chartArea: {
        width: '85%',
        height: '70%'
      },
      lineWidth: 3,
      pointSize: 5,
      series: {
        0: { targetAxisIndex: 0 },
        1: { targetAxisIndex: 1 },
        2: { targetAxisIndex: 1 }
      },
      vAxes: {
        0: {
          title: 'Risk Score',
          minValue: 0,
          maxValue: 100
        },
        1: {
          title: 'Classes Count',
          minValue: 0
        }
      }
    };

    // Class risk chart options
    this.classRiskChartOptions = {
      title: 'Highest Risk Classes',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      hAxis: {
        title: 'Risk Score',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        minValue: 0
      },
      vAxis: {
        title: 'Class',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      legend: { position: 'none' },
      annotations: {
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333',
          fontSize: 12
        }
      },
      chartArea: {
        width: '70%',
        height: '80%'
      },
      bars: 'horizontal'
    };
  }

  generateMockData(): void {
    // Generate mock risk history for demonstration
    this.riskHistory = [];
    this.classRiskHistory = [];

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 30);

    // Generate decreasing risk trend (improvement)
    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Risk starts high and decreases (improvement)
      const progress = i / 30; // 0 to 1
      const baseRiskScore = 80 - (50 * progress); // 80% to 30%
      const randomVariation = (Math.random() - 0.5) * 10; // -5% to +5%

      const riskScore = Math.min(Math.max(baseRiskScore + randomVariation, 0), 100);

      // Class counts follow similar pattern
      const highRiskCount = Math.max(0, Math.round(10 - (8 * progress) + (Math.random() - 0.5) * 3));
      const mediumRiskCount = Math.max(0, Math.round(15 - (5 * progress) + (Math.random() - 0.5) * 5));

      this.riskHistory.push({
        date,
        riskScore,
        riskLevel: riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low',
        coverageGap: Math.max(0, 90 - (40 * progress + 50)), // Coverage improves from 50% to 90%
        highRiskCount,
        mediumRiskCount
      });
    }

    // Generate mock class risk data
    const mockClasses = [
      { name: 'com.example.service.AuthService', riskScore: 75, coverage: 48.2 },
      { name: 'com.example.controller.UserController', riskScore: 65, coverage: 52.7 },
      { name: 'com.example.util.DataProcessor', riskScore: 54, coverage: 59.1 },
      { name: 'com.example.model.Transaction', riskScore: 42, coverage: 67.5 },
      { name: 'com.example.repository.OrderRepository', riskScore: 35, coverage: 72.3 }
    ];

    this.classRiskHistory.push({
      date: new Date().toISOString(),
      classes: mockClasses.map(cls => ({
        ...cls,
        date: new Date().toISOString()
      }))
    });

    // Save to localStorage
    localStorage.setItem('risk-history', JSON.stringify(this.riskHistory));
    localStorage.setItem('class-risk-history', JSON.stringify(this.classRiskHistory));

    // Update charts
    this.prepareChartData();
  }

  clearRiskHistory(): void {
    if (confirm('Are you sure you want to clear risk history data?')) {
      this.riskHistory = [];
      this.classRiskHistory = [];
      localStorage.removeItem('risk-history');
      localStorage.removeItem('class-risk-history');
      this.riskChartData = [['Date', 'Risk Score', 'High Risk Classes', 'Medium Risk Classes']];
      this.classRiskChartData = [['Class', 'Risk Score', { role: 'style' }, { role: 'annotation' }]];
    }
  }

  // Add these methods to the RiskTrendsComponent class
  getRiskTrendClass(): string {
    if (this.riskHistory.length < 2) return 'neutral-trend';

    const latest = this.riskHistory[this.riskHistory.length - 1];
    const previous = this.riskHistory[this.riskHistory.length - 2];

    if (latest.riskScore < previous.riskScore) return 'positive-trend';
    if (latest.riskScore > previous.riskScore) return 'negative-trend';
    return 'neutral-trend';
  }

  getRiskTrendIcon(): string {
    if (this.riskHistory.length < 2) return 'fa-minus';

    const latest = this.riskHistory[this.riskHistory.length - 1];
    const previous = this.riskHistory[this.riskHistory.length - 2];

    if (latest.riskScore < previous.riskScore) return 'fa-arrow-down';
    if (latest.riskScore > previous.riskScore) return 'fa-arrow-up';
    return 'fa-minus';
  }

  getRiskTrendValue(): string {
    if (this.riskHistory.length < 2) return '0%';

    const latest = this.riskHistory[this.riskHistory.length - 1];
    const previous = this.riskHistory[this.riskHistory.length - 2];

    const change = latest.riskScore - previous.riskScore;
    return (change > 0 ? '+' : '') + change.toFixed(1) + '%';
  }

  getRiskTrendLabel(): string {
    if (this.riskHistory.length < 2) return 'No change';

    const latest = this.riskHistory[this.riskHistory.length - 1];
    const previous = this.riskHistory[this.riskHistory.length - 2];

    if (latest.riskScore < previous.riskScore) return 'Improving';
    if (latest.riskScore > previous.riskScore) return 'Worsening';
    return 'Stable';
  }
}