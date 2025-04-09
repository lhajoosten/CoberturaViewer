import { Injectable } from '@angular/core';
import { NotificationService } from './utils/notification.service';
import { CoverageData, CoverageSummary, PackageInfo, ClassInfo, MethodInfo, LineInfo, ConditionInfo } from '../models/coverage.model';

@Injectable({
    providedIn: 'root'
})
export class CoberturaParserService {

    // Inject NotificationService
    constructor(private notificationService: NotificationService) { }

    public parseCoberturaXml(xmlContent: string): CoverageData | null {
        let errorTitle = 'XML Parsing Error';
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                errorTitle = 'Invalid XML Format';
                // Use textContent for potentially more detailed error from the parser
                throw new Error(parserError.textContent || 'The provided file is not valid XML.');
            }

            // --- Overall Summary ---
            const coverageElement = xmlDoc.getElementsByTagName('coverage')[0];
            if (!coverageElement) {
                errorTitle = 'Invalid Cobertura Format';
                throw new Error('Missing required <coverage> element.');
            }

            // Initialize summary with defaults and placeholders for aggregation
            const summary: CoverageSummary = {
                lineRate: this.parseRate(coverageElement.getAttribute('line-rate')),
                branchRate: this.parseRate(coverageElement.getAttribute('branch-rate')),
                methodRate: this.parseRate(coverageElement.getAttribute('method-rate') || coverageElement.getAttribute('methods')),
                classRate: this.parseRate(coverageElement.getAttribute('class-rate') || coverageElement.getAttribute('classes')),
                complexity: parseFloat(coverageElement.getAttribute('complexity') || '0'),
                linesValid: 0, // Will be aggregated
                linesCovered: 0, // Will be aggregated
                timestamp: coverageElement.getAttribute('timestamp') || new Date().toISOString(), // Default timestamp
                methodsValid: 0, // Will be aggregated
                methodsCovered: 0, // Will be aggregated
                conditionsValid: 0, // Will be aggregated
                conditionsCovered: 0, // Will be aggregated
            };

            // --- Packages ---
            const packages: PackageInfo[] = [];
            const packageElements = coverageElement.getElementsByTagName('package');

