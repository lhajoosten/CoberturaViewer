import { Injectable } from '@angular/core';
import { CoverageData } from '../../models/coverage.model';

@Injectable({
    providedIn: 'root'
})
export class ChartUtilsService {

    constructor() { }

    /**
     * Get color for coverage percentage
     */
    getColorForCoverage(coverage: number): string {
        if (coverage >= 80) {
            return '#4caf50'; // Green
        } else if (coverage >= 60) {
            return '#ffeb3b'; // Yellow
        } else {
            return '#f44336'; // Red
        }
    }

    /**
     * Get coverage grade (A, B, C, D, F)
     */
    getCoverageGrade(coverage: number): string {
        if (coverage >= 90) return 'A';
        if (coverage >= 80) return 'B';
        if (coverage >= 70) return 'C';
        if (coverage >= 60) return 'D';
        return 'F';
    }

    /**
     * Get class names with the highest impact on overall coverage
     * (lowest coverage and high line count)
     */
    getHighImpactClasses(coverageData: CoverageData, limit: number = 5): any[] {
        if (!coverageData) return [];

        const allClasses: any[] = [];

        coverageData.packages.forEach(pkg => {
            pkg.classes.forEach(cls => {
                if (cls.linesValid > 0) {
                    allClasses.push({
                        name: `${pkg.name}.${cls.name}`,
                        lineCoverage: cls.lineCoverage,
                        linesValid: cls.linesValid,
                        linesCovered: cls.linesCovered,
                        uncoveredLines: cls.linesValid - cls.linesCovered,
                        impact: (100 - cls.lineCoverage) * cls.linesValid / 100 // Impact score
                    });
                }
            });
        });

        // Sort by impact (higher impact first)
        allClasses.sort((a, b) => b.impact - a.impact);

        return allClasses.slice(0, limit);
    }

    /**
     * Prepare colors array for Google Charts
     */
    getChartColors(isDarkTheme: boolean, count: number = 10): string[] {
        const lightColors = [
            '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b',
            '#ffc107', '#ff9800', '#ff5722', '#f44336',
            '#2196f3', '#03a9f4', '#00bcd4', '#009688',
            '#673ab7', '#9c27b0', '#e91e63', '#9e9e9e'
        ];

        const darkColors = [
            '#66bb6a', '#9ccc65', '#d4e157', '#ffee58',
            '#ffca28', '#ffa726', '#ff7043', '#ef5350',
            '#42a5f5', '#29b6f6', '#26c6da', '#26a69a',
            '#7e57c2', '#ba68c8', '#ec407a', '#bdbdbd'
        ];

        const colors = isDarkTheme ? darkColors : lightColors;

        // If more colors needed than available, repeat the palette
        if (count > colors.length) {
            const repeats = Math.ceil(count / colors.length);
            return Array(repeats).fill(colors).flat().slice(0, count);
        }

        return colors.slice(0, count);
    }
}