import { Injectable } from '@angular/core';
import { CoverageData, CoverageInsight, CoverageThresholds } from '../models/coverage.model';

@Injectable({
    providedIn: 'root'
})
export class InsightGeneratorService {

    /**
     * Generate insights based on coverage data
     */
    generateInsights(coverageData: CoverageData, thresholds: CoverageThresholds): CoverageInsight[] {
        const insights: CoverageInsight[] = [];

        // Overall coverage insights
        const overallCoverage = coverageData.summary.lineCoverage;

        if (overallCoverage >= thresholds.excellent) {
            insights.push({
                type: 'success',
                title: 'Excellent Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% exceeds industry best practices.`,
                icon: 'fa-trophy'
            });
        } else if (overallCoverage >= thresholds.good) {
            insights.push({
                type: 'success',
                title: 'Good Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% meets good quality standards.`,
                icon: 'fa-thumbs-up'
            });
        } else if (overallCoverage >= thresholds.average) {
            insights.push({
                type: 'warning',
                title: 'Average Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% meets minimum standards but could be improved.`,
                icon: 'fa-exclamation-circle'
            });
        } else {
            insights.push({
                type: 'danger',
                title: 'Low Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% is below recommended standards.`,
                icon: 'fa-exclamation-triangle'
            });
        }

        // Branch coverage insights
        if (coverageData.summary.branchCoverage !== undefined) {
            const branchCoverage = coverageData.summary.branchCoverage;
            const branchToLineDifference = branchCoverage - overallCoverage;

            if (branchToLineDifference < -15) {
                insights.push({
                    type: 'warning',
                    title: 'Low Branch Coverage',
                    description: `Your branch coverage (${branchCoverage.toFixed(1)}%) is significantly lower than your line coverage. Consider adding more tests for conditional paths.`,
                    icon: 'fa-code-branch'
                });
            } else if (branchToLineDifference > 15) {
                insights.push({
                    type: 'info',
                    title: 'High Branch Coverage',
                    description: `Your branch coverage (${branchCoverage.toFixed(1)}%) is significantly higher than your line coverage, indicating good test coverage of conditional logic.`,
                    icon: 'fa-code-branch'
                });
            }
        }

        // Distribution insights
        const classes = this.getAllClasses(coverageData);
        const totalClasses = classes.length;

        if (totalClasses > 0) {
            const excellentCount = classes.filter(cls => cls.lineCoverage >= thresholds.excellent).length;
            const goodCount = classes.filter(cls => cls.lineCoverage >= thresholds.good && cls.lineCoverage < thresholds.excellent).length;
            const averageCount = classes.filter(cls => cls.lineCoverage >= thresholds.average && cls.lineCoverage < thresholds.good).length;
            const poorCount = classes.filter(cls => cls.lineCoverage < thresholds.average).length;

            const excellentPercentage = (excellentCount / totalClasses) * 100;
            const poorPercentage = (poorCount / totalClasses) * 100;

            if (excellentPercentage >= 75) {
                insights.push({
                    type: 'success',
                    title: 'Strong Coverage Distribution',
                    description: `${excellentPercentage.toFixed(0)}% of your classes have excellent test coverage (>= ${thresholds.excellent}%).`,
                    icon: 'fa-chart-pie'
                });
            } else if (poorPercentage >= 25) {
                insights.push({
                    type: 'danger',
                    title: 'Uneven Coverage Distribution',
                    description: `${poorPercentage.toFixed(0)}% of your classes have poor test coverage (< ${thresholds.average}%).`,
                    icon: 'fa-chart-pie'
                });
            }
        }

        return insights;
    }

    /**
     * Get all classes from coverage data
     */
    private getAllClasses(coverageData: CoverageData): any[] {
        return coverageData.packages.flatMap(pkg => pkg.classes || []);
    }
}