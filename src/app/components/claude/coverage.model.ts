export interface CoverageSummary {
    lineRate: number;
    branchRate: number;
    methodRate: number;
    classRate: number;
    complexity: number;
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

export interface ClassRisk {
    name: string;
    path: string;
    coverage: number;
    linesValid: number;
    branchRate: number;
    riskScore: number;
}

export interface HistoryEntry {
    date: Date;
    data: CoverageData;
}

export interface ChartMetric {
    id: string;
    label: string;
    color: string;
    enabled: boolean;
    accessor: (entry: any, index?: number, array?: any[]) => number;
}

export interface TimeRange {
    value: string;
    label: string;
    days: number;
}

export interface TreeNode {
    name: string;
    fullPath?: string;
    isNamespace: boolean;
    coverage: number;
    value: number;
    children: TreeNode[];
    [key: string]: any; // For additional properties
}

export interface Coverage {
    className: string;
    packageName: string;
    coverage: number;
    linesValid: number;
    linesCovered?: number;
    branchRate?: number;
    filename?: string;
    path?: string;
    fullPath?: string;
    isNamespace?: boolean;
    value?: number;
    children?: Coverage[];
    matchesSearch?: boolean;
    containsMatch?: boolean;
}

export interface Report {
    packages: {
        name: string;
        classes: {
            name: string;
            coverage: number;
            linesValid: number;
            linesCovered?: number;
            branchRate?: number;
            filename?: string;
        }[];
    }[];
}