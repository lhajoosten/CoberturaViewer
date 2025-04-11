import { Injectable } from '@angular/core';
import { CoverageData, ClassRisk, CoverageThresholds } from '../models/coverage.model';

@Injectable({
    providedIn: 'root'
})
export class RiskAnalysisService {

    /**
     * Identify high risk classes based on coverage, size, and complexity
     */
    identifyHighRiskClasses(coverageData: CoverageData, thresholds: CoverageThresholds): ClassRisk[] {
        const allClasses = this.getAllClasses(coverageData);
        const highRiskClasses: ClassRisk[] = [];

        for (const pkg of coverageData.packages) {
            if (!pkg.classes) continue;

            for (const cls of pkg.classes) {
                // Skip very small classes
                if (cls.linesValid < 10) continue;

                // Calculate risk score (higher = more risky)
                // Formula: (100 - coverage) * sqrt(lines) / 10
                const coverageGap = 100 - cls.lineCoverage;
                const complexityFactor = Math.sqrt(cls.linesValid);
                const riskScore = (coverageGap * complexityFactor) / 10;

                // Only include classes with high risk score or very poor coverage
                if (riskScore >= 15 || (cls.lineCoverage < thresholds.average && cls.linesValid > 50)) {
                    highRiskClasses.push({
                        name: cls.name,
                        path: pkg.name,
                        coverage: cls.lineCoverage,
                        linesValid: cls.linesValid,
                        branchCoverage: cls.branchCoverage,
                        riskScore
                    });
                }
            }
        }

        // Sort by risk score (descending)
        return highRiskClasses.sort((a, b) => b.riskScore - a.riskScore);
    }

    /**
     * Get all classes from coverage data
     */
    private getAllClasses(coverageData: CoverageData): any[] {
        return coverageData.packages.flatMap(pkg => pkg.classes || []);
    }
}