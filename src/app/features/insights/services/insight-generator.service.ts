import { Injectable } from '@angular/core';
import { CoverageData, CoverageInsight, ClassRisk } from '../../../core/models/coverage.model';

@Injectable({
  providedIn: 'root'
})
export class InsightGeneratorService {

  constructor() { }

  /**
   * Generate insights based on coverage data
   */
  generateInsights(coverageData: CoverageData): CoverageInsight[] {
    if (!coverageData) return [];

    const insights: CoverageInsight[] = [];

    // Overall coverage assessment
    insights.push(...this.getOverallCoverageInsights(coverageData));

    // Package-level insights
    insights.push(...this.getPackageInsights(coverageData));

    // Risk-based insights
    insights.push(...this.getRiskBasedInsights(coverageData));

    // Opportunities for improvement
    insights.push(...this.getImprovementInsights(coverageData));

    return insights;
  }

  /**
   * Generate overall coverage assessment insights
   */
  private getOverallCoverageInsights(data: CoverageData): CoverageInsight[] {
    const insights: CoverageInsight[] = [];
    const summary = data.summary;

    // Overall line coverage assessment
    if (summary.lineCoverage >= 90) {
      insights.push({
        type: 'success',
        title: 'Excellent Overall Coverage',
        description: `Your overall line coverage of ${summary.lineCoverage.toFixed(1)}% meets industry standards for well-tested code.`,
        icon: 'fa-award'
      });
    } else if (summary.lineCoverage >= 75) {
      insights.push({
        type: 'success',
        title: 'Good Overall Coverage',
        description: `Your overall line coverage of ${summary.lineCoverage.toFixed(1)}% is good, but there's room for improvement to reach the 90% threshold.`,
        icon: 'fa-thumbs-up'
      });
    } else if (summary.lineCoverage >= 60) {
      insights.push({
        type: 'warning',
        title: 'Moderate Overall Coverage',
        description: `Your overall line coverage of ${summary.lineCoverage.toFixed(1)}% indicates moderate test coverage. Consider adding more tests to reach at least 75%.`,
        icon: 'fa-exclamation-triangle'
      });
    } else {
      insights.push({
        type: 'danger',
        title: 'Low Overall Coverage',
        description: `Your overall line coverage of ${summary.lineCoverage.toFixed(1)}% is below recommended levels. Prioritize adding tests to critical code paths.`,
        icon: 'fa-exclamation-circle'
      });
    }

    // Branch coverage assessment
    if (summary.branchCoverage !== undefined) {
      const branchLineDiff = summary.branchCoverage - summary.lineCoverage;

      if (branchLineDiff < -15) {
        insights.push({
          type: 'warning',
          title: 'Low Branch Coverage',
          description: `Your branch coverage (${summary.branchCoverage.toFixed(1)}%) is significantly lower than line coverage (${summary.lineCoverage.toFixed(1)}%). Focus on testing conditional logic and edge cases.`,
          icon: 'fa-code-branch'
        });
      }
    }

    return insights;
  }

  /**
   * Generate package-level insights
   */
  private getPackageInsights(data: CoverageData): CoverageInsight[] {
    const insights: CoverageInsight[] = [];
    const packages = data.packages;

    if (packages.length <= 1) return insights;

    // Find packages with significantly lower coverage
    const avgCoverage = packages.reduce((sum, pkg) => sum + pkg.lineCoverage, 0) / packages.length;
    const lowCoveragePackages = packages.filter(pkg => pkg.lineCoverage < (avgCoverage - 15));

    if (lowCoveragePackages.length > 0) {
      const pkgNames = lowCoveragePackages.map(pkg => `"${pkg.name}" (${pkg.lineCoverage.toFixed(1)}%)`).join(', ');

      insights.push({
        type: 'warning',
        title: 'Uneven Package Coverage',
        description: `${lowCoveragePackages.length} packages have significantly lower coverage than average: ${pkgNames}`,
        icon: 'fa-box-open',
        details: `The average package coverage is ${avgCoverage.toFixed(1)}%. Focusing on these packages would help even out your test coverage.`
      });
    }

    // Find high-complexity packages with low coverage
    const highComplexityPackages = packages.filter(pkg =>
      pkg.complexity && pkg.complexity > 15 && pkg.lineCoverage < 75);

    if (highComplexityPackages.length > 0) {
      const pkgNames = highComplexityPackages.map(pkg =>
        `"${pkg.name}" (complexity: ${pkg.complexity?.toFixed(0)}, coverage: ${pkg.lineCoverage.toFixed(1)}%)`
      ).join(', ');

      insights.push({
        type: 'danger',
        title: 'High-Risk Complex Packages',
        description: `${highComplexityPackages.length} complex packages have low test coverage: ${pkgNames}`,
        icon: 'fa-project-diagram',
        details: 'Complex code with low test coverage is particularly risky. Prioritize adding tests to these packages.'
      });
    }

    return insights;
  }

