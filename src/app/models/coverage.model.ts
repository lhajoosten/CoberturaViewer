/** Basic information about a code line's coverage status */
export interface LineInfo {
    number: number;
    hits: number;
    branch: boolean;
    conditions?: ConditionInfo; // Optional if not always used
}

/** Coverage information for a specific method/function */
export interface MethodInfo {
    name: string;
    signature: string;
    lineCoverage: number; // Standardized naming
    branchCoverage: number;
    complexity: number;
}

/** Coverage information for a single class/file */
export interface ClassInfo {
    name: string;
    filename: string;
    lineCoverage: number;   // Standardized naming
    branchCoverage: number;
    lines: LineInfo[];
    methods?: MethodInfo[];
    complexity?: number;
    linesValid?: number;
    linesCovered?: number;
}

/** Coverage information for a package/namespace */
export interface PackageInfo {
    name: string;
    lineCoverage: number;
    branchCoverage: number;
    classes: ClassInfo[];
    methodCoverage?: number; // Optional if not always used
    conditionCoverage?: number; // Optional
    complexity?: number;
    expanded?: boolean;
}

/** Aggregated coverage metrics for the entire codebase */
export interface CoverageSummary {
    lineCoverage: number;
    branchCoverage: number;
    methodCoverage?: number;  // Optional
    classCoverage?: number;   // Optional
    complexity: number;
    linesValid: number;
    linesCovered: number;
    timestamp: string;
    methodsValid?: number;    // Optional
    methodsCovered?: number; // Optional
    conditionsValid?: number; // Optional
    conditionsCovered?: number; // Optional
}

/** Complete coverage data for a project */
export interface CoverageData {
    summary: CoverageSummary;
    packages: PackageInfo[];
}

/** Simplified coverage info for display */
export interface CoverageElement { // Renamed from Coverage
    name: string;
    className?: string;
    packageName?: string;
    lineCoverage: number;
    branchCoverage?: number;
    linesValid: number;
    linesCovered?: number;
    filename?: string;
    path?: string;
    fullPath?: string;
    isNamespace?: boolean;
    isGroupedNode?: boolean;
    value?: number;
    children?: CoverageElement[];
    originalData?: ClassInfo | PackageInfo | null;
    isDomainGroup?: boolean;
}

/** Tree node structure for hierarchical data */
export interface TreeNode {
    name: string;
    lineCoverage: number; // Consistent naming
    branchCoverage?: number;
    complexity?: number;
    linesValid: number;
    linesCovered?: number;
    isNamespace: boolean;
    value?: number;
    children?: TreeNode[];
    packageName?: string;
    filename?: string;
    originalData?: any;
    isDomainGroup?: boolean;
    isGroupedNode?: boolean;
}

export interface ConditionInfo {
    coverage: number;
    total: number;
    covered: number;
}

export interface ClassRisk {
    name: string;
    path: string;
    coverage: number;
    linesValid: number;
    branchCoverage: number;
    riskScore: number;
}

export interface CoverageInsight {
    type: 'success' | 'warning' | 'danger' | 'info';
    title: string;
    description: string;
    icon: string;
    expanded?: boolean;
    details?: string;
    link?: string;
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