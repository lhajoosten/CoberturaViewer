/**
 * Base interface for coverage metrics
 * All coverage-related entities extend from this
 */
export interface CoverageMetrics {
    /** Line coverage percentage (0-100) */
    lineCoverage: number;
    /** Branch coverage percentage (0-100) */
    branchCoverage: number;
    /** Number of valid code lines */
    linesValid: number;
    /** Number of covered code lines */
    linesCovered: number;
    /** Number of valid branches */
    branchesValid: number;
    /** Number of covered branches */
    branchesCovered: number;
}

/**
 * Information about code coverage conditions
 */
export interface ConditionInfo {
    /** Coverage percentage (0-100) */
    coverage: number;
    /** Total number of conditions */
    total: number;
    /** Number of covered conditions */
    covered: number;
}

/**
 * Information about a single line of code
 */
export interface LineInfo {
    /** Line number in the source file */
    number: number;
    /** Number of times this line was executed */
    hits: number;
    /** Whether this line contains branching logic */
    branch: boolean;
    /** Detailed condition coverage if branch is true */
    conditions?: ConditionInfo;
}

/**
 * Coverage information for a method/function
 */
export interface MethodInfo extends CoverageMetrics {
    /** Method name */
    name: string;
    /** Method signature */
    signature: string;
    /** Cyclomatic complexity */
    complexity: number;
}

/**
 * Coverage information for a class/file
 */
export interface ClassInfo extends CoverageMetrics {
    /** Class name */
    name: string;
    /** Source file path */
    filename: string;
    /** Individual line coverage info */
    lines: LineInfo[];
    /** Coverage details for methods */
    methods?: MethodInfo[];
    /** Cyclomatic complexity */
    complexity?: number;
}

/**
 * Coverage information for a package/namespace
 */
export interface PackageInfo extends CoverageMetrics {
    /** Package name */
    name: string;
    /** Classes within this package */
    classes: ClassInfo[];
    /** Method coverage percentage (0-100) */
    methodCoverage?: number;
    /** Condition coverage percentage (0-100) */
    conditionCoverage?: number;
    /** Cyclomatic complexity */
    complexity?: number;
    /** UI state - whether this package is expanded in the view */
    expanded?: boolean;
}

/**
 * Extended coverage summary with timestamp information
 */
export interface CoverageSummary extends CoverageMetrics {
    /** Method coverage percentage (0-100) */
    methodCoverage?: number;
    /** Class coverage percentage (0-100) */
    classCoverage?: number;
    /** Cyclomatic complexity */
    complexity: number;
    /** Generation timestamp */
    timestamp: string;
    /** Number of valid methods */
    methodsValid?: number;
    /** Number of covered methods */
    methodsCovered?: number;
    /** Number of valid conditions */
    conditionsValid?: number;
    /** Number of covered conditions */
    conditionsCovered?: number;
}

/**
 * Complete coverage data for a project
 */
export interface CoverageData {
    /** Summary of coverage data */
    summary: CoverageSummary;
    /** List of packages */
    packages: PackageInfo[];
}

/**
 * Node for tree representation of coverage data
 */
export interface TreeNode extends CoverageMetrics {
    /** Node name (class or package name) */
    name: string;
    /** Whether this node represents a namespace/package */
    isNamespace: boolean;
    /** Size value for visualization scaling */
    value?: number;
    /** Child nodes */
    children?: TreeNode[];
    /** Package name if a class node */
    packageName?: string;
    /** Source filename if a class node */
    filename?: string;
    /** Original data reference */
    originalData?: any;
    /** Whether this node is a domain group */
    isDomainGroup?: boolean;
    /** Whether this node is a grouped node representing multiple smaller nodes */
    isGroupedNode?: boolean;
    /** Cyclomatic complexity */
    complexity?: number;
    /** Parent node reference */
    parent?: TreeNode;
}

/**
 * Risk assessment for a class
 */
export interface ClassRisk {
    /** Class name */
    name: string;
    /** Full class path including package */
    path: string;
    /** Line coverage percentage (0-100) */
    coverage: number;
    /** Number of valid lines */
    linesValid: number;
    /** Branch coverage percentage (0-100) */
    branchCoverage: number;
    /** Calculated risk score (higher means more risk) */
    riskScore: number;
}

/**
 * Insight information generated from coverage analysis
 */
export interface CoverageInsight {
    /** Insight type for styling */
    type: 'success' | 'warning' | 'danger' | 'info';
    /** Insight title */
    title: string;
    /** Detailed description */
    description: string;
    /** Icon to display */
    icon: string;
    /** Whether insight details are expanded */
    expanded?: boolean;
    /** Additional details text */
    details?: string;
    /** Related link if applicable */
    link?: string;
}

/**
 * Historic coverage data entry
 */
export interface HistoryEntry {
    /** Timestamp when this data was recorded */
    date: Date;
    /** Coverage data snapshot */
    data: CoverageData;
}

/**
 * Metric definition for charts
 */
export interface ChartMetric {
    /** Unique identifier */
    id: string;
    /** Display label */
    label: string;
    /** Display color */
    color: string;
    /** Whether metric is enabled */
    enabled: boolean;
    /** Function to access metric value from data */
    accessor: (entry: any, index?: number, array?: any[]) => number;
}

/**
 * Time range option for filtering
 */
export interface TimeRange {
    /** Value identifier */
    value: string;
    /** Display label */
    label: string;
    /** Number of days in range */
    days: number;
}

/**
 * Options for building a hierarchy of coverage data
 */
export interface BuildHierarchyOptions {
    /** Whether to group small nodes into a single node */
    groupSmallNodes?: boolean;
    /** Minimum size of nodes to be considered small */
    smallNodeThreshold?: number;
    /** Whether to simplify names */
    simplifyNames?: boolean;
}

/**
 * Snapshot of coverage data at a specific time
 */
export interface CoverageSnapshot extends CoverageMetrics {
    /** Coverage data for this snapshot */
    timestamp: string;
    /** Date of snapshot */
    date: Date;
}

/**
 * Coverage threshold levels
 */
export interface CoverageThresholds {
    excellent: number;
    good: number;
    average: number;
}

/**
 * Coverage distribution statistics
 */
export interface CoverageDistribution {
    excellent: number;
    good: number;
    average: number;
    poor: number;
}

/**
 * Count of classes by coverage level
 */
export interface ClassCountByLevel {
    excellent: number;
    good: number;
    average: number;
    poor: number;
}