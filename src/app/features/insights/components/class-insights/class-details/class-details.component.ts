import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ChartType, GoogleChartsModule } from 'angular-google-charts';
import { CoverageData, ClassInfo } from '../../../../../core/models/coverage.model';
import { CoverageStoreService } from '../../../../../core/services/store/coverage-store.service';
import { ThemeStoreService } from '../../../../../core/services/store/theme-store.service';

interface ClassLine {
  number: number;
  hits: number;
  branch?: boolean;
  condition?: string;
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
}

@Component({
  selector: 'app-class-details',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, GoogleChartsModule],
  templateUrl: './class-details.component.html',
  styleUrls: ['./class-details.component.scss']
})
export class ClassDetailsComponent implements OnInit {
  // Data
  coverageData: CoverageData | null = null;
  hasData = false;
  classInfo: { packageName: string, class: ClassInfo } | null = null;
  isDarkTheme = false;
  className = '';

  // Lines data
  allLines: ClassLine[] = [];
  filteredLines: ClassLine[] = [];
  lineFilter = 'all'; // 'all', 'covered', 'uncovered'

  // Mock code content (in a real app, this would come from an API)
  codeContent: string[] = [];

  // Recommendations
  recommendations: Recommendation[] = [];

  // Charts
  coverageChartType = ChartType.PieChart;
  coverageChartData: any[][] = [];
  coverageChartOptions: any = {};

  branchChartType = ChartType.PieChart;
  branchChartData: any[][] = [];
  branchChartOptions: any = {};

  constructor(
    private route: ActivatedRoute,
    private coverageStore: CoverageStoreService,
    private themeStore: ThemeStoreService
  ) { }

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeStore.isDarkTheme$.subscribe((isDark: boolean) => {
      this.isDarkTheme = isDark;
      this.updateChartOptions();
    });

