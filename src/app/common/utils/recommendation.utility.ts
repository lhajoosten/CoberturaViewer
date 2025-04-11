import { Injectable } from '@angular/core';
import { CoverageData, ClassRisk, CoverageThresholds } from '../models/coverage.model';
import { Recommendation } from '../../components/coverage/coverage-insights/recommendations-view/recommendations-view.component';

@Injectable({
    providedIn: 'root'
})
export class RecommendationService {

    /**
     * Generate recommendations based on coverage data and identified risks
     */
    generateRecommendations(
        coverageData: CoverageData,
        highRiskClasses: ClassRisk[],
        thresholds: CoverageThresholds
    ): Recommendation[] {
        const recommendations: Recommendation[] = [];

        // Overall coverage improvement recommendation
        const overallCoverage = coverageData.summary.lineCoverage;

        if (overallCoverage < thresholds.good) {
            recommendations.push({
                title: 'Improve Overall Coverage',
                description: `Your overall coverage is ${overallCoverage.toFixed(1)}%, which is below the recommended threshold of ${thresholds.good}%.`,
                details: [
                    { text: 'Focus on adding tests for critical business logic first', icon: 'fa-bullseye' },
                    { text: 'Use code coverage tools to identify untested areas', icon: 'fa-search' },
                    { text: 'Implement minimum coverage thresholds in your CI pipeline', icon: 'fa-shield-alt' }
                ],
                tags: ['Coverage', 'CI/CD', 'Quality'],
                priority: overallCoverage < thresholds.average ? 'high' : 'medium'
            });
        }

        // High-risk classes recommendation
        if (highRiskClasses.length > 0) {
            let description = 'Focus testing efforts on these high-risk classes:';
            const topRiskClasses = highRiskClasses.slice(0, 3);

            recommendations.push({
                title: 'Address High-Risk Classes',
                description,
                details: topRiskClasses.map(cls => ({
                    text: `${cls.name}: ${cls.coverage.toFixed(1)}% coverage, ${cls.linesValid} lines`,
                    icon: 'fa-exclamation-triangle'
                })),
                tags: ['Risk', 'Prioritization'],
                priority: 'high'
            });
        }

        // Branch coverage recommendation
        if (coverageData.summary.branchCoverage !== undefined &&
            coverageData.summary.branchCoverage < coverageData.summary.lineCoverage - 10) {
            recommendations.push({
                title: 'Improve Conditional Branch Coverage',
                description: 'Your branch coverage is significantly lower than your line coverage, indicating tests may not cover all logic paths.',
                details: [
                    { text: 'Add test cases that exercise different conditional branches', icon: 'fa-code-branch' },
                    { text: 'Use mutation testing to verify test quality', icon: 'fa-vial' },
                    { text: 'Refactor complex conditional logic to simplify testing', icon: 'fa-code' }
                ],
                tags: ['Branches', 'Conditionals', 'Testing Quality'],
                priority: 'medium'
            });
        }

        // Distribution recommendation
        const classes = this.getAllClasses(coverageData);
        const poorClasses = classes.filter(cls => cls.lineCoverage < thresholds.average);
        const poorPercentage = (poorClasses.length / classes.length) * 100;

        if (poorPercentage >= 25) {
            recommendations.push({
                title: 'Balance Coverage Distribution',
                description: `${poorPercentage.toFixed(0)}% of your classes have poor coverage (below ${thresholds.average}%).`,
                details: [
                    { text: 'Consider implementing a coverage budget for new code', icon: 'fa-tachometer-alt' },
                    { text: 'Gradually improve coverage across all modules', icon: 'fa-chart-line' }
                ],
                tags: ['Distribution', 'Strategy'],
                priority: poorPercentage >= 50 ? 'high' : 'medium'
            });
        }

        // Add default recommendation if none exist
        if (recommendations.length === 0) {
            recommendations.push({
                title: 'Maintain Current Coverage Standards',
                description: 'Your coverage meets or exceeds all recommended thresholds. Focus on maintaining these standards for new code.',
                details: [
                    { text: 'Implement coverage checks in your CI pipeline', icon: 'fa-check-circle' },
                    { text: 'Consider adding more specialized tests like property-based or mutation tests', icon: 'fa-flask' }
                ],
                tags: ['Maintenance', 'Best Practices'],
                priority: 'low'
            });
        }

        return recommendations;
    }

    /**
     * Get all classes from coverage data
     */
    private getAllClasses(coverageData: CoverageData): any[] {
        return coverageData.packages.flatMap(pkg => pkg.classes || []);
    }
}