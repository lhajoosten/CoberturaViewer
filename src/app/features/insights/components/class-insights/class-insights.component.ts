import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { ClassInfo, CoverageData } from '../../../../core/models/coverage.model';
import { InsightsNavComponent } from '../insights-navigation.component';

@Component({
  selector: 'app-class-insights',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GoogleChartsModule, InsightsNavComponent],
  templateUrl: './class-insights.component.html',
  styleUrls: ['./class-insights.component.scss']
})
export class ClassInsightsComponent implements OnInit {
  // Data
  coverageData: CoverageData | null = null;
  hasData = false;
  allClasses: { packageName: string, class: ClassInfo }[] = [];
  filteredClasses: { packageName: string, class: ClassInfo }[] = [];
  selectedClass: { packageName: string, class: ClassInfo } | null = null;
  isDarkTheme = false;

  // Filtering and sorting
  searchQuery = '';
  coverageFilter = 'all'; // 'high', 'medium', 'low', 'all'
  complexityFilter = 'all'; // 'high', 'medium', 'low', 'all'
  sortBy = 'coverage'; // 'name', 'coverage', 'size', 'complexity'
  sortOrder = 'desc'; // 'asc', 'desc'

  // Charts
  complexityBubbleChartType = ChartType.BubbleChart;
  complexityBubbleChartData: any[] = [];
  complexityBubbleChartOptions: any = {};

  coverageDistributionChartType = ChartType.ColumnChart;
  coverageDistributionChartData: any[][] = [];
  coverageDistributionChartOptions: any = {};

  classCoverageChartType = ChartType.PieChart;
  classCoverageChartData: any[][] = [];
  classCoverageChartOptions: any = {};

