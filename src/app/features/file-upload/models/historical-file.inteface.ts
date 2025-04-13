export interface HistoricalFile {
    /** Unique file identifier */
    id: string;
    /** File name */
    name: string;
    /** Date when file was added */
    date: Date;
    /** File size in bytes (if available) */
    size?: number;
    /** Coverage summary info */
    summary?: {
        lineCoverage: number;
        branchCoverage?: number;
        timestamp: string;
    };
    /** File type */
    type: 'xml' | 'json' | 'sample';
}