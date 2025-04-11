import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageData } from '../../../../common/models/coverage.model';
import { NotificationService } from '../../../../common/utils/notification.utility';

interface ChartSegment {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-distribution-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './distribution-view.component.html',
  styleUrls: ['./distribution-view.component.scss']
})
export class DistributionViewComponent implements OnChanges {
  @Input() coverageData!: CoverageData;
  @Input() thresholds!: { excellent: number; good: number; average: number; };
  @Input() isDarkTheme = false;

  coverageDistribution: ChartSegment[] = [];
  lineDistribution: ChartSegment[] = [];
  packageDistribution: Array<{ name: string; percentage: number; color: string }> = [];

  constructor(private notificationService: NotificationService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coverageData'] && this.coverageData) {
      this.generateCoverageDistribution();
      this.generateLineDistribution();
      this.generatePackageDistribution();
    }
  }

  getTotalClasses(): number {
    return this.coverageData?.packages.flatMap(p => p.classes || []).length || 0;
  }

  generateCoverageDistribution(): void {
    const { excellent, good, average } = this.thresholds;
    const allClasses = this.coverageData.packages.flatMap(p => p.classes || []);

    // Count classes in each coverage level
    const excellentCount = allClasses.filter(c => c.lineCoverage >= excellent).length;
    const goodCount = allClasses.filter(c => c.lineCoverage >= good && c.lineCoverage < excellent).length;
    const averageCount = allClasses.filter(c => c.lineCoverage >= average && c.lineCoverage < good).length;
    const poorCount = allClasses.filter(c => c.lineCoverage < average).length;

    const total = excellentCount + goodCount + averageCount + poorCount;

    this.coverageDistribution = [
      {
        name: 'Excellent',
        value: excellentCount,
        percentage: (excellentCount / total) * 100,
        color: '#4caf50' // tokens.color("success")
      },
      {
        name: 'Good',
        value: goodCount,
        percentage: (goodCount / total) * 100,
        color: '#2196f3' // tokens.color("accent")
      },
      {
        name: 'Average',
        value: averageCount,
        percentage: (averageCount / total) * 100,
        color: '#ff9800' // tokens.color("warning")
      },
      {
        name: 'Poor',
        value: poorCount,
        percentage: (poorCount / total) * 100,
        color: '#f44336' // tokens.color("error")
      }
    ];
  }

  generateLineDistribution(): void {
    const totalLines = this.coverageData.summary.linesValid;
    const coveredLines = this.coverageData.summary.linesCovered;
    const uncoveredLines = totalLines - coveredLines;

    this.lineDistribution = [
      {
        name: 'Covered',
        value: coveredLines,
        percentage: (coveredLines / totalLines) * 100,
        color: '#4caf50' // tokens.color("success")
      },
      {
        name: 'Uncovered',
        value: uncoveredLines,
        percentage: (uncoveredLines / totalLines) * 100,
        color: '#f44336' // tokens.color("error")
      }
    ];
  }

  generatePackageDistribution(): void {
    if (!this.coverageData.packages) return;

    this.packageDistribution = this.coverageData.packages
      .filter(pkg => pkg.name && pkg.name.trim()) // Filter out packages with no name
      .map(pkg => {
        const coverage = pkg.lineCoverage || 0;
        return {
          name: pkg.name,
          percentage: coverage,
          color: this.getCoverageColor(coverage)
        };
      })
      .sort((a, b) => b.percentage - a.percentage); // Sort by coverage (descending)
  }

  createPieSegment(index: number, segments: ChartSegment[]): string {
    // Calculate the start and end angles for this segment
    let total = 0;
    segments.forEach(segment => total += segment.value);

    let startAngle = 0;
    for (let i = 0; i < index; i++) {
      startAngle += (segments[i].value / total) * 360;
    }

    const angle = (segments[index].value / total) * 360;
    const endAngle = startAngle + angle;

    // Convert angles to radians
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (endAngle - 90) * Math.PI / 180;

    // Calculate points
    const radius = 50;
    const centerX = 50;
    const centerY = 50;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    // Create SVG arc path
    const largeArcFlag = angle > 180 ? 1 : 0;
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  }

  getCoverageClass(coverage: number): string {
    const { excellent, good, average } = this.thresholds;
    if (coverage >= excellent) return 'excellent';
    if (coverage >= good) return 'good';
    if (coverage >= average) return 'average';
    return 'poor';
  }

  getCoverageColor(coverage: number): string {
    const { excellent, good, average } = this.thresholds;
    if (coverage >= excellent) return '#4caf50'; // tokens.color("success")
    if (coverage >= good) return '#2196f3'; // tokens.color("accent")
    if (coverage >= average) return '#ff9800'; // tokens.color("warning")
    return '#f44336'; // tokens.color("error")
  }
}