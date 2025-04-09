/**
 * Basic information about a code line's coverage status
 * Used for detailed line-by-line coverage analysis
 */
export interface LineInfo {
    /** The line number in the source file */
    number: number;

    /** Number of times this line was executed */
    hits: number;

    /** Whether this line contains a branch decision point */
    branch: boolean;

    /** Collection of condition coverage data */
    conditions?: ConditionInfo;
}

/**
 * Coverage information for a single class/file
 * Contains detailed metrics about a specific code unit
 */
export interface ClassInfo {
    /** Name of the class */
    name: string;

    /** Source filename containing this class */
    filename: string;

    /** Percentage of lines covered (0.0-1.0) */
    lineRate: number;

    /** Percentage of branches covered (0.0-1.0) */
    branchRate: number;

    /** Collection of individual line coverage data */
    lines: LineInfo[];

    /** Collection of method coverage data */
    methods?: MethodInfo[];

    /** Complexity */
    complexity?: number;

    /** Collection of condition coverage data */
    linesValid?: number;   // Add this

    /** Total number of lines that could be covered */
    linesCovered?: number; // Add this
}

/**
 * Coverage information for a package/namespace
 * Groups classes that belong to the same package
 */
export interface PackageInfo {
    /** Name of the package/namespace */
    name: string;

    /** Aggregate line coverage for the entire package (0.0-1.0) */
    lineRate: number;

    /** Aggregate branch coverage for the entire package (0.0-1.0) */
    branchRate: number;

    /** Collection of classes contained within this package */
    classes: ClassInfo[];

    /** Collection of method coverage data */
    methodRate?: number;

    /** Collection of condition coverage data */
    conditionRate?: number;

    /** Complexity */
    complexity?: number;
}

/**
 * Aggregated coverage metrics for the entire codebase
 * Provides a high-level overview of test coverage
 */
export interface CoverageSummary {
    /** Overall line coverage rate (0.0-1.0) */
    lineRate: number;

    /** Overall branch coverage rate (0.0-1.0) */
    branchRate: number;

    /** Overall method coverage rate (0.0-1.0) */
    methodRate: number;

    /** Overall class coverage rate (0.0-1.0) */
    classRate: number;

    /** Code complexity metric */
    complexity: number;

    /** Total number of lines that could be covered */
    linesValid: number;

    /** Actual number of lines covered */
    linesCovered: number;

    /** When the coverage data was generated */
    timestamp: string;

    /** Total number of classes/files analyzed */
    methodsValid?: number

    /** Total number of classes/files covered */
    methodsCovered?: number

    /** Total number of branches analyzed */
    conditionsValid?: number

    /** Total number of branches covered */
    conditionsCovered?: number
}

/**
 * Complete coverage data for a project
 * Contains both the summary and detailed package information
 */
export interface CoverageData {
    /** Aggregated coverage metrics for the entire codebase */
    summary: CoverageSummary;

    /** Detailed coverage information organized by packages */
    packages: PackageInfo[];
}

/**
 * Derived metrics calculated from coverage data
 * Used for dashboard displays and analytics
 */
export interface CoverageMetrics {
    /** Total number of packages/namespaces */
    totalPackages: number;

    /** Total number of classes/files */
    totalClasses: number;

    /** Total number of lines analyzed */
    totalLines: number;

    /** Number of lines with coverage */
    coveredLines: number;

    /** Number of lines without coverage */
    uncoveredLines: number;

    /** Count of classes with 100% coverage */
    fullyTestedClasses: number;

    /** Count of classes with partial coverage */
    partiallyTestedClasses: number;

    /** Count of classes with 0% coverage */
    untestedClasses: number;

    /** List of classes with low coverage that need attention */
    lowCoverageClasses: string[];

    /** List of critical classes with coverage issues */
    highImpactClasses: string[];
}

/**
 * Risk assessment for a specific class/file
 * Combines coverage metrics with importance to determine risk level
 */
export interface ClassRisk {
    /** Name of the class */
    name: string;

    /** File path location */
    path: string;

