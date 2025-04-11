export interface ReportSummary {
    name: string;
    date: Date;
    lineCoverage: number; // Consistent naming
    branchCoverage: number;
    linesValid: number;
    linesCovered: number;
}

export interface Report {
    packages: {
        name: string;
        classes: {
            name: string;
            lineCoverage: number;
            linesValid: number;
            linesCovered?: number;
            branchCoverage?: number;
            filename?: string;
        }[];
    }[];
}