    // Get class name from route parameter
    this.route.paramMap.subscribe(params => {
      this.className = params.get('className') || '';
      this.loadClassData();
    });
  }

  loadClassData(): void {
    if (!this.className) return;

    // Get coverage data
    this.coverageStore.getCoverageData().subscribe((data) => {
      this.coverageData = data;
      this.hasData = !!data;

      if (data) {
        // Find the class
        data.packages.forEach((pkg: { classes: any[]; name: any; }) => {
          const foundClass = pkg.classes.find((cls: { name: string; }) => cls.name === this.className);
          if (foundClass) {
            this.classInfo = {
              packageName: pkg.name,
              class: foundClass
            };
          }
        });

        if (this.classInfo) {
          // Initialize lines data
          this.initializeLines();

          // Apply initial line filter
          this.applyLineFilter();

          // Generate mock code content
          this.generateMockCode();

          // Generate recommendations
          this.generateRecommendations();

          // Prepare charts
          this.prepareCharts();
          this.updateChartOptions();
        }
      }
    });
  }

  initializeLines(): void {
    if (!this.classInfo?.class.lines) {
      // If no lines data provided, create mock data based on linesValid
      this.allLines = [];
      const linesValid = this.classInfo?.class.linesValid || 0;
      const linesCovered = this.classInfo?.class.linesCovered || 0;

      // Calculate approximately how many lines should be uncovered
      const uncoveredCount = linesValid - linesCovered;

      for (let i = 1; i <= linesValid; i++) {
        // Make some lines uncovered based on the ratio
        const isUncovered = i <= uncoveredCount;
        this.allLines.push({
          number: i,
          hits: isUncovered ? 0 : Math.floor(Math.random() * 5) + 1,
          branch: i % 7 === 0 // Make every 7th line a branch point for demonstration
        });
      }
    } else {
      this.allLines = this.classInfo.class.lines;
    }
  }

  applyLineFilter(): void {
    if (this.lineFilter === 'all') {
      this.filteredLines = [...this.allLines];
    } else if (this.lineFilter === 'covered') {
      this.filteredLines = this.allLines.filter(line => line.hits > 0);
    } else if (this.lineFilter === 'uncovered') {
      this.filteredLines = this.allLines.filter(line => line.hits === 0);
    }
  }

  generateMockCode(): void {
    // In a real app, this would fetch the actual source code
    // Here we'll just create placeholder code lines
    this.codeContent = [];
    const linesCount = this.allLines.length;

    for (let i = 0; i < linesCount; i++) {
      if (i === 0) {
        this.codeContent.push(`public class ${this.className} {`);
      } else if (i === linesCount - 1) {
        this.codeContent.push('}');
      } else if (i % 7 === 0) {
        this.codeContent.push(`    if (condition${i}) {`);
      } else if (i % 7 === 1) {
        this.codeContent.push(`        doSomething();`);
      } else if (i % 7 === 2) {
        this.codeContent.push(`    } else {`);
      } else if (i % 7 === 3) {
        this.codeContent.push(`        doSomethingElse();`);
      } else if (i % 7 === 4) {
        this.codeContent.push(`    }`);
      } else if (i % 5 === 0) {
        this.codeContent.push(`    private void method${i}() {`);
      } else {
        this.codeContent.push(`    // Code line ${i + 1}`);
      }
    }
  }

  getCodeLine(lineNumber: number): string {
    // Line numbers in coverage data are typically 1-based
    // Array indices are 0-based
    const index = lineNumber - 1;
    if (index >= 0 && index < this.codeContent.length) {
      return this.codeContent[index];
    }
    return ''; // Return empty string if line not found
  }

  generateRecommendations(): void {
    this.recommendations = [];

    if (!this.classInfo) return;

    const coverage = this.classInfo.class.lineCoverage;
    const complexity = this.classInfo.class.complexity || 0;
    const size = this.classInfo.class.linesValid;

    // Generate recommendations based on coverage
    if (coverage < 50) {
      this.recommendations.push({
        title: 'Improve Test Coverage',
        description: `This class has only ${coverage.toFixed(0)}% test coverage. Add more tests to verify its functionality.`,
        priority: 'high',
        icon: 'fas fa-exclamation-triangle'
      });
    } else if (coverage < 70) {
      this.recommendations.push({
        title: 'Increase Test Coverage',
        description: `Consider adding more tests to reach at least 80% coverage (currently at ${coverage.toFixed(0)}%).`,
        priority: 'medium',
        icon: 'fas fa-exclamation-circle'
      });
    }

    // Generate recommendations based on complexity
    if (complexity > 30) {
      this.recommendations.push({
        title: 'Reduce Complexity',
        description: `This class has a high complexity of ${complexity.toFixed(0)}. Consider refactoring to simplify logic and improve maintainability.`,
        priority: 'high',
        icon: 'fas fa-project-diagram'
      });
    } else if (complexity > 15) {
      this.recommendations.push({
        title: 'Consider Refactoring',
        description: `The complexity of ${complexity.toFixed(0)} suggests this class might benefit from some refactoring.`,
        priority: 'medium',
        icon: 'fas fa-code-branch'
      });
    }

    // Generate recommendations based on size
    if (size > 500) {
      this.recommendations.push({
        title: 'Class Too Large',
        description: `This class has ${size} lines of code. Consider breaking it down into smaller, more focused classes.`,
        priority: 'high',
        icon: 'fas fa-file-code'
      });
    } else if (size > 200) {
      this.recommendations.push({
        title: 'Consider Splitting Class',
        description: `At ${size} lines, this class might be doing too much. Consider the Single Responsibility Principle.`,
        priority: 'medium',
        icon: 'fas fa-file-alt'
      });
    }

    // Add branch coverage recommendation if applicable
    if (this.classInfo.class.branchCoverage !== undefined && this.classInfo.class.branchCoverage < 70) {
      this.recommendations.push({
        title: 'Improve Branch Coverage',
        description: `Branch coverage is only ${this.classInfo.class.branchCoverage.toFixed(0)}%. Add tests for different branch conditions.`,
        priority: 'medium',
        icon: 'fas fa-code-branch'
      });
    }

    // Add a recommendation about uncovered lines if there are any
    const uncoveredCount = this.allLines.filter(line => line.hits === 0).length;
    if (uncoveredCount > 0) {
      this.recommendations.push({
        title: 'Address Uncovered Lines',
        description: `There are ${uncoveredCount} uncovered lines. Focus on writing tests for these specific areas.`,
        priority: uncoveredCount > 10 ? 'high' : 'medium',
        icon: 'fas fa-list-ol'
      });
    }
  }

  prepareCharts(): void {
    if (!this.classInfo) return;

    // Prepare line coverage chart data
    const covered = this.classInfo.class.linesCovered;
    const uncovered = this.classInfo.class.linesValid - covered;

    this.coverageChartData = [
      ['Status', 'Lines'],
      ['Covered', covered],
      ['Uncovered', uncovered]
    ];

    // Prepare branch coverage chart data if available
    if (this.classInfo.class.branchCoverage !== undefined) {
      const branchesCovered = this.classInfo.class.branchCoverage || 0;
      const branchesUncovered = this.classInfo.class.branchesValid - branchesCovered;

      this.branchChartData = [
        ['Status', 'Branches'],
        ['Covered', branchesCovered],
        ['Uncovered', branchesUncovered]
      ];
    }
  }

  updateChartOptions(): void {
    // Line coverage chart options
    this.coverageChartOptions = {
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
      pieHole: 0.4, // Makes it a donut chart
      tooltip: {
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      }
    };

    // Branch coverage chart options
    this.branchChartOptions = {
      title: 'Branch Coverage',
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
      pieHole: 0.4, // Makes it a donut chart
      tooltip: {
        textStyle: {
          color: this.isDarkTheme ? '#e0e0e0' : '#333333'
        }
      }
    };
  }

  getCoverageStatusClass(coverage: number): string {
    if (coverage >= 90) return 'excellent';
    if (coverage >= 80) return 'good';
    if (coverage >= 60) return 'adequate';
    if (coverage >= 30) return 'low';
    return 'poor';
  }

  getCoverageStatusText(coverage: number): string {
    if (coverage >= 90) return 'Excellent';
    if (coverage >= 80) return 'Good';
    if (coverage >= 60) return 'Adequate';
    if (coverage >= 30) return 'Low';
    return 'Poor';
  }

  getCoverageClass(coverage: number): string {
    if (coverage >= 80) return 'high-coverage';
    if (coverage >= 60) return 'medium-coverage';
    return 'low-coverage';
  }

  getSizeClass(size: number): string {
    if (size >= 500) return 'large-size';
    if (size >= 200) return 'medium-size';
    return 'small-size';
  }

  getSizeDescription(size: number): string {
    if (size >= 500) return 'Large - Consider refactoring';
    if (size >= 200) return 'Medium - Acceptable size';
    return 'Small - Good size';
  }

  getComplexityClass(complexity: number): string {
    if (complexity >= 30) return 'high-complexity';
    if (complexity >= 15) return 'medium-complexity';
    return 'low-complexity';
  }

  getComplexityDescription(complexity: number): string {
    if (complexity >= 30) return 'High - Should refactor';
    if (complexity >= 15) return 'Medium - Consider simplifying';
    return 'Low - Good complexity';
  }
}