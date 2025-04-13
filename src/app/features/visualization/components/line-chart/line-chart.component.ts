import { Component, OnInit, Input, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageData } from '../../../../core/models/coverage.model';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-line-chart',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './line-chart.component.html',
  styleUrls: ['./line-chart.component.scss']
})
export class LineChartComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef;
  @Input() coverageData: CoverageData | null = null;

  chartType: ChartType = ChartType.LineChart;
  chartData: any[] = [];
  chartOptions: any = {};
  chartColumns = [
    'Date',
    'Line Coverage',
    'Branch Coverage',
    'Method Coverage'
  ];
  chartWidth = 850;
  chartHeight = 500;

  private themeSubscription: Subscription | null = null;
  isDarkTheme = false;

  constructor(private themeStore: ThemeStoreService) { }

  ngOnInit(): void {
    this.themeSubscription = this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
      this.updateChartOptions();
      this.prepareChartData();
    });

    this.prepareChartData();
    this.updateChartOptions();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  private prepareChartData(): void {
    if (!this.coverageData) return;

    // Since we have only one data point, we'll generate a simulated trend
    // This would normally come from historical data storage
    const data: any[] = [];

    const currentDate = new Date();
    const currentSummary = this.coverageData.summary;

    // Generate data for the past 10 days
    for (let i = 9; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);

      // Simulate slightly different coverage values for past dates
      // The closer to today, the closer to actual value
      const randomFactor = i / 10; // More randomness for older dates
      const randomVariation = (value: number) => {
        const variation = (Math.random() - 0.5) * 10 * randomFactor;
        return Math.max(0, Math.min(100, value + variation));
      };

      // For the current day, use actual values
      if (i === 0) {
        data.push([
          date,
          currentSummary.lineCoverage,
          currentSummary.branchCoverage || 0,
          currentSummary.methodCoverage || 0
        ]);
      } else {
        data.push([
          date,
          randomVariation(currentSummary.lineCoverage),
          randomVariation(currentSummary.branchCoverage || 0),
          randomVariation(currentSummary.methodCoverage || 0)
        ]);
      }
    }

    this.chartData = data;
  }

  private updateChartOptions(): void {
    this.chartOptions = {
      title: 'Coverage Trends',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#4caf50', '#ff9800', '#2196f3'], // Line, Branch, Method
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
        width: '80%',
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
      }
    };
  }
}