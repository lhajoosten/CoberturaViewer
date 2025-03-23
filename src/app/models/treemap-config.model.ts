/**
 * Defines a coverage percentage range with visual properties
 * Used for color-coding nodes based on their coverage level
 */
export interface CoverageRange {
    /** Lower bound percentage (inclusive) */
    min: number;

    /** Upper bound percentage (inclusive) */
    max: number;

    /** Display name for this range (e.g. "Low", "Medium", "High") */
    label: string;

    /** CSS color value to represent this coverage range */
    color: string;
}

/**
 * Defines a pattern for excluding nodes from visualization
 * Allows filtering out specific packages, classes, or patterns
 */
export interface ExclusionPattern {
    /** The text pattern to match against nodes */
    pattern: string;

    /** The type of pattern matching to apply */
    type: 'class' | 'package' | 'regex';

    /** Human-readable explanation of what this pattern excludes */
    description: string;

    /** Whether this exclusion pattern is currently active */
    enabled: boolean;
}

/**
 * Hierarchical node structure representing code elements in a tree
 * Used as the core data structure for visualizing code coverage
 */
export interface TreeNode {
    /** Display name of the node */
    name: string;

    /** Complete path identifier including all parent elements */
    fullPath?: string;

    /** Fully qualified name of the element */
    fullName?: string;

    /** Whether this node represents a namespace/package rather than a file */
    isNamespace: boolean;

    /** Coverage percentage (0-100) */
    coverage: number;

    /** Size metric used for determining node area in visualization */
    value: number;

    /** Child nodes contained within this node */
    children: TreeNode[];

    // Coverage metrics
    /** Branch coverage percentage (0-100) */
    branchRate?: number;

    /** Total number of lines that could be covered */
    linesValid?: number;

    /** Actual number of covered lines */
    linesCovered?: number;

    // File location information
    /** Directory path */
    path?: string;

    /** Name of the file without path */
    filename?: string;

    // Search-related flags
    /** Whether this node directly matches search criteria */
    matchesSearch?: boolean;

    /** Whether this node contains any descendants that match search criteria */
    containsMatch?: boolean;

    // Classification metadata
    /** Type of namespace (e.g., "package", "module", "directory") */
    namespaceType?: string;

    // Allow for extensibility with additional properties
    [key: string]: any;
}

/**
 * Core configuration for the treemap visualization layout
 * Controls the visual appearance and behavior of the treemap
 */
export interface TreemapConfig {
    /** Width of the treemap in pixels */
    width: number;

    /** Height of the treemap in pixels */
    height: number;

    /** Whether to show text labels on nodes */
    showLabels: boolean;

    /** Whether to use dark theme colors */
    themeDark: boolean;

    /** Whether to combine small nodes into a grouped node */
    groupSmallNodes: boolean;

    /** Minimum size threshold for individual node display (in pixels) */
    minNodeSize: number;

    /** Color scheme for coverage visualization */
    colorMode: 'default' | 'colorblind';

    /** Coverage ranges used for color categorization */
    coverageRanges: CoverageRange[];

    /** Whether to automatically hide controls when not in use */
    autoHideControls?: boolean;

    /** Whether to group nodes by domain/namespace */
    enableDomainGrouping?: boolean;

    /** Whether to display nodes that match exclusion patterns */
    showExcludedNodes?: boolean;
}

/**
 * Interactive options for filtering and displaying the treemap
 * These settings can typically be changed by the user during runtime
 */
export interface TreemapOptions {
    /** Color scheme for coverage visualization */
    colorMode: 'default' | 'colorblind';

    /** Whether to show text labels on nodes */
    showLabels: boolean;

    /** Whether to combine small nodes into a grouped node */
    groupSmallNodes: boolean;

    /** Minimum size threshold for individual node display (in pixels) */
    minNodeSize: number;

    // Filtering options
    /** Minimum coverage percentage to display (0-100) */
    minCoverage: number;

    /** Text to search for in node names */
    searchTerm: string;

    /** Currently selected package/namespace for focused view */
    selectedPackage: string;

    /** Minimum number of lines for a node to be displayed */
    minLines: number;

    /** How to sort displayed nodes */
    sortBy: 'size' | 'coverage' | 'name';
}