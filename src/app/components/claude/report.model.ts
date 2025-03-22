export interface ReportSummary {
    name: string;
    date: Date;
    lineRate: number;
    branchRate: number;
    linesValid: number;
    linesCovered: number;
}