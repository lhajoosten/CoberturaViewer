import { Component, OnInit, Input, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageData } from '../../../../core/models/coverage.model';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-treemap',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './treemap.component.html',
  styleUrls: ['./treemap.component.scss']
})
export class TreemapComponent implements OnInit, OnDestroy {
  @Input() coverageData: CoverageData | null = null;
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  chartType: ChartType = ChartType.TreeMap;
  chartData: any[] = [];
  chartOptions: any = {};
  chartColumns: string[] = ['ID', 'Parent', 'Size', 'Coverage'];
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
    if (!this.coverageData) {
      return;
    }

    const data: any[] = [];

    // Root node
    data.push(['Coverage', null, 0, this.coverageData.summary.lineCoverage]);

    // Add package nodes
    this.coverageData.packages.forEach(pkg => {
      data.push([
        pkg.name,
        'Coverage',
        pkg.linesValid,
        pkg.lineCoverage
      ]);

      // Add class nodes
      pkg.classes.forEach(cls => {
        data.push([
          `${pkg.name}.${cls.name}`,
          pkg.name,
          cls.lines.length,
          cls.lineCoverage
        ]);
      });
    });

    this.chartData = data;
  }

  private updateChartOptions(): void {
    this.chartOptions = {
      headerHeight: 0,
      fontFamily: 'Roboto, Arial, sans-serif',
      fontSize: 12,
      minColor: '#f44336',  // Red for low coverage
      midColor: '#ffeb3b',  // Yellow for medium coverage
      maxColor: '#4caf50',  // Green for high coverage
      headerColor: 'transparent',
      showScale: true,
      generateTooltip: (row: any, size: any, value: any) => {
        return (tooltipData: any) => {
          const id = tooltipData.row.c[0].v;
          const coverage = tooltipData.row.c[3].v.toFixed(1);
          const linesValid = tooltipData.row.c[2].v;

          return `
            <div style="background-color: ${this.isDarkTheme ? '#333' : 'white'}; 
                       color: ${this.isDarkTheme ? '#eee' : '#333'}; 
                       padding: 10px; 
                       border-radius: 4px; 
                       font-family: 'Roboto', sans-serif; 
                       box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="font-weight: bold; margin-bottom: 5px;">${id}</div>
              <div style="display: flex; margin-bottom: 5px;">
                <div style="flex: 1;">Coverage:</div>
                <div style="font-weight: bold; color: ${this.getColorForCoverage(parseFloat(coverage))}">
                  ${coverage}%
                </div>
              </div>
              ${linesValid ? `<div style="display: flex;">
                <div style="flex: 1;">Lines:</div>
                <div>${linesValid}</div>
              </div>` : ''}
            </div>
          `;
        };
      },
      highlightOnMouseOver: true,
      maxDepth: 2,
      maxPostDepth: 0,
      minHighlightColor: this.isDarkTheme ? '#555' : '#ccc',
      midHighlightColor: this.isDarkTheme ? '#777' : '#eee',
      maxHighlightColor: this.isDarkTheme ? '#999' : '#fff',
      useWeightedAverageForAggregation: true
    };
  }

  private getColorForCoverage(coverage: number): string {
    if (coverage >= 80) {
      return '#4caf50'; // Green
    } else if (coverage >= 60) {
      return '#ffeb3b'; // Yellow
    } else {
      return '#f44336'; // Red
    }
  }
}