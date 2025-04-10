import { Component, Input, OnDestroy, OnInit, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoverageStoreService } from '../../../services/coverage-store.service';
import { CoverageData, CoverageInsight, ClassRisk } from '../../../models/coverage.model';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../services/utils/theme.service';
import { NotificationService } from '../../../services/utils/notification.service';

// Interface for threshold values
interface CoverageThresholds {
    excellent: number;
    good: number;
    average: number;
}

@Component({
    selector: 'app-coverage-insights',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './coverage-insights.component.html',
    styleUrls: ['./coverage-insights.component.scss']
})
export class CoverageInsightsComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    // Expose Math object for templates
    Math = Math;

    // Coverage data and derived information
    coverageData: CoverageData | null = null;
    insights: CoverageInsight[] = [];
    filteredInsights: CoverageInsight[] = [];
    highRiskClasses: ClassRisk[] = [];
    recommendations: string[] = [];

    // UI state variables
    isFullscreen = false;
    showThresholdSettings = false;
    activeView: 'metrics' | 'insights' | 'risks' | 'distribution' | 'recommendations' = 'metrics';
    distributionView: 'chart' | 'packages' = 'chart';
    selectedRiskClass: ClassRisk | null = null;
    expandedRecommendations: number[] = [];

    // Insights filtering
    insightSearchFilter = '';
    insightTypeFilter: 'all' | 'success' | 'warning' | 'danger' | 'info' = 'all';

    // Packages filtering
    packageFilter = '';
    filteredPackages: any[] = [];
    showAllPackageClasses = false;

    // Risk class sorting
    riskSortField: 'riskScore' | 'coverage' | 'name' | 'linesValid' = 'riskScore';
    riskSortDirection: 'asc' | 'desc' = 'desc';

    // Threshold values
    thresholds: CoverageThresholds = {
        excellent: 90,
        good: 75,
        average: 50
    };

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
        private themeService: ThemeService,
        private notificationService: NotificationService,
        private elementRef: ElementRef,
        private router: Router
    ) { }

    ngOnInit(): void {
        // Load saved thresholds from local storage if available
        this.loadThresholds();

        // Subscribe to coverage data changes
        this.coverageStore.getCoverageData().subscribe(data => {
            this.coverageData = data;

            if (data) {
                this.generateInsights();
                this.calculateDistribution();
                this.identifyHighRiskClasses();
                this.generateRecommendations();
                this.filterInsights();
                this.filterPackages();
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

    /**
     * Load thresholds from local storage
     */
    loadThresholds(): void {
        const savedThresholds = localStorage.getItem('coverage-thresholds');
        if (savedThresholds) {
            try {
                this.thresholds = JSON.parse(savedThresholds);
            } catch (e) {
                console.error('Failed to parse saved thresholds:', e);
                // Use defaults if parsing fails
            }
        }
    }

    /**
     * Save thresholds to local storage
     */
    saveThresholds(): void {
        localStorage.setItem('coverage-thresholds', JSON.stringify(this.thresholds));
    }

    /**
     * Update thresholds and recalculate metrics
     */
    updateThresholds(): void {
        // Validate threshold values
        if (this.thresholds.excellent <= this.thresholds.good) {
            this.thresholds.excellent = this.thresholds.good + 1;
        }
        if (this.thresholds.good <= this.thresholds.average) {
            this.thresholds.good = this.thresholds.average + 1;
        }

        // Save updated thresholds
        this.saveThresholds();

        // Recalculate distribution
        this.calculateDistribution();

        // Regenerate insights with new thresholds
        this.generateInsights();

        // Update filtered insights
        this.filterInsights();

        this.notificationService.showSuccess('Thresholds Updated', 'Coverage thresholds have been updated');
    }

    /**
     * Reset thresholds to default values
     */
    resetThresholds(): void {
        this.thresholds = {
            excellent: 90,
            good: 75,
            average: 50
        };

        this.updateThresholds();
    }

    /**
     * Toggle fullscreen mode
     */
    toggleFullscreen(): void {
        this.isFullscreen = !this.isFullscreen;

        const container = this.elementRef.nativeElement.querySelector('.insights-container');
        if (container) {
            if (this.isFullscreen) {
                if (container.requestFullscreen) {
                    container.requestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }
    }

    /**
     * Handle fullscreen change event
     */
    @HostListener('document:fullscreenchange')
    onFullscreenChange(): void {
        this.isFullscreen = !!document.fullscreenElement;
    }

    /**
     * Toggle threshold settings dropdown
     */
    toggleThresholdSettings(): void {
        this.showThresholdSettings = !this.showThresholdSettings;
    }

    /**
     * Set active view
     */
    setActiveView(view: 'metrics' | 'insights' | 'risks' | 'distribution' | 'recommendations'): void {
        this.activeView = view;
    }

    /**
     * Set distribution view
     */
    setDistributionView(view: 'chart' | 'packages'): void {
        this.distributionView = view;
    }

    /**
     * Navigate to upload screen
     */
    navigateToUpload(): void {
        // Navigate to the route with the file uploader
        // Actual implementation will depend on your routing structure
        this.router.navigate(['/']);
    }

    /**
     * Get total class count across all packages
     */
    getTotalClassCount(): number {
        return this.coverageData?.packages.reduce((total, pkg) => total + pkg.classes.length, 0) || 0;
    }

    /**
     * Get count of items above a threshold
     */
    getCountByThreshold(items: Array<{ lineRate: number }>, threshold: number): number {
        return items.filter(item => item.lineRate >= threshold).length;
    }

    /**
     * Get count of classes above a threshold across all packages
     */
    getClassCountByThreshold(threshold: number): number {
        if (!this.coverageData) return 0;

        return this.coverageData.packages.reduce((count, pkg) => {
            return count + pkg.classes.filter(cls => cls.lineRate >= threshold).length;
        }, 0);
    }

    /**
     * Get CSS class based on coverage value
     */
    getCoverageClass(coverage: number): string {
        if (coverage >= this.thresholds.excellent) return 'excellent';
        if (coverage >= this.thresholds.good) return 'good';
        if (coverage >= this.thresholds.average) return 'average';
        return 'poor';
    }

    /**
     * Get risk level class based on a value and thresholds
     */
    getRiskLevel(value: number, lowThreshold: number, highThreshold: number): string {
        if (value <= lowThreshold) return 'low-risk';
        if (value <= highThreshold) return 'medium-risk';
        return 'high-risk';
    }

    /**
     * Get risk level text based on value and thresholds
     */
    getRiskLevelText(value: number, lowThreshold: number, highThreshold: number): string {
        if (value <= lowThreshold) return 'low';
        if (value <= highThreshold) return 'medium';
        return 'high';
    }

    /**
     * Get total lines for a package
     */
    getPackageTotalLines(pkg: any): number {
        return pkg.classes.reduce((sum: number, cls: any) => sum + (cls.linesValid || 0), 0);
    }

    /**
     * Toggle insight details visibility
     */
    toggleInsightDetails(insight: CoverageInsight & { expanded?: boolean }): void {
        insight.expanded = !insight.expanded;
    }

    /**
     * Select a risk class to show details
     */
    selectRiskClass(cls: ClassRisk): void {
        this.selectedRiskClass = cls;
    }

    /**
     * Toggle risk class details
     */
    toggleRiskClassDetails(cls: ClassRisk): void {
        if (this.selectedRiskClass === cls) {
            this.selectedRiskClass = null;
        } else {
            this.selectedRiskClass = cls;
        }
    }

    /**
     * Close risk class details
     */
    closeRiskClassDetails(): void {
        this.selectedRiskClass = null;
    }

    /**
     * Toggle package expanded state
     */
    togglePackageExpanded(pkg: any): void {
        pkg.expanded = !pkg.expanded;
    }

    /**
     * Toggle recommendation details
     */
    toggleRecommendationDetails(index: number): void {
        if (this.expandedRecommendations.includes(index)) {
            this.expandedRecommendations = this.expandedRecommendations.filter(i => i !== index);
        } else {
            this.expandedRecommendations.push(index);
        }
    }

    /**
     * Filter insights based on search and type filter
     */
    filterInsights(): void {
        if (!this.insights) {
            this.filteredInsights = [];
            return;
        }

        let filtered = [...this.insights];

        // Apply type filter
        if (this.insightTypeFilter !== 'all') {
            filtered = filtered.filter(insight => insight.type === this.insightTypeFilter);
        }

        // Apply search filter
        if (this.insightSearchFilter.trim()) {
            const search = this.insightSearchFilter.toLowerCase();
            filtered = filtered.filter(insight =>
                insight.title.toLowerCase().includes(search) ||
                insight.description.toLowerCase().includes(search)
            );
        }

        this.filteredInsights = filtered;
    }

    /**
     * Set insight type filter
     */
    setInsightTypeFilter(type: 'all' | 'success' | 'warning' | 'danger' | 'info'): void {
        this.insightTypeFilter = type;
        this.filterInsights();
    }

    /**
     * Reset insight filters
     */
    resetInsightFilters(): void {
        this.insightSearchFilter = '';
        this.insightTypeFilter = 'all';
        this.filterInsights();
    }

    /**
     * Filter packages based on search
     */
    filterPackages(): void {
        if (!this.coverageData) {
            this.filteredPackages = [];
            return;
        }

        let filtered = [...this.coverageData.packages];

        // Apply search filter
        if (this.packageFilter.trim()) {
            const search = this.packageFilter.toLowerCase();
            filtered = filtered.filter(pkg =>
                (pkg.name || 'Default Package').toLowerCase().includes(search) ||
                pkg.classes.some((cls: any) => cls.name.toLowerCase().includes(search))
            );
        }

        // Add expanded property to packages if they don't have it
        this.filteredPackages = filtered.map(pkg => ({
            ...pkg,
            expanded: pkg.expanded || false
        }));
    }

    /**
     * Sort high risk classes
     */
    sortHighRiskClasses(field?: 'riskScore' | 'coverage' | 'name' | 'linesValid'): void {
        if (field) {
            // Toggle direction if same field
            if (field === this.riskSortField) {
                this.riskSortDirection = this.riskSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                this.riskSortField = field;
                // Default to descending for risk score and ascending for name
                this.riskSortDirection = field === 'name' ? 'asc' : 'desc';
            }
        }

        // Sort high risk classes
        this.highRiskClasses.sort((a, b) => {
            let result = 0;

            switch (this.riskSortField) {
                case 'riskScore':
                    result = a.riskScore - b.riskScore;
                    break;
                case 'coverage':
                    result = a.coverage - b.coverage;
                    break;
                case 'linesValid':
                    result = a.linesValid - b.linesValid;
                    break;
                case 'name':
                    result = a.name.localeCompare(b.name);
                    break;
            }

            return this.riskSortDirection === 'asc' ? result : -result;
        });
    }

    /**
     * Toggle risk sort direction
     */
    toggleRiskSortDirection(): void {
        this.riskSortDirection = this.riskSortDirection === 'asc' ? 'desc' : 'asc';
        this.sortHighRiskClasses();
    }

    /**
     * Get sort icon class based on field and current sort state
     */
    getSortIconClass(field: string): string {
        if (this.riskSortField !== field) return 'fa-sort';
        return this.riskSortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
    }

    /**
     * Copy class name to clipboard
     */
    copyClassName(name: string): void {
        navigator.clipboard.writeText(name).then(() => {
            this.notificationService.showSuccess('Copied', 'Class name copied to clipboard');
        }).catch(() => {
            this.notificationService.showError('Copy Failed', 'Failed to copy class name');
        });
    }

    /**
     * Copy a recommendation to clipboard
     */
    copyRecommendation(recommendation: string): void {
        navigator.clipboard.writeText(recommendation).then(() => {
            this.notificationService.showSuccess('Copied', 'Recommendation copied to clipboard');
        }).catch(() => {
            this.notificationService.showError('Copy Failed', 'Failed to copy recommendation');
        });
    }

    /**
     * Copy all recommendations to clipboard
     */
    copyAllRecommendations(): void {
        const text = this.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n\n');

        navigator.clipboard.writeText(text).then(() => {
            this.notificationService.showSuccess('Copied', 'All recommendations copied to clipboard');
        }).catch(() => {
            this.notificationService.showError('Copy Failed', 'Failed to copy recommendations');
        });
    }

    /**
     * Get additional details for a recommendation
     */
    getRecommendationDetails(index: number): string {
        const details = [
            "Improving test coverage helps prevent regressions and ensures the stability of your application. Focus on critical paths first.",
            "Branch coverage is particularly important as it ensures that all decision paths in your code are properly tested. This improves reliability.",
            "Integration tests for coverage should be complemented with unit tests to ensure both overall functional correctness and detailed component behavior.",
            "Setting up automated coverage checks in your CI/CD pipeline helps maintain code quality across releases.",
            "Untested classes represent a blind spot in your testing strategy and could hide bugs or regressions."
        ];

        return details[index % details.length];
    }

    /**
     * Get implementation steps for a recommendation
     */
    getImplementationSteps(index: number): string[] {
        const stepsMap: { [key: number]: string[] } = {
            0: [
                "Identify the most critical components based on business impact",
                "Create tests for the happy path first",
                "Add tests for edge cases and error conditions",
                "Monitor coverage improvements in CI"
            ],
            1: [
                "Use conditional breakpoints to identify untested branches",
                "Add specific test cases for each branch condition",
                "Consider property-based testing for complex conditionals"
            ],
            2: [
                "Implement a coverage baseline in your project",
                "Set up automated coverage reporting",
                "Gradually increase coverage requirements as tests are added"
            ],
            3: [
                "Identify classes with no tests",
                "Prioritize by complexity and importance",
                "Create a testing plan with measurable goals"
            ],
            4: [
                "Organize a dedicated testing sprint",
                "Pair programming focused on testing",
                "Document testing patterns for future reference"
            ]
        };

        return stepsMap[index % 5] || stepsMap[0];
    }

    /**
     * Generate insights based on coverage data
     */
    private generateInsights(): void {
        if (!this.coverageData) return;

        this.insights = [];

        // Overall coverage assessment
        const overallCoverage = this.coverageData.summary.lineRate;
        if (overallCoverage >= this.thresholds.excellent) {
            this.insights.push({
                type: 'success',
                title: 'Excellent Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% exceeds industry best practices.`,
                icon: 'fas fa-trophy'
            });
        } else if (overallCoverage >= this.thresholds.good) {
            this.insights.push({
                type: 'success',
                title: 'Good Overall Coverage',
                description: `Your overall line coverage of ${overallCoverage.toFixed(1)}% meets good standards.`,
                icon: 'fas fa-check-circle'
            });
        } else if (overallCoverage >= this.thresholds.average) {
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
        } else if (branchCoverage >= this.thresholds.good) {
            this.insights.push({
                type: 'success',
                title: 'Good Branch Coverage',
                description: `Your branch coverage of ${branchCoverage.toFixed(1)}% indicates well-tested conditional logic.`,
                icon: 'fas fa-code-branch'
            });
        }

        // Package distribution
        const packageCount = this.coverageData.packages.length;
        const highCoveragePackages = this.getCountByThreshold(this.coverageData.packages, this.thresholds.good);
        const packageCoveragePercent = (highCoveragePackages / packageCount) * 100;

        if (packageCoveragePercent >= 80) {
            this.insights.push({
                type: 'success',
                title: 'Well-Tested Packages',
                description: `${highCoveragePackages} out of ${packageCount} packages (${packageCoveragePercent.toFixed(0)}%) have good coverage (>${this.thresholds.good}%).`,
                icon: 'fas fa-boxes'
            });
        } else if (packageCoveragePercent <= 40) {
            this.insights.push({
                type: 'danger',
                title: 'Many Poorly-Tested Packages',
                description: `Only ${highCoveragePackages} out of ${packageCount} packages (${packageCoveragePercent.toFixed(0)}%) have good coverage (>${this.thresholds.good}%).`,
                icon: 'fas fa-boxes'
            });
        } else {
            this.insights.push({
                type: 'warning',
                title: 'Mixed Package Coverage',
                description: `${highCoveragePackages} out of ${packageCount} packages (${packageCoveragePercent.toFixed(0)}%) have good coverage (>${this.thresholds.good}%).`,
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
        } else if (classCount > 0) {
            this.insights.push({
                type: 'success',
                title: 'All Classes Have Tests',
                description: 'Every class has at least some test coverage. Great job!',
                icon: 'fas fa-file-code'
            });
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

        // Distribution insights
        if (this.classCountByLevel.excellent > 0 && (this.classCountByLevel.excellent / classCount) > 0.5) {
            this.insights.push({
                type: 'success',
                title: 'Majority of Classes Well Tested',
                description: `${this.classCountByLevel.excellent} classes (${((this.classCountByLevel.excellent / classCount) * 100).toFixed(0)}%) have excellent test coverage (>${this.thresholds.excellent}%).`,
                icon: 'fas fa-chart-pie'
            });
        }

        if (this.classCountByLevel.poor > 0 && (this.classCountByLevel.poor / classCount) > 0.3) {
            this.insights.push({
                type: 'danger',
                title: 'Many Poorly Tested Classes',
                description: `${this.classCountByLevel.poor} classes (${((this.classCountByLevel.poor / classCount) * 100).toFixed(0)}%) have poor test coverage (<${this.thresholds.average}%).`,
                icon: 'fas fa-chart-pie'
            });
        }
    }

    /**
     * Get number of untested classes
     */
    private getNumberOfUntestedClasses(): number {
        if (!this.coverageData) return 0;

        return this.coverageData.packages.reduce((count, pkg) => {
            return count + pkg.classes.filter(cls => cls.lineRate === 0).length;
        }, 0);
    }

    /**
     * Calculate coverage distribution
     */
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
                if (cls.lineRate >= this.thresholds.excellent) {
                    this.classCountByLevel.excellent++;
                } else if (cls.lineRate >= this.thresholds.good) {
                    this.classCountByLevel.good++;
                } else if (cls.lineRate >= this.thresholds.average) {
                    this.classCountByLevel.average++;
                } else {
                    this.classCountByLevel.poor++;
                }
            }
        }

        // Calculate percentages for the distribution chart
        const totalClasses = this.getTotalClassCount();
        if (totalClasses === 0) return;

        this.distribution = {
            excellent: (this.classCountByLevel.excellent / totalClasses) * 100,
            good: (this.classCountByLevel.good / totalClasses) * 100,
            average: (this.classCountByLevel.average / totalClasses) * 100,
            poor: (this.classCountByLevel.poor / totalClasses) * 100
        };
    }

    /**
     * Identify high-risk classes
     */
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
            .slice(0, 10);
    }

    /**
     * Generate recommendations based on coverage data
     */
    private generateRecommendations(): void {
        if (!this.coverageData) return;

        this.recommendations = [];

        // Base recommendations on insights and high-risk classes
        const overallCoverage = this.coverageData.summary.lineRate;

        // Overall coverage recommendations
        if (overallCoverage < this.thresholds.average) {
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
                    `Address the ${this.classCountByLevel.poor} classes with coverage below ${this.thresholds.average}% to improve overall code quality.`
                );
            }
        }

        // Additional recommendations
        this.recommendations.push(
            "Integrate coverage analysis into your CI/CD pipeline to prevent coverage regressions."
        );

        if (overallCoverage < 90) {
            this.recommendations.push(
                `Set a team goal to achieve at least ${this.thresholds.good}% coverage for all new code.`
            );
        }

        if (this.getNumberOfUntestedClasses() > 0) {
            this.recommendations.push(
                "Create a basic test suite for completely untested classes to establish a minimum coverage baseline."
            );
        }

        // Add more specific recommendations
        if (this.coverageData.packages.length > 5) {
            const lowCoveragePackages = this.coverageData.packages.filter(pkg => pkg.lineRate < this.thresholds.average);
            if (lowCoveragePackages.length > 0) {
                this.recommendations.push(
                    `Focus on improving coverage in low-coverage packages: ${lowCoveragePackages.slice(0, 3).map(pkg => pkg.name || 'Default').join(', ')}${lowCoveragePackages.length > 3 ? ', etc.' : ''}`
                );
            }
        }

        // Recommendation for test maintenance
        if (overallCoverage >= this.thresholds.excellent) {
            this.recommendations.push(
                "Maintain excellent coverage by implementing strict code review policies for test coverage of new features."
            );
        }
    }

    /**
     * Export insights to a file
     */
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

        ## Coverage Thresholds
        - **Excellent**: ${this.thresholds.excellent}%+
        - **Good**: ${this.thresholds.good}%-${this.thresholds.excellent}%
        - **Average**: ${this.thresholds.average}%-${this.thresholds.good}%
        - **Poor**: 0%-${this.thresholds.average}%

        ## Key Insights
        ${this.insights.map(insight => `- **${insight.title}**: ${insight.description}`).join('\n')}

        ## Distribution
        - **${this.thresholds.excellent}-100%**: ${this.classCountByLevel.excellent} classes (${this.distribution.excellent.toFixed(1)}%)
        - **${this.thresholds.good}-${this.thresholds.excellent}%**: ${this.classCountByLevel.good} classes (${this.distribution.good.toFixed(1)}%)
        - **${this.thresholds.average}-${this.thresholds.good}%**: ${this.classCountByLevel.average} classes (${this.distribution.average.toFixed(1)}%)
        - **0-${this.thresholds.average}%**: ${this.classCountByLevel.poor} classes (${this.distribution.poor.toFixed(1)}%)

        ## High-Risk Classes
        ${this.highRiskClasses.map(cls => `- **${cls.name}**: ${cls.coverage.toFixed(1)}% coverage, ${cls.linesValid} lines, risk score: ${cls.riskScore.toFixed(1)}`).join('\n')}

        ## Recommendations
        ${this.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

        ## Next Steps
        1. Review the high-risk classes identified in this report
        2. Implement the recommendations based on their priority
        3. Re-run coverage analysis after adding tests to measure improvement
        4. Set up automated coverage reporting in your CI/CD pipeline

        *Generated by Coverage Insights Tool*
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

        this.notificationService.showSuccess('Export Complete', 'Insights have been exported as Markdown');
    }
}