            for (let i = 0; i < packageElements.length; i++) {
                const pkgElement = packageElements[i];
                const packageName = pkgElement.getAttribute('name') || 'Default Package';
                const classes: ClassInfo[] = [];
                const classElements = pkgElement.getElementsByTagName('class');
                // Reset package aggregates
                let pkgLinesValid = 0, pkgLinesCovered = 0, pkgBranchesValid = 0, pkgBranchesCovered = 0;
                let pkgMethodsValid = 0, pkgMethodsCovered = 0, pkgConditionsValid = 0, pkgConditionsCovered = 0;
                let pkgComplexity = 0;

                for (let j = 0; j < classElements.length; j++) {
                    const clsElement = classElements[j];
                    const rawClassName = clsElement.getAttribute('name') || 'Unknown Class';
                    const className = rawClassName.includes('/') ? rawClassName.substring(rawClassName.lastIndexOf('/') + 1) : rawClassName;

                    // --- Methods ---
                    const methods: MethodInfo[] = [];
                    // ... (method parsing logic remains the same) ...

                    // --- Lines ---
                    const lines: LineInfo[] = [];
                    const lineElements = clsElement.getElementsByTagName('line');
                    // Use these for calculations IF attributes are missing
                    let calculatedLinesValid = 0;
                    let calculatedLinesCovered = 0;
                    let calculatedBranchesValid = 0;
                    let calculatedBranchesCovered = 0;
                    // ... loop through lineElements ...
                    for (let k = 0; k < lineElements.length; k++) {
                        const lineElement = lineElements[k];
                        const hits = parseInt(lineElement.getAttribute('hits') || '0', 10);
                        const isBranch = lineElement.getAttribute('branch') === 'true';
                        const conditionCoverage = lineElement.getAttribute('condition-coverage');
                        let conditions: ConditionInfo | undefined = undefined;

                        if (isBranch && conditionCoverage) {
                            const match = conditionCoverage.match(/(\d+)%\s*\((\d+)\/(\d+)\)/);
                            if (match) {
                                const covered = parseInt(match[2], 10);
                                const total = parseInt(match[3], 10);
                                if (!isNaN(covered) && !isNaN(total) && total > 0) {
                                    conditions = { coverage: parseInt(match[1], 10), covered: covered, total: total };
                                    calculatedBranchesValid += total;
                                    calculatedBranchesCovered += covered;
                                    pkgConditionsValid += total;
                                    pkgConditionsCovered += covered;
                                }
                            }
                        }
                        lines.push({ number: parseInt(lineElement.getAttribute('number') || '0', 10), hits, branch: isBranch, conditions });
                        calculatedLinesValid++;
                        if (hits > 0) calculatedLinesCovered++;
                    }

                    // *** NEW: Prioritize class attributes for lines/branches ***
                    const attrLinesValid = parseInt(clsElement.getAttribute('lines-valid') || '-1', 10);
                    const attrLinesCovered = parseInt(clsElement.getAttribute('lines-covered') || '-1', 10);
                    // Branch attributes might exist too, add if needed:
                    const attrBranchesValid = parseInt(clsElement.getAttribute('branches-valid') || '-1', 10);
                    const attrBranchesCovered = parseInt(clsElement.getAttribute('branches-covered') || '-1', 10);

                    const classLinesValid = attrLinesValid !== -1 ? attrLinesValid : calculatedLinesValid;
                    const classLinesCovered = attrLinesCovered !== -1 ? attrLinesCovered : calculatedLinesCovered;
                    const classBranchesValid = attrBranchesValid !== -1 ? attrBranchesValid : calculatedBranchesValid;
                    const classBranchesCovered = attrBranchesCovered !== -1 ? attrBranchesCovered : calculatedBranchesCovered;
                    // Use calculated branch numbers for rate for now
                    const classBranchesValidForRate = calculatedBranchesValid;
                    const classBranchesCoveredForRate = calculatedBranchesCovered;


                    // Calculate rates
                    const classLineRate = classLinesValid > 0 ? (classLinesCovered / classLinesValid) * 100 : 0;
                    const classBranchRate = classBranchesValidForRate > 0 ? (classBranchesCoveredForRate / classBranchesValidForRate) * 100 : 0;
                    const classComplexity = parseFloat(clsElement.getAttribute('complexity') || '0') || methods.reduce((sum, m) => sum + m.complexity, 0); // Sum method complexity if class attr missing

                    classes.push({
                        name: className,
                        filename: clsElement.getAttribute('filename') || '',
                        lineRate: this.clampRate(classLineRate), // Use calculated rate & clamp
                        branchRate: this.clampRate(classBranchRate), // Use calculated rate & clamp
                        complexity: classComplexity,
                        methods: methods,
                        lines: lines,
                        linesValid: classLinesValid,
                        linesCovered: classLinesCovered,
                    });

                    // Aggregate package counts using the determined class counts
                    pkgLinesValid += classLinesValid;
                    pkgLinesCovered += classLinesCovered;
                    pkgBranchesValid += classBranchesValidForRate; // Use counts used for rate
                    pkgBranchesCovered += classBranchesCoveredForRate;
                    pkgMethodsValid += methods.length;
                    pkgMethodsCovered += methods.filter(m => m.lineRate > 0).length;
                    pkgComplexity += classComplexity;
                    pkgConditionsValid += classBranchesValid;
                    pkgConditionsCovered += classBranchesCovered;
                }

                // Calculate package rates
                const pkgLineRate = pkgLinesValid > 0 ? (pkgLinesCovered / pkgLinesValid) * 100 : 0;
                const pkgBranchRate = pkgBranchesValid > 0 ? (pkgBranchesCovered / pkgBranchesValid) * 100 : 0;
                const pkgMethodRate = pkgMethodsValid > 0 ? (pkgMethodsCovered / pkgMethodsValid) * 100 : 0;
                const finalPkgComplexity = parseFloat(pkgElement.getAttribute('complexity') || '0') || pkgComplexity;

                packages.push({
                    name: packageName,
                    lineRate: this.clampRate(pkgLineRate),
                    branchRate: this.clampRate(pkgBranchRate),
                    methodRate: this.clampRate(pkgMethodRate),
                    // conditionRate: ..., // Calculate if needed
                    complexity: finalPkgComplexity,
                    classes
                });

                // Aggregate summary counts
                summary.linesValid += pkgLinesValid;
                summary.linesCovered += pkgLinesCovered;
                summary.methodsValid = (summary.methodsValid ?? 0) + pkgMethodsValid;
                summary.methodsCovered = (summary.methodsCovered ?? 0) + pkgMethodsCovered;
                summary.branchRate = this.clampRate((summary.branchRate + pkgBranchRate) / 2); // Average for summary
                summary.lineRate = this.clampRate((summary.lineRate + pkgLineRate) / 2); // Average for summary
                summary.complexity += finalPkgComplexity;
                summary.conditionsValid! += pkgConditionsValid;
                summary.conditionsCovered! += pkgConditionsCovered;

                if (summary.complexity === 0) { summary.complexity += finalPkgComplexity; }
            }

            // Final summary rate calculation (if needed)
            if (summary.lineRate === 0 && summary.linesValid > 0) { /* ... */ }
            if (summary.methodRate === 0 && (summary.methodsValid ?? 0) > 0) { /* ... */ }
            // ... clamp summary rates ...

            if (summary.linesValid === 0 && packages.length === 0) { /* ... error handling ... */ }

            return { summary, packages };

        } catch (error: any) {
            console.error(`Failed to parse Cobertura XML: ${error.message}`);
            this.notificationService.showError(errorTitle, error.message || 'Could not process the file.');
            return null;
        }
    }

    private parseRate(rateStr: string | null): number {
        if (rateStr === null || rateStr === undefined) return 0;
        const rate = parseFloat(rateStr);
        if (isNaN(rate)) return 0;
        return this.clampRate(rate * 100); // Clamp after converting to percentage
    }

    // Helper to clamp rates between 0 and 100
    private clampRate(rate: number): number {
        return Math.max(0, Math.min(100, Math.round(rate * 100) / 100));
    }
}