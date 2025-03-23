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
    /** Display name of the node */
    name: string;

    /** Package or namespace name */
    packageName?: string;

    /** Coverage percentage (0-100) */
    coverage: number;

    /** Total lines of code in this node */
    linesValid: number;

    /** Lines of code covered by tests */
    linesCovered?: number;

    /** Whether this node represents a namespace/package */
    isNamespace?: boolean;

    /** Whether this node represents a domain group */
    isDomainGroup?: boolean;

    /** Size value for visualization scaling */
    value?: number;

    /** Child nodes in the hierarchy */
    children?: TreeNode[];

    /** Original Coverage object this node was created from */
    originalData?: any;
}