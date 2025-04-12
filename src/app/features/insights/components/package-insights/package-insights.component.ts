import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { FormsModule } from '@angular/forms';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { CoverageData, PackageInfo, ClassInfo } from '../../../../core/models/coverage.model';
import { InsightsNavComponent } from '../insights-navigation.component';

@Component({
  selector: 'app-package-insights',
  standalone: true,
  imports: [CommonModule, GoogleChartsModule, FormsModule, InsightsNavComponent],
  templateUrl: './package-insights.component.html',
  styleUrls: ['./package-insights.component.scss']
})
export class PackageInsightsComponent implements OnInit {
  coverageData: CoverageData | null = null;
  hasData = false;
  isDarkTheme = false;

  // Selected items
  selectedPackage: PackageInfo | null = null;
  selectedClass: ClassInfo | null = null;

  // Package chart
  packageChartType = ChartType.BarChart;
  packageChartData: any[] = [];
  packageChartOptions: any = {};

  // Class chart
  classChartType = ChartType.BarChart;
  classChartData: any[] = [];
  classChartOptions: any = {};

  // Search & Filter
  searchQuery = '';
  coverageFilter = 'all'; // 'high', 'medium', 'low', 'all'
  sortBy = 'name'; // 'name', 'coverage', 'size'
  sortOrder = 'asc'; // 'asc', 'desc'

  filteredPackages: PackageInfo[] = [];
  filteredClasses: ClassInfo[] = [];

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