  constructor(
    private coverageStore: CoverageStoreService,
    private themeStore: ThemeStoreService
  ) { }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
      this.updateChartOptions();
    });

    // Get coverage data
    this.coverageStore.getCoverageData().subscribe(data => {
      this.coverageData = data;
      this.hasData = !!data;

      if (data) {
        // Extract all classes with their package info
        this.allClasses = [];
        data.packages.forEach(pkg => {
          pkg.classes.forEach(cls => {
            this.allClasses.push({
              packageName: pkg.name,
              class: cls
            });
          });
        });

        // Apply initial filtering and sorting
        this.applyFilters();

        // Prepare charts
        this.prepareCharts();
        this.updateChartOptions();
      }
    });
  }

  selectClass(classInfo: { packageName: string, class: ClassInfo }): void {
    this.selectedClass = classInfo;

    // Prepare class-specific charts
    this.prepareClassCoverageChart();
    this.updateChartOptions();
  }

  applyFilters(): void {
    // Start with all classes
    this.filteredClasses = [...this.allClasses];

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      this.filteredClasses = this.filteredClasses.filter(item =>
        item.class.name.toLowerCase().includes(query) ||
        item.packageName.toLowerCase().includes(query)
      );
    }

    // Apply coverage filter
    if (this.coverageFilter !== 'all') {
      this.filteredClasses = this.filteredClasses.filter(item => {
        if (this.coverageFilter === 'high') return item.class.lineCoverage >= 80;
        if (this.coverageFilter === 'medium') return item.class.lineCoverage >= 60 && item.class.lineCoverage < 80;
        if (this.coverageFilter === 'low') return item.class.lineCoverage < 60;
        return true;
      });
    }

    // Apply complexity filter
    if (this.complexityFilter !== 'all') {
      this.filteredClasses = this.filteredClasses.filter(item => {
        const complexity = item.class.complexity || 0;
        if (this.complexityFilter === 'high') return complexity >= 30;
        if (this.complexityFilter === 'medium') return complexity >= 15 && complexity < 30;
        if (this.complexityFilter === 'low') return complexity < 15 && complexity > 0;
        return true;
      });
    }

    // Apply sorting
    this.sortClasses();

    // Update charts based on filtered data
    this.prepareComplexityBubbleChart();
    this.prepareCoverageDistributionChart();

    // If we have a selectedClass and it's been filtered out, clear the selection
    if (this.selectedClass && !this.filteredClasses.some(c =>
      c.packageName === this.selectedClass?.packageName &&
      c.class.name === this.selectedClass?.class.name)) {
      this.selectedClass = null;
    }
  }

  sortClasses(): void {
    this.filteredClasses.sort((a, b) => {
      if (this.sortBy === 'name') {
        const fullNameA = `${a.packageName}.${a.class.name}`;
        const fullNameB = `${b.packageName}.${b.class.name}`;
        return this.sortOrder === 'asc'
          ? fullNameA.localeCompare(fullNameB)
          : fullNameB.localeCompare(fullNameA);
      }

      if (this.sortBy === 'coverage') {
        return this.sortOrder === 'asc'
          ? a.class.lineCoverage - b.class.lineCoverage
          : b.class.lineCoverage - a.class.lineCoverage;
      }

      if (this.sortBy === 'size') {
        return this.sortOrder === 'asc'
          ? a.class.linesValid - b.class.linesValid
          : b.class.linesValid - a.class.linesValid;
      }

      if (this.sortBy === 'complexity') {
        const complexityA = a.class.complexity || 0;
        const complexityB = b.class.complexity || 0;
        return this.sortOrder === 'asc'
          ? complexityA - complexityB
          : complexityB - complexityA;
      }

      return 0;
    });
  }

  updateSorting(field: string): void {
    if (this.sortBy === field) {
      // Toggle sorting order
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Change sort field
      this.sortBy = field;
      // Default to descending for coverage and complexity, ascending for name
      this.sortOrder = field === 'name' ? 'asc' : 'desc';
    }

    this.sortClasses();
  }

  prepareComplexityBubbleChart(): void {
    // Prepare data for bubble chart
    this.complexityBubbleChartData = [
      ['ID', 'Coverage (%)', 'Complexity', 'Class', 'Size (Lines)']
    ];

    // Add data points
    this.filteredClasses.forEach(item => {
      const complexity = item.class.complexity || 1;
      const size = Math.max(item.class.linesValid, 1);
      const normalizedSize = Math.sqrt(size) * 5; // Scale for better visualization

      this.complexityBubbleChartData.push([
        `${item.packageName}.${item.class.name}`,
        item.class.lineCoverage,
        complexity,
        item.class.name,
        normalizedSize
      ]);
    });
  }

  prepareCoverageDistributionChart(): void {
    // Count classes by coverage range
    const distribution = {
      excellent: 0, // 90-100%
      good: 0,      // 80-90%
      adequate: 0,  // 60-80%
      low: 0,       // 30-60%
      poor: 0       // 0-30%
    };

    this.filteredClasses.forEach(item => {
      const coverage = item.class.lineCoverage;
      if (coverage >= 90) distribution.excellent++;
      else if (coverage >= 80) distribution.good++;
      else if (coverage >= 60) distribution.adequate++;
      else if (coverage >= 30) distribution.low++;
      else distribution.poor++;
    });

    // Prepare chart data
    this.coverageDistributionChartData = [
      ['Coverage Range', 'Number of Classes', { role: 'style' }],
      ['Excellent (90-100%)', distribution.excellent, '#4caf50'],
      ['Good (80-90%)', distribution.good, '#8bc34a'],
      ['Adequate (60-80%)', distribution.adequate, '#ffb300'],
      ['Low (30-60%)', distribution.low, '#ff9800'],
      ['Poor (0-30%)', distribution.poor, '#f44336']
    ];
  }

  prepareClassCoverageChart(): void {
    if (!this.selectedClass) return;

    // Prepare data for line coverage distribution
    this.classCoverageChartData = [
      ['Status', 'Lines'],
      ['Covered', this.selectedClass.class.linesCovered],
      ['Uncovered', this.selectedClass.class.linesValid - this.selectedClass.class.linesCovered]
    ];
  }

  updateChartOptions(): void {
    // Complexity Bubble Chart options
    this.complexityBubbleChartOptions = {
      title: 'Coverage vs Complexity',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#4caf50', '#ff9800', '#f44336'],
      hAxis: {
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
      vAxis: {
        title: 'Complexity',
        titleTextStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        },
        minValue: 0
      },
      bubble: {
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333',
          fontSize: 11
        }
      },
      sizeAxis: {
        minValue: 0,
        maxSize: 25
      },
      chartArea: {
        width: '80%',
        height: '80%'
      },
      legend: {
        position: 'none'
      },
      tooltip: {
        isHtml: true,
        trigger: 'focus',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      }
    };

    // Coverage Distribution Chart options
    this.coverageDistributionChartOptions = {
      title: 'Coverage Distribution',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      legend: { position: 'none' },
      hAxis: {
        title: 'Coverage Range',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      vAxis: {
        title: 'Number of Classes',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      chartArea: {
        width: '80%',
        height: '80%'
      },
      tooltip: {
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      }
    };

    // Class Coverage Chart options
    this.classCoverageChartOptions = {
      title: 'Line Coverage',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
      colors: ['#4caf50', '#f44336'],
      legend: {
        position: 'bottom',
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      chartArea: {
        width: '80%',
        height: '80%'
      },
      tooltip: {
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      },
      pieHole: 0.4 // Makes it a donut chart
    };
  }

  prepareCharts(): void {
    this.prepareComplexityBubbleChart();
    this.prepareCoverageDistributionChart();
    if (this.selectedClass) {
      this.prepareClassCoverageChart();
    }
  }

  toggleCoverageFilter(filter: string): void {
    this.coverageFilter = filter;
    this.applyFilters();
  }

  toggleComplexityFilter(filter: string): void {
    this.complexityFilter = filter;
    this.applyFilters();
  }

  toggleSortOrder(order: string): void {
    this.sortOrder = order;
    this.sortClasses();
  }

  toggleSortField(field: string): void {
    this.sortBy = field;
    this.sortOrder = field === 'name' ? 'asc' : 'desc'; // Default to descending for metrics
    this.sortClasses();
  }

  toggleClassSelection(classInfo: { packageName: string, class: ClassInfo }): void {
    if (this.selectedClass &&
      this.selectedClass.packageName === classInfo.packageName &&
      this.selectedClass.class.name === classInfo.class.name) {
      this.selectedClass = null; // Deselect if already selected
    } else {
      this.selectClass(classInfo); // Select the new class
    }
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.coverageFilter = 'all';
    this.complexityFilter = 'all';
    this.sortBy = 'coverage';
    this.sortOrder = 'desc';
    this.applyFilters();
  }

  getCoverageColor(coverage: number): string {
    if (coverage >= 80) return '#4caf50'; // Green
    if (coverage >= 60) return '#ffb300'; // Yellow
    if (coverage >= 30) return '#ff9800'; // Orange
    return '#f44336'; // Red
  }

  getComplexityColor(complexity: number): string {
    if (complexity >= 30) return '#f44336'; // Red
    if (complexity >= 15) return '#ff9800'; // Orange
    return '#4caf50'; // Green
  }

  getCoverageTextColor(coverage: number): string {
    return coverage >= 60 ? '#ffffff' : '#000000'; // White for good coverage, black for poor coverage
  }

  getComplexityTextColor(complexity: number): string {
    return complexity >= 15 ? '#ffffff' : '#000000'; // White for high complexity, black for low complexity
  }

  getClassName(classInfo: { packageName: string, class: ClassInfo }): string {
    return `${classInfo.packageName}.${classInfo.class.name}`;
  }

  getClassSize(classInfo: { packageName: string, class: ClassInfo }): string {
    return `${classInfo.class.linesValid} lines`;
  }

  getClassComplexity(classInfo: { packageName: string, class: ClassInfo }): string {
    return classInfo.class.complexity ? `${classInfo.class.complexity}` : 'N/A';
  }

  getClassCoverage(classInfo: { packageName: string, class: ClassInfo }): string {
    return `${classInfo.class.lineCoverage}%`;
  }

  getClassStatus(classInfo: { packageName: string, class: ClassInfo }): string {
    return classInfo.class.lineCoverage >= 60 ? 'Good' : 'Needs Improvement';
  }

  getClassStatusColor(classInfo: { packageName: string, class: ClassInfo }): string {
    return classInfo.class.lineCoverage >= 60 ? '#4caf50' : '#f44336'; // Green for good, red for needs improvement
  }

  getClassStatusTextColor(classInfo: { packageName: string, class: ClassInfo }): string {
    return '#ffffff'; // White text for both statuses
  }

  getClassStatusTooltip(classInfo: { packageName: string, class: ClassInfo }): string {
    if (classInfo.class.lineCoverage >= 80) return 'Excellent Coverage';
    if (classInfo.class.lineCoverage >= 60) return 'Good Coverage';
    if (classInfo.class.lineCoverage >= 30) return 'Needs Improvement';
    return 'Critical - Low Coverage';
  }
}