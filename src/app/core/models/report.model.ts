import { CoverageData } from './coverage.model';

export interface ReportMetadata {
    /** Unique identifier for the report */
    id: string;
    /** User-friendly name for the report */
    name: string;
    /** Date when the report was created */
    createdDate: Date;
    /** Original file name if imported from file */
    originalFileName?: string;
    /** File size in bytes */
    fileSize?: number;
    /** Version or branch info */
    version?: string;
    /** User-provided description */
    description?: string;
    /** Tags for categorization */
    tags?: string[];
}

export interface SavedReport {
    /** Report metadata */
    metadata: ReportMetadata;
    /** The actual coverage data */
    data: CoverageData;
}

export interface ReportHistoryEntry {
    /** Reference to the report ID */
    reportId: string;
    /** When the report was accessed */
    accessDate: Date;
    /** Action performed with the report (view, compare, etc.) */
    action: 'view' | 'compare' | 'export' | 'edit';
}

export interface ReportComparison {
    /** Source report (typically older) */
    sourceReport: SavedReport;
    /** Target report (typically newer) */
    targetReport: SavedReport;
    /** Comparison date */
    comparisonDate: Date;
    /** Summary of changes */
    changesSummary: {
        lineCoverageChange: number;
        branchCoverageChange: number;
        methodCoverageChange: number;
        newPackages: string[];
        removedPackages: string[];
        newClasses: { packageName: string, className: string }[];
        removedClasses: { packageName: string, className: string }[];
    };
}

export interface ReportFilter {
    /** Search text to filter by name */
    searchText?: string;
    /** Filter by specific date range */
    dateRange?: {
        start: Date;
        end: Date;
    };
    /** Filter by coverage threshold */
    coverageThreshold?: {
        min: number;
        max: number;
    };
    /** Filter by tags */
    tags?: string[];
}

export interface ReportSortOptions {
    /** Field to sort by */
    field: 'name' | 'date' | 'coverage' | 'fileSize';
    /** Sort direction */
    direction: 'asc' | 'desc';
}