  /**
   * Generate risk-based insights
   */
  private getRiskBasedInsights(data: CoverageData): CoverageInsight[] {
    const insights: CoverageInsight[] = [];

    // Identify high-risk classes (most uncovered lines)
    const classRisks: ClassRisk[] = [];

    data.packages.forEach(pkg => {
      pkg.classes.forEach(cls => {
        if (cls.linesValid === 0) return;

        // Calculate risk score: uncovered lines * (1 + complexity factor)
        const uncoveredLines = cls.linesValid - cls.linesCovered;
        const complexityFactor = cls.complexity ? cls.complexity / 50 : 0;
        const riskScore = uncoveredLines * (1 + complexityFactor);

        if (riskScore > 0) {
          classRisks.push({
            name: cls.name,
            path: `${pkg.name}.${cls.name}`,
            coverage: cls.lineCoverage,
            linesValid: cls.linesValid,
            branchCoverage: cls.branchCoverage || 0,
            riskScore
          });
        }
      });
    });

    // Sort by risk score (highest first) and take top 5
    classRisks.sort((a, b) => b.riskScore - a.riskScore);
    const highRiskClasses = classRisks.slice(0, 5);

    if (highRiskClasses.length > 0) {
      const classDetails = highRiskClasses.map(cls =>
        `"${cls.path}" (${cls.coverage.toFixed(1)}% covered, ${cls.linesValid - Math.floor(cls.linesValid * cls.coverage / 100)} uncovered lines)`
      ).join('\n• ');

      insights.push({
        type: 'danger',
        title: 'High-Risk Classes Identified',
        description: `${highRiskClasses.length} classes have been identified as high-risk based on lack of test coverage and complexity.`,
        icon: 'fa-radiation',
        details: `These classes should be prioritized for testing:\n• ${classDetails}`
      });
    }

    return insights;
  }

  /**
   * Generate improvement opportunity insights
   */
  private getImprovementInsights(data: CoverageData): CoverageInsight[] {
    const insights: CoverageInsight[] = [];
    const summary = data.summary;

    // Calculate potential coverage gain from testing just a few classes
    const allClasses: { name: string, path: string, uncoveredLines: number, percentGain: number }[] = [];

    data.packages.forEach(pkg => {
      pkg.classes.forEach(cls => {
        if (cls.linesValid === 0) return;

        const uncoveredLines = cls.linesValid - cls.linesCovered;
        if (uncoveredLines > 0) {
          // Calculate what percentage gain in overall coverage we'd get from covering this class
          const percentGain = (uncoveredLines / summary.linesValid) * 100;

          allClasses.push({
            name: cls.name,
            path: `${pkg.name}.${cls.name}`,
            uncoveredLines,
            percentGain
          });
        }
      });
    });

    // Sort by highest potential gain and take top classes
    allClasses.sort((a, b) => b.percentGain - a.percentGain);
    const highGainClasses = allClasses.slice(0, 3);

    if (highGainClasses.length > 0) {
      const totalGain = highGainClasses.reduce((sum, cls) => sum + cls.percentGain, 0);
      const classDetails = highGainClasses.map(cls =>
        `"${cls.path}" (+${cls.percentGain.toFixed(2)}%, ${cls.uncoveredLines} lines)`
      ).join('\n• ');

      insights.push({
        type: 'info',
        title: 'Quick Wins for Coverage Improvement',
        description: `Fully testing just ${highGainClasses.length} classes could increase your overall coverage by approximately ${totalGain.toFixed(2)}%.`,
        icon: 'fa-tachometer-alt',
        details: `These classes offer the best return on effort:\n• ${classDetails}`
      });
    }

    // Suggest improving branch coverage if it's much lower than line coverage
    if (summary.branchCoverage !== undefined && summary.lineCoverage - summary.branchCoverage > 15) {
      insights.push({
        type: 'info',
        title: 'Focus on Branch Coverage',
        description: `Your branch coverage (${summary.branchCoverage.toFixed(1)}%) is significantly lower than your line coverage (${summary.lineCoverage.toFixed(1)}%).`,
        icon: 'fa-code-branch',
        details: 'Consider adding tests that specifically target conditional logic paths, such as if/else statements and switch cases. Testing edge cases and boundary conditions will improve your branch coverage.'
      });
    }

    return insights;
  }
}