      if (this.hasData && data) {
        // Set initial filtered packages
        this.applyFilters();

        // Select first package by default if available
        if (data.packages.length > 0) {
          this.selectPackage(data.packages[0]);
        }
      }
    });
  }

  selectPackage(pkg: PackageInfo): void {
    this.selectedPackage = pkg;
    this.selectedClass = null;

    // Filter classes in this package
    if (pkg.classes.length > 0) {
      this.filterClasses();

      // Prepare chart data
      this.prepareClassChartData();
      this.updateChartOptions();
    }
  }

  selectClass(cls: ClassInfo): void {
    this.selectedClass = cls;

    // Prepare chart data
    this.prepareClassDetailsChart();
    this.updateChartOptions();
  }

  applyFilters(): void {
    if (!this.coverageData) return;

    // Filter packages
    this.filteredPackages = [...this.coverageData.packages];

    // Apply coverage filter
    if (this.coverageFilter !== 'all') {
      this.filteredPackages = this.filteredPackages.filter(pkg => {
        if (this.coverageFilter === 'high') return pkg.lineCoverage >= 80;
        if (this.coverageFilter === 'medium') return pkg.lineCoverage >= 60 && pkg.lineCoverage < 80;
        if (this.coverageFilter === 'low') return pkg.lineCoverage < 60;
        return true;
      });
    }

    // Apply search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      this.filteredPackages = this.filteredPackages.filter(pkg =>
        pkg.name.toLowerCase().includes(query));
    }

    // Apply sorting
    this.filteredPackages = this.sortPackages(this.filteredPackages);

    // Prepare package chart data
    this.preparePackageChartData();
    this.updateChartOptions();

    // If selected package is filtered out, select first available
    if (this.selectedPackage &&
      !this.filteredPackages.find(p => p.name === this.selectedPackage!.name)) {
      if (this.filteredPackages.length > 0) {
        this.selectPackage(this.filteredPackages[0]);
      } else {
        this.selectedPackage = null;
        this.selectedClass = null;
      }
    }
  }

  filterClasses(): void {
    if (!this.selectedPackage) return;

    // Start with all classes in the package
    this.filteredClasses = [...this.selectedPackage.classes];

    // Apply coverage filter
    if (this.coverageFilter !== 'all') {
      this.filteredClasses = this.filteredClasses.filter(cls => {
        if (this.coverageFilter === 'high') return cls.lineCoverage >= 80;
        if (this.coverageFilter === 'medium') return cls.lineCoverage >= 60 && cls.lineCoverage < 80;
        if (this.coverageFilter === 'low') return cls.lineCoverage < 60;
        return true;
      });
    }

    // Apply search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      this.filteredClasses = this.filteredClasses.filter(cls =>
        cls.name.toLowerCase().includes(query));
    }

    // Apply sorting
    this.filteredClasses = this.sortClasses(this.filteredClasses);
  }

  sortPackages(packages: PackageInfo[]): PackageInfo[] {
    return [...packages].sort((a, b) => {
      if (this.sortBy === 'name') {
        return this.sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (this.sortBy === 'coverage') {
        return this.sortOrder === 'asc'
          ? a.lineCoverage - b.lineCoverage
          : b.lineCoverage - a.lineCoverage;
      } else if (this.sortBy === 'size') {
        return this.sortOrder === 'asc'
          ? a.linesValid - b.linesValid
          : b.linesValid - a.linesValid;
      }
      return 0;
    });
  }

  sortClasses(classes: ClassInfo[]): ClassInfo[] {
    return [...classes].sort((a, b) => {
      if (this.sortBy === 'name') {
        return this.sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (this.sortBy === 'coverage') {
        return this.sortOrder === 'asc'
          ? a.lineCoverage - b.lineCoverage
          : b.lineCoverage - a.lineCoverage;
      } else if (this.sortBy === 'size') {
        return this.sortOrder === 'asc'
          ? a.linesValid - b.linesValid
          : b.linesValid - a.linesValid;
      }
      return 0;
    });
  }

  updateSorting(sortKey: string): void {
    if (this.sortBy === sortKey) {
      // Toggle direction
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // New sort field
      this.sortBy = sortKey;
      this.sortOrder = 'asc';
    }

    this.applyFilters();
  }

  preparePackageChartData(): void {
    if (!this.filteredPackages.length) return;

    this.packageChartData = [
      ['Package', 'Coverage (%)', { role: 'style' }, { role: 'annotation' }]
    ];

    // Add top N packages for clarity (max 10)
    const topPackages = [...this.filteredPackages]
      .sort((a, b) => a.lineCoverage - b.lineCoverage)
      .slice(0, 10);

    topPackages.forEach(pkg => {
      // Color based on coverage
      let color = '#f44336'; // red for low coverage
      if (pkg.lineCoverage >= 80) {
        color = '#4caf50'; // green for high coverage
      } else if (pkg.lineCoverage >= 60) {
        color = '#ffb300'; // amber for medium coverage
      }

      this.packageChartData.push([
        pkg.name,
        pkg.lineCoverage,
        color,
        pkg.lineCoverage.toFixed(1) + '%'
      ]);
    });
  }

  prepareClassChartData(): void {
    if (!this.selectedPackage || !this.filteredClasses.length) return;

    this.classChartData = [
      ['Class', 'Coverage (%)', { role: 'style' }, { role: 'annotation' }]
    ];

    // Add top N classes for clarity (max 10)
    const topClasses = [...this.filteredClasses]
      .sort((a, b) => a.lineCoverage - b.lineCoverage)
      .slice(0, 10);

    topClasses.forEach(cls => {
      // Color based on coverage
      let color = '#f44336'; // red for low coverage
      if (cls.lineCoverage >= 80) {
        color = '#4caf50'; // green for high coverage
      } else if (cls.lineCoverage >= 60) {
        color = '#ffb300'; // amber for medium coverage
      }

      this.classChartData.push([
        cls.name,
        cls.lineCoverage,
        color,
        cls.lineCoverage.toFixed(1) + '%'
      ]);
    });
  }

  prepareClassDetailsChart(): void {
    if (!this.selectedClass) return;

    // Here we could add more detailed charts about the selected class
    // For example, covered vs uncovered lines, branches, etc.
  }

  updateChartOptions(): void {
    // Package chart options
    this.packageChartOptions = {
      title: 'Package Coverage',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
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
        title: 'Package',
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

    // Class chart options
    this.classChartOptions = {
      title: 'Class Coverage',
      titleTextStyle: {
        color: this.isDarkTheme ? '#e0e0e0' : '#333333',
        fontSize: 16,
        bold: true
      },
      backgroundColor: this.isDarkTheme ? '#1e1e1e' : '#ffffff',
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

  getCoverageClass(coverage: number): string {
    if (coverage >= 80) return 'high-coverage';
    if (coverage >= 60) return 'medium-coverage';
    return 'low-coverage';
  }

  getSizeLabel(lineCount: number): string {
    if (lineCount >= 500) return 'Large';
    if (lineCount >= 200) return 'Medium';
    return 'Small';
  }

  getSizeClass(lineCount: number): string {
    if (lineCount >= 500) return 'large-size';
    if (lineCount >= 200) return 'medium-size';
    return 'small-size';
  }
}