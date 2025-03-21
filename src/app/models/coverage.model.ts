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
