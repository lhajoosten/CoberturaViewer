import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../../services/coverage-store.service';
import { CoverageData, CoverageInsight, ClassRisk } from '../../../models/coverage.model';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../services/utils/theme.service';

@Component({
    selector: 'app-coverage-insights',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './coverage-insights.component.html',
    styleUrls: ['./coverage-insights.component.scss']
})
export class CoverageInsightsComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    coverageData: CoverageData | null = null;
    insights: CoverageInsight[] = [];
    highRiskClasses: ClassRisk[] = [];
    recommendations: string[] = [];

    // Coverage distribution
    distribution = {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
    };

    // Class counts by coverage level
    classCountByLevel = {
        excellent: 0,
        good: 0,
        average: 0,
        poor: 0
    };

    constructor(
        private coverageStore: CoverageStoreService,
        private themeService: ThemeService
    ) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe(data => {
            this.coverageData = data;

            if (data) {
                this.generateInsights();
                this.calculateDistribution();
                this.identifyHighRiskClasses();
                this.generateRecommendations();
            }
        });

        // Subscribe to theme changes
        this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
            this.isDarkTheme = isDark;
        });
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    getTotalClassCount(): number {
        return this.coverageData?.packages.reduce((total, pkg) => total + pkg.classes.length, 0) || 0;
    }

    getCountByThreshold(items: Array<{ lineRate: number }>, threshold: number): number {
        return items.filter(item => item.lineRate >= threshold).length;
    }

    getClassCountByThreshold(threshold: number): number {
        if (!this.coverageData) return 0;

        return this.coverageData.packages.reduce((count, pkg) => {
            return count + pkg.classes.filter(cls => cls.lineRate >= threshold).length;
        }, 0);
    }

    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }
    private generateInsights(): void {
        if (!this.coverageData) return;

        this.insights = [];

        // Overall coverage assessment
        const overallCoverage = this.coverageData.summary.lineRate;
        if (overallCoverage >= 90) {
            this.insights.push({
                type: 'success',
                title: 'Excellent Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% exceeds industry best practices.`,
                icon: 'fas fa-trophy'
            });
        } else if (overallCoverage >= 75) {
            this.insights.push({
                type: 'success',
                title: 'Good Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% meets good standards.`,
                icon: 'fas fa-check-circle'
            });
        } else if (overallCoverage >= 50) {
            this.insights.push({
                type: 'warning',
                title: 'Moderate Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% is below recommended levels. Consider adding more tests.`,
                icon: 'fas fa-exclamation-circle'
            });
        } else {
            this.insights.push({
                type: 'danger',
                title: 'Low Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% is significantly below recommended levels. Immediate attention is needed.`,
                icon: 'fas fa-exclamation-triangle'
            });
        }

        // Branch vs line coverage
        const branchCoverage = this.coverageData.summary.branchRate;
        const coverageDiff = overallCoverage - branchCoverage;

        if (coverageDiff > 15) {
            this.insights.push({
                type: 'warning',
                title: 'Low Branch Coverage',
                description: `Your branch coverage (${branchCoverage.toFixed(1)}%) is ${coverageDiff.toFixed(1)}% lower than line coverage. Consider adding tests for conditional paths.`,
                icon: 'fas fa-code-branch'
            });
        }

        // Package distribution
        const packageCount = this.coverageData.packages.length;
        const highCoveragePackages = this.getCountByThreshold(this.coverageData.packages, 75);
        const packageCoveragePercent = (highCoveragePackages / packageCount) * 100;

        if (packageCoveragePercent >= 80) {
            this.insights.push({
                type: 'success',
                title: 'Well-Tested Packages',
                description: `${highCoveragePackages} out of ${packageCount} packages (${packageCoveragePercent.toFixed(0)}%) have good coverage (>75%).`,
                icon: 'fas fa-boxes'
            });
        } else if (packageCoveragePercent <= 40) {
            this.insights.push({
                type: 'danger',
                title: 'Many Poorly-Tested Packages',
                description: `Only ${highCoveragePackages} out of ${packageCount} packages (${packageCoveragePercent.toFixed(0)}%) have good coverage (>75%).`,
                icon: 'fas fa-boxes'
            });
        }

        // Class distribution
        const classCount = this.getTotalClassCount();
        const untested = this.getNumberOfUntestedClasses();

        if (untested > 0) {
            const percentage = (untested / classCount) * 100;

            if (percentage > 20) {
                this.insights.push({
                    type: 'danger',
                    title: 'Many Untested Classes',
                    description: `${untested} classes (${percentage.toFixed(1)}%) have no test coverage at all.`,
                    icon: 'fas fa-file-code'
                });
            } else {
                this.insights.push({
                    type: 'warning',
                    title: 'Some Untested Classes',
                    description: `${untested} classes (${percentage.toFixed(1)}%) have no test coverage at all.`,
                    icon: 'fas fa-file-code'
                });
            }
        }

        // High-risk assessment
        if (this.highRiskClasses.length > 0) {
            this.insights.push({
                type: 'info',
                title: 'High-Risk Areas Identified',
                description: `Found ${this.highRiskClasses.length} high-risk classes that would benefit most from additional tests.`,
                icon: 'fas fa-bullseye'
            });
        }
    }

    private getNumberOfUntestedClasses(): number {
        if (!this.coverageData) return 0;

        return this.coverageData.packages.reduce((count, pkg) => {
            return count + pkg.classes.filter(cls => cls.lineRate === 0).length;
        }, 0);
    }

    private calculateDistribution(): void {
        if (!this.coverageData) return;

        // Reset counters
        this.classCountByLevel = {
            excellent: 0,
            good: 0,
            average: 0,
            poor: 0
        };

        // Count classes in each coverage level
        for (const pkg of this.coverageData.packages) {
            for (const cls of pkg.classes) {
                if (cls.lineRate >= 90) {
                    this.classCountByLevel.excellent++;
                } else if (cls.lineRate >= 75) {
                    this.classCountByLevel.good++;
                } else if (cls.lineRate >= 50) {
                    this.classCountByLevel.average++;
                } else {
                    this.classCountByLevel.poor++;
                }
            }
        }

        // Calculate percentages for the distribution chart
        const totalClasses = this.getTotalClassCount();

        this.distribution = {
            excellent: (this.classCountByLevel.excellent / totalClasses) * 100,
            good: (this.classCountByLevel.good / totalClasses) * 100,
            average: (this.classCountByLevel.average / totalClasses) * 100,
            poor: (this.classCountByLevel.poor / totalClasses) * 100
        };
    }

    private identifyHighRiskClasses(): void {
        if (!this.coverageData) return;

        const allClasses: ClassRisk[] = [];

        // Calculate risk score for each class
        for (const pkg of this.coverageData.packages) {
            for (const cls of pkg.classes) {
                // Skip classes with zero lines
                if (!cls.lines.length) continue;

                // Risk factors:
                // 1. Low coverage
                // 2. Large class (lines of code)
                // 3. Low branch coverage (complex code)

                const coverageRisk = 1 - (cls.lineRate / 100); // 0 to 1, higher is riskier
                const sizeRisk = Math.min(cls.lines.length / 500, 1); // Normalize, max at 500 lines
                const branchRisk = 1 - (cls.branchRate / 100); // 0 to 1, higher is riskier

                // Weight the factors - coverage is most important
                const weightedRisk = (coverageRisk * 0.5) + (sizeRisk * 0.3) + (branchRisk * 0.2);

                // Convert to 0-100 scale for display
                const riskScore = weightedRisk * 100;

                // Only include if risk is significant
                if (riskScore > 40) {
                    allClasses.push({
                        name: cls.name,
                        path: `${pkg.name}.${cls.name}`,
                        coverage: cls.lineRate,
                        linesValid: cls.lines.length,
                        branchRate: cls.branchRate,
                        riskScore
                    });
                }
            }
        }

        // Sort by risk score (highest first) and take top 5
        this.highRiskClasses = allClasses
            .sort((a, b) => b.riskScore - a.riskScore)
            .slice(0, 5);
    }

    private generateRecommendations(): void {
        if (!this.coverageData) return;

        this.recommendations = [];

        // Base recommendations on insights and high-risk classes
        const overallCoverage = this.coverageData.summary.lineRate;

        // Overall coverage recommendations
        if (overallCoverage < 50) {
            this.recommendations.push(
                "Implement basic test coverage for untested classes to quickly improve overall coverage."
            );
        }

        // Branch coverage recommendations
        const branchCoverage = this.coverageData.summary.branchRate;
        const coverageDiff = overallCoverage - branchCoverage;

        if (coverageDiff > 15) {
            this.recommendations.push(
                "Focus on testing conditional logic paths to improve branch coverage. Use tools like JaCoCo to identify untested conditions."
            );
        }

        // High-risk recommendations
        if (this.highRiskClasses.length > 0) {
            this.recommendations.push(
                `Prioritize testing for high-risk classes like ${this.highRiskClasses[0].name} and ${this.highRiskClasses.length > 1 ? this.highRiskClasses[1].name : 'others'} with high complexity and low coverage.`
            );
        }

        // Distribution-based recommendations
        if (this.classCountByLevel.poor > 0) {
            const poorPercent = (this.classCountByLevel.poor / this.getTotalClassCount()) * 100;

            if (poorPercent > 30) {
                this.recommendations.push(
                    `Address the ${this.classCountByLevel.poor} classes with coverage below 50% to improve overall code quality.`
                );
            }
        }

        // Additional recommendations
        this.recommendations.push(
            "Integrate coverage analysis into your CI/CD pipeline to prevent coverage regressions."
        );

        if (overallCoverage < 90) {
            this.recommendations.push(
                "Set a team goal to achieve at least 80% coverage for all new code."
            );
        }

        if (this.getNumberOfUntestedClasses() > 0) {
            this.recommendations.push(
                "Create a basic test suite for completely untested classes to establish a minimum coverage baseline."
            );
        }
    }

    exportInsights(): void {
        if (!this.coverageData) return;

        // Create markdown content
        const content = `# Coverage Analysis Report

        ## Summary
        - **Overall Coverage**: ${this.coverageData.summary.lineRate.toFixed(1)}%
        - **Branch Coverage**: ${this.coverageData.summary.branchRate.toFixed(1)}%
        - **Lines Covered**: ${this.coverageData.summary.linesCovered} / ${this.coverageData.summary.linesValid}
        - **Packages**: ${this.coverageData.packages.length} 
        - **Classes**: ${this.getTotalClassCount()}
        - **Generated**: ${new Date().toLocaleString()}

        ## Key Insights
        ${this.insights.map(insight => `- **${insight.title}**: ${insight.description}`).join('\n')}

        ## Distribution
        - **90-100%**: ${this.classCountByLevel.excellent} classes (${this.distribution.excellent.toFixed(1)}%)
        - **75-90%**: ${this.classCountByLevel.good} classes (${this.distribution.good.toFixed(1)}%)
        - **50-75%**: ${this.classCountByLevel.average} classes (${this.distribution.average.toFixed(1)}%)
        - **0-50%**: ${this.classCountByLevel.poor} classes (${this.distribution.poor.toFixed(1)}%)

        ## High-Risk Classes
        ${this.highRiskClasses.map(cls => `- **${cls.name}**: ${cls.coverage.toFixed(1)}% coverage, ${cls.linesValid} lines`).join('\n')}

        ## Recommendations
        ${this.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
        `;

        // Create download link
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'coverage-insights.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}