    /** Coverage percentage (0-100) */
    coverage: number;

    /** Total number of lines that could be covered */
    linesValid: number;

    /** Branch coverage rate (0.0-1.0) */
    branchRate: number;

    /** Calculated risk score based on coverage and complexity */
    riskScore: number;
}

/**
 * Visual insight derived from coverage analysis
 * Used to present important findings to users
 */
export interface CoverageInsight {
    /** Category determining visual styling */
    type: 'success' | 'warning' | 'danger' | 'info';

    /** Short heading describing the insight */
    title: string;

    /** Detailed explanation of the insight */
    description: string;

    /** Visual icon representing the insight type */
    icon: string;
}

/**
 * Historical coverage data entry
 * Used for tracking coverage changes over time
 */
export interface HistoryEntry {
    /** When this coverage data was recorded */
    date: Date;

    /** Complete coverage information for this point in time */
    data: CoverageData;
}

/**
 * Configuration for a specific metric displayed in charts
 * Defines how metrics are rendered and accessed
 */
export interface ChartMetric {
    /** Unique identifier for the metric */
    id: string;

    /** Display name for the metric */
    label: string;

    /** Color used to represent this metric in visualizations */
    color: string;

    /** Whether this metric is currently displayed */
    enabled: boolean;

    /** Function to extract the metric value from a data entry */
    accessor: (entry: any, index?: number, array?: any[]) => number;
}

/**
 * Defines a time period for historical data analysis
 * Used for filtering historical coverage data
 */
export interface TimeRange {
    /** Machine-readable identifier */
    value: string;

    /** Human-readable description */
    label: string;

    /** Number of days in this time range */
    days: number;
}

/**
 * Detailed coverage information for a code element
 * Used for displaying coverage data in visualizations
 */
export interface Coverage {
    /** Name of the class */
    className: string;

    /** Name of the package containing this class */
    packageName?: string;

    /** Coverage percentage (0-100) */
    coverage: number;

    /** Total number of lines that could be covered */
    linesValid: number;

    /** Actual number of lines covered */
    linesCovered?: number;

    /** Branch coverage rate (0.0-1.0) */
    branchRate?: number;

    /** Name of the file without path */
    filename?: string;

    /** Directory path */
    path?: string;

    /** Complete path identifier including all parent elements */
    fullPath?: string;

    /** Whether this element represents a namespace/package */
    isNamespace?: boolean;

    /** Whether this node represents a logical domain grouping */
    isDomainGroup?: boolean;

    /** Size metric used for visualization */
    value?: number;

    /** Child nodes contained within this element */
    children?: Coverage[];
}

/**
 * Tree node structure for hierarchical data visualization
 * Used specifically for building treemap hierarchies
 */
export interface TreeNode {
    name: string;          // Name of the node (package or class)
    coverage: number;      // Line coverage percentage
    branchRate?: number;   // Optional: Branch coverage percentage
    complexity?: number;   // Optional: Cyclomatic complexity
    linesValid: number;    // Total valid lines for coverage
    linesCovered?: number; // Total lines covered
    isNamespace: boolean;  // True if it's a package/grouping node, false for class/leaf
    value?: number;        // Size metric for visualization (e.g., linesValid)
    children?: TreeNode[]; // Child nodes
    packageName?: string;  // Name of the parent package (useful for class nodes)
    filename?: string;     // Filename (for class nodes)
    originalData?: any;    // Optional: Reference to the original ClassInfo/PackageInfo if needed
    isDomainGroup?: boolean; // Optional: Flag for domain grouping feature
    isGroupedNode?: boolean;
}

/**
 * Coverage information for a specific method/function
 * Used for analyzing method-level coverage and complexity
 */
export interface MethodInfo {
    name: string;
    signature: string;
    lineRate: number;
    branchRate: number;
    complexity: number;
}

/**
 * Coverage information for a specific condition within a method
 * Used for analyzing branch-level coverage and complexity
 */
export interface ConditionInfo {
    coverage: number; // e.g. 100
    total: number;    // e.g. 2
    covered: number;  // e.g. 2
}