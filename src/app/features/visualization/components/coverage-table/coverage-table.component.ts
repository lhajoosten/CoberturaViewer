import { Component, OnInit, Input, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageData } from '../../../../core/models/coverage.model';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-coverage-table',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule],
  templateUrl: './coverage-table.component.html',
  styleUrls: ['./coverage-table.component.scss']
})
export class CoverageTableComponent implements OnInit, OnDestroy {
  @ViewChild('chartContainer') chartContainer!: ElementRef;
  @Input() coverageData: CoverageData | null = null;

  chartType: ChartType = ChartType.Table;
  chartData: any[] = [];
  chartOptions: any = {};
  chartColumns = [
    'Name',
    'Line Coverage (%)',
    'Branch Coverage (%)',
    'Lines Valid',
    'Lines Covered'
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

  getExportData(): any[][] {
    if (!this.coverageData) {
      return [];
    }

    // Create header row
    const exportData: any[][] = [
      ['Package', 'Class', 'Line Coverage (%)', 'Branch Coverage (%)', 'Complexity', 'Lines']
    ];

    // Add data rows
    this.coverageData.packages.forEach(pkg => {
      pkg.classes.forEach(cls => {
        exportData.push([
          pkg.name,
          cls.name,
          cls.lineCoverage * 100,
          cls.branchCoverage * 100,
          cls.complexity || 0,
          cls.lines.length
        ]);
      });
    });

    return exportData;
  }

  private prepareChartData(): void {
    if (!this.coverageData) {
      return;
    }

    const data: any[] = [];

    // Add summary row
    data.push([
      'Overall Summary',
      this.coverageData.summary.lineCoverage,
      this.coverageData.summary.branchCoverage || 0,
      this.coverageData.summary.linesValid,
      this.coverageData.summary.linesCovered
    ]);

    // Add package rows
    this.coverageData.packages.forEach(pkg => {
      data.push([
        pkg.name,
        pkg.lineCoverage,
        pkg.branchCoverage || 0,
        pkg.linesValid,
        pkg.linesCovered
      ]);

      // Add class rows (indented)
      pkg.classes.forEach(cls => {
        data.push([
          `  ${cls.name}`,
          cls.lineCoverage,
          cls.branchCoverage || 0,
          cls.linesValid,
          cls.linesCovered
        ]);
      });
    });

    this.chartData = data;
  }

  private updateChartOptions(): void {
    this.chartOptions = {
      allowHtml: true,
      showRowNumber: false,
      width: '100%',
      height: '100%',
      cssClassNames: {
        headerRow: this.isDarkTheme ? 'table-header-dark' : 'table-header',
        tableRow: this.isDarkTheme ? 'table-row-dark' : 'table-row',
        oddTableRow: this.isDarkTheme ? 'table-row-odd-dark' : 'table-row-odd',
        selectedTableRow: this.isDarkTheme ? 'table-row-selected-dark' : 'table-row-selected',
        hoverTableRow: this.isDarkTheme ? 'table-row-hover-dark' : 'table-row-hover'
      },
      frozenColumns: 1,
      sort: 'disable',
      alternatingRowStyle: true,
      formatters: [
        {
          type: 'ColorFormat',
          column: 1, // Line Coverage
          ranges: [
            { from: 0, to: 60, color: '#f44336' },
            { from: 60, to: 80, color: '#ffeb3b' },
            { from: 80, to: 101, color: '#4caf50' }
          ]
        },
        {
          type: 'ColorFormat',
          column: 2, // Branch Coverage
          ranges: [
            { from: 0, to: 60, color: '#f44336' },
            { from: 60, to: 80, color: '#ffeb3b' },
            { from: 80, to: 101, color: '#4caf50' }
          ]
        }
      ]
    };
  }
}