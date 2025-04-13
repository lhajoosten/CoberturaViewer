import { Component, OnInit, Input, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageData } from '../../../../core/models/coverage.model';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-advanced-pie',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule, FormsModule],
  templateUrl: './advanced-pie.component.html',
  styleUrls: ['./advanced-pie.component.scss']
})
export class AdvancedPieComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef;
  @Input() coverageData: CoverageData | null = null;

  chartType: ChartType = ChartType.PieChart;
  chartData: any[] = [];
  chartOptions: any = {};
  chartWidth = 850;
  chartHeight = 500;

  // Chart customization options
  is3D = false;
  isDonut = true;
  donutHoleSize = 0.4;
  showLegend = true;
  legendPosition: string = 'right';

  private themeSubscription: Subscription | null = null;
  isDarkTheme = false;

  constructor(private themeStore: ThemeStoreService) { }

  ngOnInit(): void {
    this.themeSubscription = this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
      this.updateChartOptions();
    });

    this.prepareChartData();
    this.updateChartOptions();
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  toggleDonut(): void {
    this.isDonut = !this.isDonut;
    // If going 3D, disable donut
    if (this.is3D) {
      this.isDonut = false;
    }
    this.updateChartOptions();
  }

  toggle3D(): void {
    this.is3D = !this.is3D;
    // If going 3D, disable donut
    if (this.is3D) {
      this.isDonut = false;
    }
    this.updateChartOptions();
  }

  toggleLegend(): void {
    this.showLegend = !this.showLegend;
    this.updateChartOptions();
  }

  updateHoleSize(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.donutHoleSize = parseFloat(input.value);
    this.updateChartOptions();
  }

  changeLegendPosition(select: any): void {
    this.legendPosition = select.value as 'right' | 'bottom' | 'top' | 'left';
    this.updateChartOptions();
  }

  private prepareChartData(): void {
    if (!this.coverageData) return;

    const data: any[] = [];

    // Use class data for detailed breakdown
    this.coverageData.packages.forEach(pkg => {
      pkg.classes.forEach(cls => {
        // Show both covered and uncovered portions
        if (cls.linesValid > 0) {
          data.push([
            `${pkg.name}.${cls.name}`,
            cls.linesCovered
          ]);
        }
      });
    });

    // If too many classes (more than 15), group into packages
    if (data.length > 15) {
      data.length = 0;

      // Package-level data
      this.coverageData.packages.forEach(pkg => {
        data.push([
          pkg.name,
          pkg.linesCovered
        ]);
      });
    }

    this.chartData = data;
  }

  protected updateChartOptions(): void {
    this.chartOptions = {
      title: 'Coverage Distribution',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: [
        '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
        '#ffc107', '#ff9800', '#ff5722', '#f44336',
        '#2196f3', '#03a9f4', '#00bcd4', '#009688',
        '#673ab7', '#9c27b0', '#e91e63', '#9e9e9e'
      ],
      is3D: this.is3D,
      pieHole: this.isDonut ? this.donutHoleSize : 0,
      legend: {
        position: this.showLegend ? this.legendPosition : 'none',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      chartArea: {
        width: '80%',
        height: '80%'
      },
      tooltip: {
        showColorCode: true,
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      pieSliceText: 'label',
      sliceVisibilityThreshold: 0.02
    };
  }
}