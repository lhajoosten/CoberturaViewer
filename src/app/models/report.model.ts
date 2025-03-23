/**
 * Summarizes key metrics from a code coverage report
 * Provides aggregate coverage information for the entire codebase
 */
export interface ReportSummary {
    /** Name of the coverage report */
    name: string;

    /** Date when the report was generated */
    date: Date;

    /** Overall line coverage rate (0.0-1.0) */
    lineRate: number;

    /** Overall branch coverage rate (0.0-1.0) */
    branchRate: number;

    /** Total number of lines that could be covered */
    linesValid: number;

    /** Actual number of lines covered */
    linesCovered: number;
}

/**
 * Simplified structure for report data
 * Used for generating coverage reports
 */
export interface Report {
    /** Collection of packages in the report */
    packages: {
        /** Name of the package */
        name: string;

        /** Classes contained in this package */
        classes: {
            /** Name of the class */
            name: string;

            /** Coverage percentage (0-100) */
            coverage: number;

            /** Total number of lines that could be covered */
            linesValid: number;

            /** Actual number of lines covered */
            linesCovered?: number;

            /** Branch coverage rate (0.0-1.0) */
            branchRate?: number;

            /** Source filename containing this class */
            filename?: string;
        }[];
    }[];
}