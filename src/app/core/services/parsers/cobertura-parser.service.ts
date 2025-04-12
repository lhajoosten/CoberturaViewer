import { Injectable } from '@angular/core';
import {
    CoverageData,
    CoverageSummary,
    PackageInfo,
    ClassInfo,
    LineInfo
} from "../../models/coverage.model";
import { NotificationService } from '../utils/notification.service';

@Injectable({
    providedIn: 'root'
})
export class CoberturaParserService {
    constructor(private notificationService: NotificationService) { }

    /**
     * Parse Cobertura XML content into structured coverage data
     */
    public parseCoberturaXml(xmlContent: string): CoverageData | null {
        let errorTitle = 'XML Parsing Error';
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                errorTitle = 'Invalid XML Format';
                throw new Error(parserError.textContent || 'The provided file is not valid XML.');
            }

            // --- Overall Summary ---
            const coverageElement = xmlDoc.getElementsByTagName('coverage')[0];
            if (!coverageElement) {
                errorTitle = 'Invalid Cobertura Format';
                throw new Error('Missing required <coverage> element.');
            }

            // Initialize summary
            const summary: CoverageSummary = {
                lineCoverage: this.parseRate(coverageElement.getAttribute('line-rate')),
                branchCoverage: this.parseRate(coverageElement.getAttribute('branch-rate')),
                methodCoverage: this.parseRate(coverageElement.getAttribute('method-rate') || coverageElement.getAttribute('methods')),
                classCoverage: this.parseRate(coverageElement.getAttribute('class-rate') || coverageElement.getAttribute('classes')),
                complexity: parseFloat(coverageElement.getAttribute('complexity') || '0'),
                linesValid: 0, // Will be aggregated
                linesCovered: 0, // Will be aggregated
                branchesValid: 0, // Will be aggregated
                branchesCovered: 0, // Will be aggregated
                timestamp: coverageElement.getAttribute('timestamp') || new Date().toISOString(),
                methodsValid: 0,
                methodsCovered: 0,
                conditionsValid: 0,
                conditionsCovered: 0,
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
                    const className = rawClassName.includes('/') ?
                        rawClassName.substring(rawClassName.lastIndexOf('/') + 1) : rawClassName;

                    // --- Lines ---
                    const lines: LineInfo[] = [];
                    const lineElements = clsElement.getElementsByTagName('line');

                    // Use these for calculations IF attributes are missing
                    let calculatedLinesValid = 0;
                    let calculatedLinesCovered = 0;
                    let calculatedBranchesValid = 0;
                    let calculatedBranchesCovered = 0;

                    for (let k = 0; k < lineElements.length; k++) {
                        const lineElement = lineElements[k];
                        const hits = parseInt(lineElement.getAttribute('hits') || '0', 10);
                        const isBranch = lineElement.getAttribute('branch') === 'true';
                        const conditionCoverage = lineElement.getAttribute('condition-coverage');
                        let conditions: any = undefined;

                        if (isBranch && conditionCoverage) {
                            const match = conditionCoverage.match(/(\d+)%\s*\((\d+)\/(\d+)\)/);
                            if (match) {
                                const covered = parseInt(match[2], 10);
                                const total = parseInt(match[3], 10);
                                if (!isNaN(covered) && !isNaN(total) && total > 0) {
                                    conditions = {
                                        coverage: parseInt(match[1], 10),
                                        covered: covered,
                                        total: total
                                    };
                                    calculatedBranchesValid += total;
                                    calculatedBranchesCovered += covered;
                                    pkgConditionsValid += total;
                                    pkgConditionsCovered += covered;
                                }
                            }
                        }

                        lines.push({
                            number: parseInt(lineElement.getAttribute('number') || '0', 10),
                            hits,
                            branch: isBranch,
                            conditions
                        });

                        calculatedLinesValid++;
                        if (hits > 0) calculatedLinesCovered++;
                    }

                    // Prioritize class attributes for lines/branches
                    const attrLinesValid = parseInt(clsElement.getAttribute('lines-valid') || '-1', 10);
                    const attrLinesCovered = parseInt(clsElement.getAttribute('lines-covered') || '-1', 10);

                    // Branch attributes might exist too
                    const attrBranchesValid = parseInt(clsElement.getAttribute('branches-valid') || '-1', 10);
                    const attrBranchesCovered = parseInt(clsElement.getAttribute('branches-covered') || '-1', 10);

                    const classLinesValid = attrLinesValid !== -1 ? attrLinesValid : calculatedLinesValid;
                    const classLinesCovered = attrLinesCovered !== -1 ? attrLinesCovered : calculatedLinesCovered;
                    const classBranchesValid = attrBranchesValid !== -1 ? attrBranchesValid : calculatedBranchesValid;
                    const classBranchesCovered = attrBranchesCovered !== -1 ? attrBranchesCovered : calculatedBranchesCovered;

                    // Use calculated branch numbers for rate for now
                    const classBranchesValidForRate = calculatedBranchesValid;
                    const classBranchesCoveredForRate = calculatedBranchesCovered;

                    // Calculate coverage rates
                    const classLineCoverage = classLinesValid > 0 ? (classLinesCovered / classLinesValid) * 100 : 0;
                    const classBranchCoverage = classBranchesValidForRate > 0 ?
                        (classBranchesCoveredForRate / classBranchesValidForRate) * 100 : 0;
                    const classComplexity = parseFloat(clsElement.getAttribute('complexity') || '0');

                    classes.push({
                        name: className,
                        filename: clsElement.getAttribute('filename') || '',
                        lineCoverage: this.clampRate(classLineCoverage),
                        branchCoverage: this.clampRate(classBranchCoverage),
                        complexity: classComplexity,
                        methods: [],
                        lines: lines,
                        linesValid: classLinesValid,
                        linesCovered: classLinesCovered,
                        branchesValid: classBranchesValid,
                        branchesCovered: classBranchesCovered,
                    });

                    // Aggregate package counts
                    pkgLinesValid += classLinesValid;
                    pkgLinesCovered += classLinesCovered;
                    pkgBranchesValid += classBranchesValidForRate;
                    pkgBranchesCovered += classBranchesCoveredForRate;
                    pkgMethodsValid += 0; // Methods not parsed in this simplified version
                    pkgMethodsCovered += 0;
                    pkgComplexity += classComplexity;
                }

