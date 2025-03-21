export interface CoverageSummary {
    lineRate: number;
    branchRate: number;
    linesValid: number;
    linesCovered: number;
    timestamp: string;
}

export interface ClassInfo {
    name: string;
    filename: string;
    lineRate: number;
    branchRate: number;
    lines: LineInfo[];
}

export interface PackageInfo {
    name: string;
    lineRate: number;
    branchRate: number;
    classes: ClassInfo[];
}

export interface LineInfo {
    number: number;
    hits: number;
    branch: boolean;
}

export interface CoverageData {
    summary: CoverageSummary;
    packages: PackageInfo[];
}

export interface CoverageInsight {
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    description: string;
    icon: string;
}

export interface CoverageMetrics {
    totalPackages: number;
    totalClasses: number;
    totalLines: number;
    coveredLines: number;
    uncoveredLines: number;
    fullyTestedClasses: number;
    partiallyTestedClasses: number;
    untestedClasses: number;
    lowCoverageClasses: string[];
    highImpactClasses: string[];
}