import { Component, OnInit, Input, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageData } from '../../../../core/models/coverage.model';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './heatmap.component.html',
  styleUrls: ['./heatmap.component.scss']
})
export class HeatmapComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef;
  @Input() coverageData: CoverageData | null = null;

  chartType: ChartType = ChartType.Calendar;
  chartData: any[] = [];
  chartOptions: any = {};
  chartColumns = ['Package', 'Coverage'];
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

    const data: any[] = [];

    // We'll create a matrix of packages vs. classes to show coverage intensity
    // First collect all unique classes across packages
    const allClasses = new Set<string>();
    this.coverageData.packages.forEach(pkg => {
      pkg.classes.forEach(cls => {
        allClasses.add(cls.name);
      });
    });

    // Create data for each class in each package
    this.coverageData.packages.forEach(pkg => {
      const classMap = new Map<string, number>();

      // Initialize with 0 coverage
      allClasses.forEach(className => {
        classMap.set(className, 0);
      });

      // Set actual coverage for classes in this package
      pkg.classes.forEach(cls => {
        classMap.set(cls.name, cls.lineCoverage);
      });

      // Add package data point
      data.push([pkg.name, pkg.lineCoverage]);

      // Add class data points
      Array.from(classMap.entries()).forEach(([className, coverage]) => {
        if (coverage > 0) { // Only add classes with actual coverage
          data.push([`${pkg.name}.${className}`, coverage]);
        }
      });
    });

    this.chartData = data;
  }

  private updateChartOptions(): void {
    this.chartOptions = {
      title: 'Coverage Heatmap',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      colorAxis: {
        colors: ['#f44336', '#ffeb3b', '#4caf50'], // Red to Yellow to Green
        minValue: 0,
        maxValue: 100
      },
      calendar: {
        cellSize: 16,
        yearLabel: {
          fontName: 'Roboto',
          fontSize: 14,
          color: this.isDarkTheme ? '#cccccc' : '#333333',
          bold: true
        },
        cellColor: {
          stroke: this.isDarkTheme ? '#444444' : '#dddddd',
          strokeOpacity: 0.5,
          strokeWidth: 1
        }
      },
      tooltip: {
        isHtml: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      height: this.chartHeight,
      width: this.chartWidth
    };
  }
}