                // Calculate package rates
                const pkgLineCoverage = pkgLinesValid > 0 ? (pkgLinesCovered / pkgLinesValid) * 100 : 0;
                const pkgBranchCoverage = pkgBranchesValid > 0 ? (pkgBranchesCovered / pkgBranchesValid) * 100 : 0;
                const pkgMethodCoverage = pkgMethodsValid > 0 ? (pkgMethodsCovered / pkgMethodsValid) * 100 : 0;
                const finalPkgComplexity = parseFloat(pkgElement.getAttribute('complexity') || '0') || pkgComplexity;

                let pkg = {
                    name: packageName,
                    lineCoverage: this.clampRate(pkgLineCoverage),
                    branchCoverage: this.clampRate(pkgBranchCoverage),
                    methodCoverage: this.clampRate(pkgMethodCoverage),
                    complexity: finalPkgComplexity,
                    classes,
                    linesValid: pkgLinesValid,
                    linesCovered: pkgLinesCovered,
                    branchesValid: pkgBranchesValid,
                    branchesCovered: pkgBranchesCovered,
                };

                packages.push(pkg);

                // Aggregate summary counts
                summary.linesValid += pkgLinesValid;
                summary.linesCovered += pkgLinesCovered;
                if (summary.methodsValid !== undefined) summary.methodsValid += pkgMethodsValid;
                if (summary.methodsCovered !== undefined) summary.methodsCovered += pkgMethodsCovered;
                if (summary.conditionsValid !== undefined) summary.conditionsValid += pkgConditionsValid;
                if (summary.conditionsCovered !== undefined) summary.conditionsCovered += pkgConditionsCovered;
            }

            // Final summary calculations
            if (packages.length > 0) {
                // Recalculate summary coverage rates from totals for more accuracy
                if (summary.linesValid > 0) {
                    summary.lineCoverage = this.clampRate((summary.linesCovered / summary.linesValid) * 100);
                }

                if (summary.methodsValid && summary.methodsValid > 0 && summary.methodsCovered) {
                    summary.methodCoverage = this.clampRate((summary.methodsCovered / summary.methodsValid) * 100);
                }

                if (summary.conditionsValid && summary.conditionsValid > 0 && summary.conditionsCovered) {
                    summary.branchCoverage = this.clampRate((summary.conditionsCovered / summary.conditionsValid) * 100);
                }
            }

            return { summary, packages };

        } catch (error: any) {
            console.error(`Failed to parse Cobertura XML: ${error.message}`);
            this.notificationService.showError(errorTitle, error.message || 'Could not process the file.');
            return null;
        }
    }

    /**
     * Parses a coverage rate from XML attribute to percentage
     */
    private parseRate(rateStr: string | null): number {
        if (rateStr === null || rateStr === undefined) return 0;
        const rate = parseFloat(rateStr);
        if (isNaN(rate)) return 0;
        return this.clampRate(rate * 100); // Clamp after converting to percentage
    }

    /**
     * Clamps a coverage rate to ensure it's between 0-100
     */
    private clampRate(rate: number): number {
        return Math.max(0, Math.min(100, Math.round(rate * 100) / 100));
    }
}