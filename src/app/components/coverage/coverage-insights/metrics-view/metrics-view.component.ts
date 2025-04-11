import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageData } from '../../../../common/models/coverage.model';

@Component({
  selector: 'app-metrics-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './metrics-view.component.html',
  styleUrls: ['./metrics-view.component.scss']
})
export class MetricsViewComponent implements OnChanges {
  @Input() coverageData!: CoverageData;
  @Input() thresholds!: { excellent: number; good: number; average: number };

  // Summary metrics
  packageCount = 0;
  classCount = 0;
  methodCount = 0;

  // Calculated metrics
  coverageDistribution = {
    excellent: 0,
    good: 0,
    average: 0,
    poor: 0
  };

  ngOnChanges(): void {
    if (this.coverageData) {
      this.calculateMetrics();
    }
  }

  private calculateMetrics(): void {
    // Calculate package, class, and method counts
    this.packageCount = this.coverageData.packages.length;
    this.classCount = this.coverageData.packages.reduce(
      (count: any, pkg: { classes: string | any[]; }) => count + (pkg.classes?.length || 0), 0
    );
    this.methodCount = this.coverageData.packages.reduce(
      (count: any, pkg: { classes: any[]; }) => count + pkg.classes.reduce(
        (mCount: any, cls: { methods: string | any[]; }) => mCount + (cls.methods?.length || 0), 0
      ), 0
    );

    // Calculate coverage distribution
    const allClasses = this.getAllClasses();
    this.coverageDistribution = {
      excellent: this.getCountByThreshold(allClasses, this.thresholds.excellent),
      good: this.getCountByThreshold(allClasses, this.thresholds.good) -
        this.getCountByThreshold(allClasses, this.thresholds.excellent),
      average: this.getCountByThreshold(allClasses, this.thresholds.average) -
        this.getCountByThreshold(allClasses, this.thresholds.good),
      poor: allClasses.length - this.getCountByThreshold(allClasses, this.thresholds.average)
    };
  }

  private getAllClasses(): Array<any> {
    return this.coverageData.packages.flatMap((pkg: { classes: any; }) => pkg.classes || []);
  }

  private getCountByThreshold(items: Array<any>, threshold: number): number {
    return items.filter(item => item.lineCoverage >= threshold).length;
  }

  getCoverageClass(coverage: number): string {
    if (coverage >= this.thresholds.excellent) return 'excellent';
    if (coverage >= this.thresholds.good) return 'good';
    if (coverage >= this.thresholds.average) return 'average';
    return 'poor';
  }
}