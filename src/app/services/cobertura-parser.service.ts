import { Injectable } from '@angular/core';
import { CoverageData, CoverageSummary, PackageInfo, ClassInfo, LineInfo } from '../models/coverage.model';

@Injectable({
    providedIn: 'root'
})
export class CoberturaParserService {

    constructor() { }

    parseCoberturaXml(xmlContent: string): CoverageData | null {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

            // Check for parsing errors
            const parserError = xmlDoc.querySelector('parsererror');
            if (parserError) {
                throw new Error('Invalid XML format');
            }

            // Extract overall coverage data
            const coverageElement = xmlDoc.getElementsByTagName('coverage')[0];
            if (!coverageElement) {
                throw new Error('No coverage element found');
            }

            const summary: CoverageSummary = {
                lineRate: this.parseRate(coverageElement.getAttribute('line-rate')),
                branchRate: this.parseRate(coverageElement.getAttribute('branch-rate')),
                methodRate: this.parseRate(coverageElement.getAttribute('methods')),
                classRate: this.parseRate(coverageElement.getAttribute('classes')),
                complexity: parseInt(coverageElement.getAttribute('complexity') || '0'),
                linesValid: parseInt(coverageElement.getAttribute('lines-valid') || '0'),
                linesCovered: parseInt(coverageElement.getAttribute('lines-covered') || '0'),
                timestamp: coverageElement.getAttribute('timestamp') || ''
            };

            // Extract package data
            const packages: PackageInfo[] = [];
            const packageElements = xmlDoc.getElementsByTagName('package');

            for (let i = 0; i < packageElements.length; i++) {
                const pkg = packageElements[i];
                const packageName = pkg.getAttribute('name') || 'Default Package';

                // Extract classes within this package
                const classes: ClassInfo[] = [];
                const classElements = pkg.getElementsByTagName('class');

                for (let j = 0; j < classElements.length; j++) {
                    const cls = classElements[j];
                    const className = (cls.getAttribute('name') || '').split('/').pop() || 'Unknown';

                    // Extract lines for this class
                    const lines: LineInfo[] = [];
                    const lineElements = cls.getElementsByTagName('line');

                    for (let k = 0; k < lineElements.length; k++) {
                        const line = lineElements[k];
                        lines.push({
                            number: parseInt(line.getAttribute('number') || '0'),
                            hits: parseInt(line.getAttribute('hits') || '0'),
                            branch: line.getAttribute('branch') === 'true'
                        });
                    }

                    classes.push({
                        name: className,
                        filename: cls.getAttribute('filename') || '',
                        lineRate: this.parseRate(cls.getAttribute('line-rate')),
                        branchRate: this.parseRate(cls.getAttribute('branch-rate')),
                        lines
                    });
                }

                packages.push({
                    name: packageName,
                    lineRate: this.parseRate(pkg.getAttribute('line-rate')),
                    branchRate: this.parseRate(pkg.getAttribute('branch-rate')),
                    classes
                });
            }

            return { summary, packages };
        } catch (error) {
            console.error('Failed to parse Cobertura XML:', error);
            return null;
        }
    }

    private parseRate(rateStr: string | null): number {
        if (!rateStr) return 0;
        return parseFloat(rateStr) * 100;
    }
}