import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageData } from '../../../../core/models/coverage.model';
import { ChartUtilsService } from '../../../../core/services/chart/chart-utils.service';

@Component({
  selector: 'app-coverage-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './coverage-summary.component.html',
  styleUrls: ['./coverage-summary.component.scss']
})
export class CoverageSummaryComponent implements OnInit {
  @Input() coverageData: CoverageData | null = null;

  highImpactClasses: any[] = [];

  constructor(private chartUtils: ChartUtilsService) { }

  ngOnInit(): void {
    if (this.coverageData) {
      this.highImpactClasses = this.chartUtils.getHighImpactClasses(this.coverageData);
    }
  }

  getColorForCoverage(coverage: number): string {
    return this.chartUtils.getColorForCoverage(coverage);
  }

  getCoverageGrade(coverage: number): string {
    return this.chartUtils.getCoverageGrade(coverage);
  }

  getClassCount(): number {
    if (!this.coverageData) return 0;

    let count = 0;
    this.coverageData.packages.forEach(pkg => {
      count += pkg.classes.length;
    });

    return count;
  }
}