import { Injectable } from '@angular/core';
import { Coverage, CoverageData } from '../models/coverage.model';

@Injectable({
    providedIn: 'root'
})
export class CoverageDataService {
    transformToHierarchy(coverageData: CoverageData): Coverage[] {
        const result: Coverage[] = [];

        coverageData.packages.forEach(pkg => {
            pkg.classes.forEach(cls => {
                // Calculate covered lines
                const linesCovered = cls.lines.filter(line => line.hits > 0).length;
                const linesValid = cls.lines.length;
                const lineCoverage = linesValid > 0
                    ? (linesCovered / linesValid) * 100
                    : 0;

                result.push({
                    className: cls.name,
                    packageName: pkg.name,
                    coverage: lineCoverage,
                    linesValid: linesValid,
                    linesCovered: linesCovered,
                    branchRate: cls.branchRate,
                    filename: cls.filename,
                    path: `${pkg.name}.${cls.name}`,
                    isNamespace: false,
                    value: linesValid
                });
            });
        });

        return result;
    }
}