/**
 * Definition of a coverage range for visualizations
 */
export interface CoverageRange {
    /** Minimum coverage value for this range */
    min: number;
    /** Maximum coverage value for this range */
    max: number;
    /** Display label */
    label: string;
    /** Color code for visualization */
    color: string;
}

/**
 * Pattern for excluding elements from visualizations
 */
export interface ExclusionPattern {
    /** Pattern string to match */
    pattern: string;
    /** Type of element to exclude */
    type: 'class' | 'package' | 'regex';
    /** Optional description of why this pattern exists */
    description?: string;
    /** Whether the pattern is currently active */
    enabled: boolean;
}

/**
 * Filters for treemap visualization
 */
export interface TreeMapFilters {
    /** Minimum coverage threshold to display */
    coverageThreshold?: number;
    /** Minimum line count to display */
    minValidLines?: number;
    /** Whether to exclude empty packages */
    excludeEmptyPackages?: boolean;
    /** Whether to exclude generated code */
    excludeGeneratedCode?: boolean;
    /** Patterns for excluding elements */
    exclusionPatterns?: ExclusionPattern[];
    /** Search term for filtering */
    searchTerm?: string;
    /** Selected package for filtering */
    selectedPackage?: string;
}

/**
 * Configuration for treemap visualization
 */
export interface TreemapConfig {
    /** Chart width in pixels */
    width: number;
    /** Chart height in pixels */
    height: number;
    /** Whether to show labels */
    showLabels: boolean;
    /** Whether to use dark theme */
    themeDark: boolean;
    /** Whether to group small nodes */
    groupSmallNodes: boolean;
    /** Minimum node size to display individually */
    minNodeSize: number;
    /** Color mode selection */
    colorMode: 'default' | 'colorblind';
    /** Coverage range definitions */
    coverageRanges: CoverageRange[];
    /** Whether to auto-hide controls */
    autoHideControls?: boolean;
    /** Whether to enable domain grouping */
    enableDomainGrouping?: boolean;
    /** Whether to show excluded nodes */
    showExcludedNodes?: boolean;
    /** Active filters */
    filter?: TreeMapFilters;
    /** Sort criteria */
    sortBy?: 'size' | 'coverage' | 'name';
}

/**
 * Simplified options for treemap views
 */
export interface TreemapOptions {
    /** Color mode selection */
    colorMode: 'default' | 'colorblind';
    /** Whether to show labels */
    showLabels: boolean;
    /** Whether to group small nodes */
    groupSmallNodes: boolean;
    /** Minimum node size to display individually */
    minNodeSize: number;
    /** Minimum coverage threshold to display */
    minCoverage: number;
    /** Search term for filtering */
    searchTerm: string;
    /** Selected package for filtering */
    selectedPackage: string;
    /** Minimum line count to display */
    minLines: number;
    /** Sort criteria */
    sortBy: 'size' | 'coverage' | 'name';
}