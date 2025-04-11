export interface CoverageRange {
    min: number;
    max: number;
    label: string;
    color: string;
}

export interface ExclusionPattern {
    pattern: string;
    type: 'class' | 'package' | 'regex';
    description?: string; // Optional description
    enabled: boolean;
}

export interface TreeMapFilters { // Renamed
    coverageThreshold?: number;
    minValidLines?: number;
    excludeEmptyPackages?: boolean;
    excludeGeneratedCode?: boolean;
    exclusionPatterns?: ExclusionPattern[];
    searchTerm?: string;
    selectedPackage?: string;
}

export interface TreemapConfig {
    width: number;
    height: number;
    showLabels: boolean;
    themeDark: boolean;
    groupSmallNodes: boolean;
    minNodeSize: number;
    colorMode: 'default' | 'colorblind';
    coverageRanges: CoverageRange[];
    autoHideControls?: boolean;
    enableDomainGrouping?: boolean;
    showExcludedNodes?: boolean;
    filter?: TreeMapFilters;
    sortBy?: 'size' | 'coverage' | 'name';
}

export interface TreemapOptions {
    colorMode: 'default' | 'colorblind';
    showLabels: boolean;
    groupSmallNodes: boolean;
    minNodeSize: number;
    minCoverage: number;
    searchTerm: string;
    selectedPackage: string;
    minLines: number;
    sortBy: 'size' | 'coverage' | 'name';
}