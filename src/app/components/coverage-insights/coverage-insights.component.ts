import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { CoverageData, CoverageInsight, CoverageMetrics } from '../../models/coverage.model';

@Component({
    selector: 'app-coverage-insights',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './coverage-insights.component.html',
    styleUrls: ['./coverage-insights.component.scss']
})
export class CoverageInsightsComponent implements OnInit {
    coverageData: CoverageData | null = null;
    insights: CoverageInsight[] = [];
    metrics: CoverageMetrics = {
        totalPackages: 0,
        totalClasses: 0,
        totalLines: 0,
        coveredLines: 0,
        uncoveredLines: 0,
        fullyTestedClasses: 0,
        partiallyTestedClasses: 0,
        untestedClasses: 0,
        lowCoverageClasses: [],
        highImpactClasses: []
    };

    constructor(private coverageStore: CoverageStoreService) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe(data => {
            this.coverageData = data;
            if (data) {
                this.calculateMetrics(data);
                this.generateInsights(data);
            }
        });
    }

    private calculateMetrics(data: CoverageData): void {
        this.metrics.totalPackages = data.packages.length;
        this.metrics.totalClasses = data.packages.reduce((sum, pkg) => sum + pkg.classes.length, 0);
        this.metrics.totalLines = data.summary.linesValid;
        this.metrics.coveredLines = data.summary.linesCovered;
        this.metrics.uncoveredLines = data.summary.linesValid - data.summary.linesCovered;

        // Calculate class coverage breakdowns
        this.metrics.fullyTestedClasses = 0;
        this.metrics.partiallyTestedClasses = 0;
        this.metrics.untestedClasses = 0;
        this.metrics.lowCoverageClasses = [];
        this.metrics.highImpactClasses = [];

        data.packages.forEach(pkg => {
            pkg.classes.forEach(cls => {
                if (cls.lineRate >= 90) {
                    this.metrics.fullyTestedClasses++;
                } else if (cls.lineRate > 0) {
                    this.metrics.partiallyTestedClasses++;

                    if (cls.lineRate < 50) {
                        this.metrics.lowCoverageClasses.push(cls.name);

                        // If it's a large class with low coverage, it's high impact
                        if (cls.lines.length > 100) {
                            this.metrics.highImpactClasses.push(cls.name);
                        }
                    }
                } else {
                    this.metrics.untestedClasses++;
                    this.metrics.lowCoverageClasses.push(cls.name);
                }
            });
        });

        // Sort and limit the high impact classes list
        this.metrics.highImpactClasses = this.metrics.highImpactClasses.slice(0, 5);
    }

    private generateInsights(data: CoverageData): void {
        this.insights = [];

        // Overall coverage assessment
        if (data.summary.lineRate >= 80) {
            this.insights.push({
                type: 'success',
                title: 'Excellent Overall Coverage',
                description: `Your overall line coverage of ${data.summary.lineRate.toFixed(1)}% meets industry best practices.`,
                icon: 'fas fa-trophy'
            });
        } else if (data.summary.lineRate >= 60) {
            this.insights.push({
                type: 'info',
                title: 'Good Overall Coverage',
                description: `Your overall line coverage of ${data.summary.lineRate.toFixed(1)}% is good, but could be improved.`,
                icon: 'fas fa-thumbs-up'
            });
        } else {
            this.insights.push({
                type: 'warning',
                title: 'Low Overall Coverage',
                description: `Your overall line coverage of ${data.summary.lineRate.toFixed(1)}% is below recommended levels.`,
                icon: 'fas fa-exclamation-triangle'
            });
        }

        // Branch coverage assessment
        if (data.summary.branchRate < data.summary.lineRate - 15) {
            this.insights.push({
                type: 'warning',
                title: 'Low Branch Coverage',
                description: `Your branch coverage (${data.summary.branchRate.toFixed(1)}%) is significantly lower than line coverage (${data.summary.lineRate.toFixed(1)}%).`,
                icon: 'fas fa-code-branch'
            });
        }

        // Untested classes assessment
        if (this.metrics.untestedClasses > 0) {
            const percentage = (this.metrics.untestedClasses / this.metrics.totalClasses * 100).toFixed(1);
            this.insights.push({
                type: 'danger',
                title: 'Untested Classes Detected',
                description: `${this.metrics.untestedClasses} classes (${percentage}%) have no test coverage at all.`,
                icon: 'fas fa-times-circle'
            });
        }

        // Good practices
        if (this.metrics.fullyTestedClasses / this.metrics.totalClasses > 0.7) {
            this.insights.push({
                type: 'success',
                title: 'Majority of Classes Well Tested',
                description: `${this.metrics.fullyTestedClasses} out of ${this.metrics.totalClasses} classes have excellent test coverage.`,
                icon: 'fas fa-check-double'
            });
        }

        // High impact opportunities
        if (this.metrics.highImpactClasses.length > 0) {
            this.insights.push({
                type: 'info',
                title: 'High Impact Improvement Opportunities',
                description: `Focusing on the ${this.metrics.highImpactClasses.length} largest low-coverage classes would significantly improve overall coverage.`,
                icon: 'fas fa-bullseye'
            });
        }
    }
}