import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { TrendAnalysisService } from '../../services/trend-analysis.service';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { Subscription } from 'rxjs';
import { CoverageSnapshot } from '../../../../core/models/coverage.model';

@Component({
  selector: 'app-coverage-trends',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleChartsModule],
  templateUrl: './coverage-trends.component.html',
  styleUrls: ['./coverage-trends.component.scss']
})
export class CoverageTrendsComponent implements OnInit, OnDestroy {
  // Chart props
  lineChartType: ChartType = ChartType.LineChart;
  lineChartData: any[] = [];
  lineChartOptions: any = {};
  lineChartWidth = 1000;
  lineChartHeight = 400;

  // Bar chart for comparing coverage metrics
  barChartType: ChartType = ChartType.BarChart;
  barChartData: any[] = [];
  barChartOptions: any = {};
  barChartWidth = 1000;
  barChartHeight = 300;

  // Data
  snapshots: CoverageSnapshot[] = [];
  trendStats: any = { change: 0, direction: 'neutral' };
  hasData = false;
  timeframe = 30; // Days
  isDarkTheme = false;

  // Subscriptions
  private snapSub: Subscription | null = null;
  private themeSub: Subscription | null = null;
  private dataLoaded = false;

  constructor(
    private trendService: TrendAnalysisService,
    private coverageStore: CoverageStoreService,
    private themeStore: ThemeStoreService
  ) { }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSub = this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
      if (this.dataLoaded) {
        this.updateChartOptions();
      }
    });

    // Load snapshots
    this.snapSub = this.trendService.getSnapshots().subscribe(snapshots => {
      this.snapshots = snapshots;
      this.hasData = snapshots.length > 0;
      this.trendStats = this.trendService.getTrendStatistics(this.timeframe);

      if (this.hasData) {
        this.prepareChartData();
        this.updateChartOptions();
        this.dataLoaded = true;
      }
    });

    // Check if we should add current data
    this.coverageStore.getCoverageData().subscribe(data => {
      if (data && !this.dataLoaded) {
        this.trendService.addSnapshot(data);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.snapSub) this.snapSub.unsubscribe();
    if (this.themeSub) this.themeSub.unsubscribe();
  }

  generateMockData(): void {
    this.trendService.generateMockTrends();
  }

  clearTrends(): void {
    if (confirm('Are you sure you want to clear all trend data?')) {
      this.trendService.clearSnapshots();
    }
  }

  changeTimeframe(days: number): void {
    this.timeframe = days;
    this.trendStats = this.trendService.getTrendStatistics(this.timeframe);
    this.prepareChartData();
  }

  getCoverageClass(coverage: number): string {
    if (coverage >= 80) return 'high-coverage';
    if (coverage >= 60) return 'medium-coverage';
    return 'low-coverage';
  }

  private prepareChartData(): void {
    if (!this.hasData) return;

    // Prepare line chart data
    const lineData: any[] = [];

    // Add header row
    lineData.push(['Date', 'Line Coverage', 'Branch Coverage']);

    // Filter by timeframe
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.timeframe);

    const filteredSnapshots = this.snapshots
      .filter(s => s.date >= cutoffDate)
      // Reverse to chronological order
      .reverse();

    // Add data rows
    filteredSnapshots.forEach(snapshot => {
      lineData.push([
        snapshot.date,
        snapshot.lineCoverage,
        snapshot.branchCoverage
      ]);
    });

    // Prepare bar chart data
    const barData: any[] = [];

    // Add header row
    barData.push(['Metric', 'First Snapshot', 'Last Snapshot']);

    if (filteredSnapshots.length >= 2) {
      const first = filteredSnapshots[0];
      const last = filteredSnapshots[filteredSnapshots.length - 1];

      barData.push(['Line Coverage', first.lineCoverage, last.lineCoverage]);
      barData.push(['Branch Coverage', first.branchCoverage, last.branchCoverage]);

      const firstCoveredPct = (first.linesCovered / first.linesValid) * 100;
      const lastCoveredPct = (last.linesCovered / last.linesValid) * 100;

      barData.push(['Lines Covered %', firstCoveredPct, lastCoveredPct]);
    }

    this.lineChartData = lineData;
    this.barChartData = barData;
  }

  private updateChartOptions(): void {
    // Line chart options
    this.lineChartOptions = {
      title: 'Coverage Trends',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#4caf50', '#ff9800'], // Line, Branch
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
        title: 'Coverage (%)',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        minValue: 0,
        maxValue: 100
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
      animation: {
        startup: true,
        duration: 1000,
        easing: 'out'
      },
      explorer: {
        actions: ['dragToZoom', 'rightClickToReset'],
        axis: 'horizontal',
        keepInBounds: true,
        maxZoomIn: 0.2
      },
      crosshair: { trigger: 'both' }
    };

    // Bar chart options
    this.barChartOptions = {
      title: 'Coverage Comparison',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#9e9e9e', '#4caf50'], // First, Last
      hAxis: {
        title: 'Coverage Metric',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      vAxis: {
        title: 'Value (%)',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        minValue: 0,
        maxValue: 100
      },
      legend: {
        position: 'top',
        alignment: 'center',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      chartArea: {
        width: '80%',
        height: '70%'
      },
      animation: {
        startup: true,
        duration: 1000,
        easing: 'out'
      },
      annotations: {
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333',
          fontName: 'Roboto',
          fontSize: 12
        }
      }
    };
  }
}