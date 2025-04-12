import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageData } from '../../../../core/models/coverage.model';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sunburst',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './sunburst.component.html',
  styleUrls: ['./sunburst.component.scss']
})
export class SunburstComponent implements OnInit, OnDestroy {
  @Input() coverageData: CoverageData | null = null;

  chartType: ChartType = ChartType.PieChart;
  chartData: any[] = [];
  chartOptions: any = {};
  chartWidth = 1140;
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
    if (!this.coverageData) {
      return;
    }

    const data: any[] = [];

    // Add package slices with their coverage percentage
    this.coverageData.packages.forEach(pkg => {
      // Only include packages with actual lines
      if (pkg.linesValid > 0) {
        data.push([
          pkg.name,
          pkg.linesValid
        ]);
      }
    });

    this.chartData = data;
  }

  private updateChartOptions(): void {
    this.chartOptions = {
      title: 'Coverage by Package',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722', '#f44336'],
      is3D: false,
      pieHole: 0.4,
      legend: {
        position: 'right',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      chartArea: {
        left: 50,
        top: 50,
        width: '70%',
        height: '70%'
      },
      tooltip: {
        showColorCode: true,
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      pieSliceText: 'percentage',
      sliceVisibilityThreshold: 0.03
    };
  }
}