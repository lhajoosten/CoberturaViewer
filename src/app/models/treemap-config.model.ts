/**
 * Hierarchical node structure for tree visualization
 */
export interface TreeNode {
    name: string;
    fullPath?: string;
    fullName?: string;
    isNamespace: boolean;
    coverage: number;
    value: number;
    children: TreeNode[];

    // Optional fields
    branchRate?: number;
    linesValid?: number;
    linesCovered?: number;
    path?: string;
    filename?: string;

    // Search-related flags
    matchesSearch?: boolean;
    containsMatch?: boolean;

    // Other metadata
    namespaceType?: string;

    // Allow for other properties
    [key: string]: any;
}

/**
 * Configuration options for the treemap layout
 */
export interface TreemapConfig {
    width: number;
    height: number;
    showLabels: boolean;
    themeDark: boolean;
    groupSmallNodes: boolean;
    minNodeSize: number;
    colorMode: 'default' | 'colorblind';
    coverageRanges: Array<{ min: number, max: number, label: string, color: string }>;
    autoHideControls: boolean;
}

/**
 * Configuration options for the treemap
 */
export interface TreemapOptions {
    colorMode: 'default' | 'colorblind';
    showLabels: boolean;
    groupSmallNodes: boolean;
    minNodeSize: number;

    // Filter options
    minCoverage: number;
    searchTerm: string;
    selectedPackage: string;
    minLines: number;
    sortBy: 'size' | 'coverage' | 'name';
}