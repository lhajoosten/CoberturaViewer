// treemap-config.model.ts

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
 * Filter configuration for the treemap visualization
 * Controls which nodes are included or excluded
 */
export interface TreemapFilter {
    /** Packages to exclude by name or pattern */
    packageExclusions?: string[];

    /** Class names to exclude by name or pattern */
    classNameExclusions?: string[];

    /** Exclude nodes below this coverage percentage threshold */
    coverageThreshold?: number;

    /** Exclude nodes with fewer valid lines than this value */
    minValidLines?: number;

    /** Whether to exclude packages with no valid lines */
    excludeEmptyPackages?: boolean;

    /** Whether to exclude compiler-generated code */
    excludeGeneratedCode?: boolean;

    /** User-defined exclusion patterns for more complex filtering */
    exclusionPatterns?: ExclusionPattern[];

    /** Search term for filtering nodes by name */
    searchTerm?: string;

    /** Selected package for filtering */
    selectedPackage?: string;
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

    /** Active filters */
    filter?: TreemapFilter;

    /** How to sort displayed nodes */
    sortBy?: 'size' | 'coverage' | 'name';
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