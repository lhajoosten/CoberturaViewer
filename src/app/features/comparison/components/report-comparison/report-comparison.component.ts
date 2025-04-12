import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { ComparisonService, ComparisonResult } from '../../services/comparison.service';
import { CoverageData } from '../../../../core/models/coverage.model';
import { ToastService } from '../../../../core/services/utils/toast.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-report-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule, GoogleChartsModule, RouterModule],
  templateUrl: './report-comparison.component.html',
  styleUrls: ['./report-comparison.component.scss']
})
export class ReportComparisonComponent implements OnInit {
  currentReport: CoverageData | null = null;
  storedReports: any[] = [];
  selectedReportId: string | null = null;
  comparisonResult: ComparisonResult | null = null;
  isDarkTheme = false;
  compareMode = 'coverage'; // 'coverage' or 'structure'

  // Charts
  diffChartType: ChartType = ChartType.ColumnChart;
  diffChartData: any[] = [];
  diffChartOptions: any = {};
  diffChartWidth = 1000;
  diffChartHeight = 300;

  packageChangesType: ChartType = ChartType.BarChart;
  packageChangesData: any[] = [];
  packageChangesOptions: any = {};
  packageChangesWidth = 1000;
  packageChangesHeight = 300;

  constructor(
    private coverageStore: CoverageStoreService,
    private themeStore: ThemeStoreService,
    private comparisonService: ComparisonService,
    private ToastService: ToastService
  ) { }

  ngOnInit(): void {
    // Load current report
    this.coverageStore.getCoverageData().subscribe(data => {
      this.currentReport = data;
    });

    // Subscribe to theme changes
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
      this.updateChartOptions();
    });

    // Load stored reports from localStorage
    this.loadStoredReports();
  }

  getClassCount(data: CoverageData): number {
    if (!data) return 0;

    let count = 0;
    data.packages.forEach(pkg => {
      count += pkg.classes.length;
    });

    return count;
  }

  loadStoredReports(): void {
    try {
      // Check for stored reports in localStorage
      const reportsString = localStorage.getItem('saved-reports');

      if (reportsString) {
        this.storedReports = JSON.parse(reportsString);
      }
    } catch (error) {
      console.error('Error loading stored reports:', error);
      this.storedReports = [];
    }
  }

  saveCurrentReport(): void {
    if (!this.currentReport) {
      this.ToastService.showError('No Report', 'There is no current report to save');
      return;
    }

    // Create a name for the report
    const reportName = prompt('Enter a name for this report:',
      `Coverage Report ${new Date().toLocaleString()}`);

    if (!reportName) return;

    try {
      // Generate a unique ID
      const reportId = Date.now().toString();

      // Save report to local storage
      const reportData = {
        id: reportId,
        name: reportName,
        date: new Date().toISOString(),
        summary: this.currentReport.summary,
        data: this.currentReport
      };

      // Add to stored reports
      this.storedReports.push(reportData);

      // Save to localStorage
      localStorage.setItem('saved-reports', JSON.stringify(this.storedReports));

      this.ToastService.showSuccess('Report Saved', 'The report has been saved for future comparison');
    } catch (error) {
      console.error('Error saving report:', error);
      this.ToastService.showError('Save Error', 'Failed to save the report');
    }
  }

  deleteStoredReport(id: string): void {
    const index = this.storedReports.findIndex(r => r.id === id);

    if (index !== -1) {
      if (confirm('Are you sure you want to delete this saved report?')) {
        this.storedReports.splice(index, 1);
        localStorage.setItem('saved-reports', JSON.stringify(this.storedReports));

        // Clear comparison if the deleted report was selected
        if (this.selectedReportId === id) {
          this.selectedReportId = null;
          this.comparisonResult = null;
        }
      }
    }
  }

  compareWithReport(id: string): void {
    if (!this.currentReport) {
      this.ToastService.showError('No Current Report', 'Please upload a coverage report first');
      return;
    }

    const storedReport = this.storedReports.find(r => r.id === id);
    if (!storedReport) {
      this.ToastService.showError('Report Not Found', 'The selected report could not be found');
      return;
    }

    try {
      // Compare current report with stored report
      this.selectedReportId = id;
      this.comparisonResult = this.comparisonService.compareCoverageData(
        storedReport.data,
        this.currentReport
      );

      // Update charts
      this.updateCharts();

      this.ToastService.showSuccess('Comparison Complete', 'Reports have been compared successfully');
    } catch (error) {
      console.error('Error comparing reports:', error);
      this.ToastService.showError('Comparison Error', 'Failed to compare the reports');
    }
  }

  toggleCompareMode(mode: 'coverage' | 'structure'): void {
    this.compareMode = mode;
  }

  updateCharts(): void {
    if (!this.comparisonResult) return;

    // Update summary diff chart
    this.updateDiffChart();

    // Update package changes chart
    this.updatePackageChangesChart();
  }

  private updateDiffChart(): void {
    const summary = this.comparisonResult!.summary;

    this.diffChartData = [
      ['Metric', 'Change (%)'],
      ['Line Coverage', summary.lineCoverageChange],
      ['Branch Coverage', summary.branchCoverageChange],
      ['Method Coverage', summary.methodCoverageChange]
    ];

    this.diffChartOptions = {
      title: 'Coverage Change',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#4caf50', '#f44336'],
      hAxis: {
        title: 'Metric',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      vAxis: {
        title: 'Change (%)',
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
          fontSize: 12,
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        alwaysOutside: true
      },
      chartArea: {
        width: '80%',
        height: '70%'
      },
      colorAxis: {
        values: [-100, 0, 100],
        colors: ['#f44336', '#ffffff', '#4caf50']
      },
      animation: {
        startup: true,
        duration: 1000,
        easing: 'out'
      }
    };
  }

  private updatePackageChangesChart(): void {
    const { mostImprovedPackages, mostDeclinedPackages } = this.comparisonResult!.summary;

    // Combine improved and declined
    const allChanges = [
      ...mostImprovedPackages.map(p => [p.name, p.change]),
      ...mostDeclinedPackages.map(p => [p.name, p.change])
    ];

    // Sort by absolute change
    allChanges.sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number));

    // Take top 10
    const topChanges = allChanges.slice(0, 10);

    // Prepare chart data
    this.packageChangesData = [
      ['Package', 'Coverage Change (%)'],
      ...topChanges
    ];

    this.packageChangesOptions = {
      title: 'Package Coverage Changes',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#4caf50', '#f44336'],
      hAxis: {
        title: 'Change (%)',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        minValue: -50,
        maxValue: 50
      },
      vAxis: {
        title: 'Package',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      legend: { position: 'none' },
      chartArea: {
        width: '60%',
        height: '80%'
      },
      animation: {
        startup: true,
        duration: 1000,
        easing: 'out'
      },
      bars: 'horizontal',
      bar: { groupWidth: '80%' },
      annotations: {
        alwaysOutside: false,
        textStyle: {
          fontSize: 12,
          auraColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff'
        }
      }
    };
  }

  private updateChartOptions(): void {
    if (this.comparisonResult) {
      this.updateDiffChart();
      this.updatePackageChangesChart();
    }
  }

  getChangeClass(change: number | undefined): string {
    if (!change || change === 0) return 'neutral-change';
    return change > 0 ? 'positive-change' : 'negative-change';
  }

  formatChange(change: number | undefined): string {
    if (change === undefined) return 'N/A';
    return (change > 0 ? '+' : '') + change.toFixed(2) + '%';
  }
}