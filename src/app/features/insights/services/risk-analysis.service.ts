import { Injectable } from '@angular/core';
import { CoverageData, ClassRisk } from '../../../core/models/coverage.model';

@Injectable({
  providedIn: 'root'
})
export class RiskAnalysisService {

  constructor() { }

  /**
   * Analyze code coverage data to identify risks
   */
  analyzeRisks(coverageData: CoverageData): {
    highRiskClasses: ClassRisk[],
    mediumRiskClasses: ClassRisk[],
    riskScore: number,
    riskLevel: 'high' | 'medium' | 'low',
    coverageGap: number
  } {
    if (!coverageData) {
      return {
        highRiskClasses: [],
        mediumRiskClasses: [],
        riskScore: 0,
        riskLevel: 'low',
        coverageGap: 0
      };
    }

    // Calculate risk for each class
    const allRisks: ClassRisk[] = [];

    coverageData.packages.forEach(pkg => {
      pkg.classes.forEach(cls => {
        if (cls.linesValid === 0) return;

        // Core risk factors:
        // 1. Uncovered lines
        // 2. Class size
        // 3. Complexity (if available)
        // 4. Branch coverage gap

        const uncoveredLines = cls.linesValid - cls.linesCovered;
        const sizeFactor = cls.linesValid > 200 ? 1.5 : cls.linesValid > 100 ? 1.2 : 1;
        const complexityFactor = cls.complexity ? cls.complexity / 20 : 1;
        const branchGapFactor = cls.branchCoverage ?
          (cls.lineCoverage - cls.branchCoverage) / 20 : 0;

        // Calculate risk score
        const baseRisk = uncoveredLines * (1 + branchGapFactor);
        const riskScore = baseRisk * sizeFactor * complexityFactor;

        if (riskScore > 0) {
          allRisks.push({
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

    // Sort risks by score (highest first)
    allRisks.sort((a, b) => b.riskScore - a.riskScore);

    // Categorize risks
    const highRiskThreshold = Math.max(50, allRisks.length > 0 ? allRisks[0].riskScore / 2 : 0);
    const mediumRiskThreshold = highRiskThreshold / 2;

    const highRiskClasses = allRisks.filter(cls => cls.riskScore >= highRiskThreshold);
    const mediumRiskClasses = allRisks.filter(cls =>
      cls.riskScore >= mediumRiskThreshold && cls.riskScore < highRiskThreshold);

    // Calculate overall risk score (0-100)
    const coverageScore = Math.min(100, coverageData.summary.lineCoverage);
    const riskDistributionFactor = (highRiskClasses.length * 3 + mediumRiskClasses.length) /
      Math.max(1, coverageData.packages.reduce((sum, pkg) => sum + pkg.classes.length, 0));

    // Invert coverage score and scale by risk distribution
    const riskScore = Math.min(100, Math.max(0,
      (100 - coverageScore) * (1 + riskDistributionFactor * 0.5)
    ));

    // Determine risk level
    const riskLevel = riskScore >= 50 ? 'high' : riskScore >= 25 ? 'medium' : 'low';

    // Calculate coverage gap (distance to 90% coverage)
    const coverageGap = Math.max(0, 90 - coverageData.summary.lineCoverage);

    return {
      highRiskClasses,
      mediumRiskClasses,
      riskScore,
      riskLevel,
      coverageGap
    };
  }
}