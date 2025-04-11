import { CoverageMetrics } from './coverage.model';

/**
 * Summary information for a coverage report
 */
export interface ReportSummary extends CoverageMetrics {
    /** Report name or file name */
    name: string;
    /** Report generation date */
    date: Date;
}

/**
 * Class coverage information for reports
 */
export interface ReportClassInfo extends CoverageMetrics {
    /** Class name */
    name: string;
    /** Optional source filename */
    filename?: string;
}

/**
 * Package coverage information for reports
 */
export interface ReportPackageInfo {
    /** Package name */
    name: string;
    /** Classes in this package */
    classes: ReportClassInfo[];
}

/**
 * Complete report structure
 */
export interface Report {
    /** Report summary information */
    summary?: ReportSummary;
    /** Packages in the report */
    packages: ReportPackageInfo[];
}

/**
 * Comparison result between reports
 */
export interface ReportComparisonResult {
    /** Summary differences */
    summary: {
        lineCoverage: number;
        branchCoverage: number;
        linesCovered: number;
        linesValid: number;
    };

    /** Package level differences */
    packages: Array<{
        name: string;
        exists: 'both' | 'base-only' | 'comparison-only';
        lineCoverageDiff: number;
        branchCoverageDiff: number;
        baselineCoverage: number;
        complineCoverage: number;
        classDiffs: Array<{
            name: string;
            exists: 'both' | 'base-only' | 'comparison-only';
            lineCoverageDiff: number;
            branchCoverageDiff: number;
            baselineCoverage: number;
            complineCoverage: number;
            lineCount: number;
        }>;
    }>;
}