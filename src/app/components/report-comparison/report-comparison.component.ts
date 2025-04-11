import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportSummary } from '../../models/report.model';
import { Router } from '@angular/router';
import { CoberturaParserService } from '../../services/cobertura-parser.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../services/utils/notification.service';
import { ThemeService } from '../../services/utils/theme.service';

@Component({
    selector: 'app-report-comparison',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './report-comparison.component.html',
    styleUrls: ['./report-comparison.component.scss']
})
export class ReportComparisonComponent implements OnInit, OnDestroy {
    availableReports: ReportSummary[] = [];
    baseReport: ReportSummary | null = null;
    comparisonReport: ReportSummary | null = null;
    isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    // Comparison results
    comparisonData: any = null;
    isLoading = false;
    Math = Math;

    constructor(
        private router: Router,
        private notificationService: NotificationService,
        private parserService: CoberturaParserService,
        private themeService: ThemeService
    ) { }

    ngOnInit(): void {
        this.loadAvailableReports();

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

    loadAvailableReports(): void {
        try {
            // Load file names
            const fileNames = JSON.parse(localStorage.getItem('recent-files') || '[]');

            // Load reports
            this.availableReports = [];

            for (const fileName of fileNames) {
                const content = localStorage.getItem(`file-content:${fileName}`);
                if (content) {
                    try {
                        const data = this.parserService.parseCoberturaXml(content);
                        if (data) {
                            this.availableReports.push({
                                name: fileName,
                                date: new Date(),
                                lineCoverage: data.summary.lineCoverage,
                                branchCoverage: data.summary.branchCoverage,
                                linesValid: data.summary.linesValid,
                                linesCovered: data.summary.linesCovered
                            });
                        }
                    } catch (e) {
                        console.error(`Error parsing ${fileName}`, e);
                    }
                }
            }

            // Sort by date (newest first)
            this.availableReports.sort((a, b) => b.date.getTime() - a.date.getTime());

        } catch (e) {
            console.error('Error loading available reports', e);
            this.notificationService.showError('Error', 'Failed to load available reports');
        }
    }

    selectBaseReport(report: ReportSummary): void {
        this.baseReport = report;

        // If same report is selected for both, clear the other selection
        if (this.comparisonReport && this.comparisonReport.name === report.name) {
            this.comparisonReport = null;
        }

        // If both reports are selected, generate comparison
        if (this.baseReport && this.comparisonReport) {
            this.generateComparison();
        }
    }

    selectComparisonReport(report: ReportSummary): void {
        this.comparisonReport = report;

        // If same report is selected for both, clear the other selection
        if (this.baseReport && this.baseReport.name === report.name) {
            this.baseReport = null;
        }

        // If both reports are selected, generate comparison
        if (this.baseReport && this.comparisonReport) {
            this.generateComparison();
        }
    }

    generateComparison(): void {
        if (!this.baseReport || !this.comparisonReport) {
            return;
        }

        this.isLoading = true;

        try {
            const baseContent = localStorage.getItem(`file-content:${this.baseReport.name}`);
            const comparisonContent = localStorage.getItem(`file-content:${this.comparisonReport.name}`);

            if (!baseContent || !comparisonContent) {
                throw new Error('Could not find report content');
            }

            const baseData = this.parserService.parseCoberturaXml(baseContent);
            const comparisonData = this.parserService.parseCoberturaXml(comparisonContent);

            if (!baseData || !comparisonData) {
                throw new Error('Failed to parse reports');
            }

            // Generate comparison data
            this.comparisonData = this.compareReports(baseData, comparisonData);

        } catch (e) {
            console.error('Error generating comparison', e);
            this.notificationService.showError('Error', 'Failed to generate comparison');
        } finally {
            this.isLoading = false;
        }
    }

    compareReports(baseData: any, comparisonData: any): any {
        // Calculate overall differences
        const summaryDiff = {
            lineCoverage: comparisonData.summary.lineCoverage - baseData.summary.lineCoverage,
            branchCoverage: comparisonData.summary.branchCoverage - baseData.summary.branchCoverage,
            linesCovered: comparisonData.summary.linesCovered - baseData.summary.linesCovered,
            linesValid: comparisonData.summary.linesValid - baseData.summary.linesValid
        };

        // Package level differences
        const packageDiffs: any[] = [];

        // Build a map of base packages for easy lookup
        const basePackageMap = new Map();
        baseData.packages.forEach((pkg: any) => {
            basePackageMap.set(pkg.name, pkg);
        });

        // Compare each package in the comparison data
        comparisonData.packages.forEach((compPkg: any) => {
            const basePkg = basePackageMap.get(compPkg.name);

            if (basePkg) {
                // Package exists in both - calculate diff
                packageDiffs.push({
                    name: compPkg.name,
                    exists: 'both',
                    lineCoverageDiff: compPkg.lineCoverage - basePkg.lineCoverage,
                    branchCoverageDiff: compPkg.branchCoverage - basePkg.branchCoverage,
                    baselineCoverage: basePkg.lineCoverage,
                    complineCoverage: compPkg.lineCoverage,
                    classDiffs: this.compareClasses(basePkg.classes, compPkg.classes)
                });
            } else {
                // Package only exists in comparison
                packageDiffs.push({
                    name: compPkg.name,
                    exists: 'comparison-only',
                    lineCoverageDiff: compPkg.lineCoverage,
                    branchCoverageDiff: compPkg.branchCoverage,
                    baselineCoverage: 0,
                    complineCoverage: compPkg.lineCoverage,
                    classDiffs: []
                });
            }

            // Remove from map to track what's left
            basePackageMap.delete(compPkg.name);
        });

        // Add packages that only exist in base
        basePackageMap.forEach((pkg, name) => {
            packageDiffs.push({
                name,
                exists: 'base-only',
                lineCoverageDiff: -pkg.lineCoverage,
                branchCoverageDiff: -pkg.branchCoverage,
                baselineCoverage: pkg.lineCoverage,
                complineCoverage: 0,
                classDiffs: []
            });
        });

        // Sort by absolute diff magnitude (largest first)
        packageDiffs.sort((a, b) => Math.abs(b.lineCoverageDiff) - Math.abs(a.lineCoverageDiff));

        return {
            summary: summaryDiff,
            packages: packageDiffs
        };
    }

    private compareClasses(baseClasses: any[], compClasses: any[]): any[] {
        const classDiffs: any[] = [];

        // Build map of base classes
        const baseClassMap = new Map();
        baseClasses.forEach(cls => {
            baseClassMap.set(cls.name, cls);
        });

        // Compare each class
        compClasses.forEach(compCls => {
            const baseCls = baseClassMap.get(compCls.name);

            if (baseCls) {
                // Class exists in both
                classDiffs.push({
                    name: compCls.name,
                    exists: 'both',
                    lineCoverageDiff: compCls.lineCoverage - baseCls.lineCoverage,
                    branchCoverageDiff: compCls.branchCoverage - baseCls.branchCoverage,
                    baselineCoverage: baseCls.lineCoverage,
                    complineCoverage: compCls.lineCoverage,
                    lineCount: compCls.lines.length
                });
            } else {
                // Class only in comparison
                classDiffs.push({
                    name: compCls.name,
                    exists: 'comparison-only',
                    lineCoverageDiff: compCls.lineCoverage,
                    branchCoverageDiff: compCls.branchCoverage,
                    baselineCoverage: 0,
                    complineCoverage: compCls.lineCoverage,
                    lineCount: compCls.lines.length
                });
            }

            // Remove from map
            baseClassMap.delete(compCls.name);
        });

        // Add classes only in base
        baseClassMap.forEach((cls, name) => {
            classDiffs.push({
                name,
                exists: 'base-only',
                lineCoverageDiff: -cls.lineCoverage,
                branchCoverageDiff: -cls.branchCoverage,
                baselineCoverage: cls.lineCoverage,
                complineCoverage: 0,
                lineCount: cls.lines.length
            });
        });

        // Sort by absolute diff (largest first)
        classDiffs.sort((a, b) => Math.abs(b.lineCoverageDiff) - Math.abs(a.lineCoverageDiff));

        return classDiffs;
    }

    getChangeClass(diff: number): string {
        if (diff > 5) return 'improved-major';
        if (diff > 0) return 'improved-minor';
        if (diff < -5) return 'declined-major';
        if (diff < 0) return 'declined-minor';
        return 'unchanged';
    }

    getDiffLabel(diff: number): string {
        const sign = diff > 0 ? '+' : '';
        return `${sign}${diff.toFixed(2)}%`;
    }

    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }

    goBack(): void {
        this.router.navigate(['/']);
    }
}