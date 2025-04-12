import { Injectable } from '@angular/core';
import { CoverageData } from '../../../core/models/coverage.model';

export interface ComparisonResult {
  summary: {
    lineCoverageChange: number;
    branchCoverageChange: number;
    methodCoverageChange: number;
    linesCoveredChange: number;
    linesValidChange: number;
    newPackages: string[];
    removedPackages: string[];
    newClasses: { packageName: string, className: string }[];
    removedClasses: { packageName: string, className: string }[];
    mostImprovedPackages: { name: string, change: number }[];
    mostDeclinedPackages: { name: string, change: number }[];
  };
  packageComparisons: {
    name: string;
    exists1: boolean;
    exists2: boolean;
    lineCoverage1?: number;
    lineCoverage2?: number;
    lineCoverageChange?: number;
    branchCoverage1?: number;
    branchCoverage2?: number;
    branchCoverageChange?: number;
    linesCovered1?: number;
    linesCovered2?: number;
    linesCoveredChange?: number;
    classes: {
      name: string;
      exists1: boolean;
      exists2: boolean;
      lineCoverage1?: number;
      lineCoverage2?: number;
      lineCoverageChange?: number;
    }[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class ComparisonService {

  constructor() { }

  /**
   * Compare two coverage data sets
   * @param data1 First coverage data (older/reference)
   * @param data2 Second coverage data (newer/current)
   */
  compareCoverageData(data1: CoverageData, data2: CoverageData): ComparisonResult {
    if (!data1 || !data2) {
      throw new Error('Both coverage data sets are required for comparison');
    }

    // Create skeleton result
    const result: ComparisonResult = {
      summary: {
        lineCoverageChange: data2.summary.lineCoverage - data1.summary.lineCoverage,
        branchCoverageChange:
          (data2.summary.branchCoverage !== undefined && data1.summary.branchCoverage !== undefined) ?
            data2.summary.branchCoverage - data1.summary.branchCoverage : 0,
        methodCoverageChange:
          (data2.summary.methodCoverage !== undefined && data1.summary.methodCoverage !== undefined) ?
            data2.summary.methodCoverage - data1.summary.methodCoverage : 0,
        linesCoveredChange: data2.summary.linesCovered - data1.summary.linesCovered,
        linesValidChange: data2.summary.linesValid - data1.summary.linesValid,
        newPackages: [],
        removedPackages: [],
        newClasses: [],
        removedClasses: [],
        mostImprovedPackages: [],
        mostDeclinedPackages: []
      },
      packageComparisons: []
    };

    // Get all unique package names
    const packageNames = new Set<string>();
    data1.packages.forEach(pkg => packageNames.add(pkg.name));
    data2.packages.forEach(pkg => packageNames.add(pkg.name));

    // Track changes
    const packageChanges: { name: string, change: number }[] = [];

    // Compare each package
    packageNames.forEach(pkgName => {
      const pkg1 = data1.packages.find(p => p.name === pkgName);
      const pkg2 = data2.packages.find(p => p.name === pkgName);

      // Identify new/removed packages
      if (!pkg1) {
        result.summary.newPackages.push(pkgName);
      }

      if (!pkg2) {
        result.summary.removedPackages.push(pkgName);
      }

      // If package exists in both data sets, compare details
      if (pkg1 && pkg2) {
        const lineCoverageChange = pkg2.lineCoverage - pkg1.lineCoverage;
        packageChanges.push({
          name: pkgName,
          change: lineCoverageChange
        });
      }

      // Create package comparison entry
      const pkgComparison: any = {
        name: pkgName,
        exists1: !!pkg1,
        exists2: !!pkg2,
        classes: []
      };

      if (pkg1) {
        pkgComparison.lineCoverage1 = pkg1.lineCoverage;
        pkgComparison.branchCoverage1 = pkg1.branchCoverage;
        pkgComparison.linesCovered1 = pkg1.linesCovered;
      }

      if (pkg2) {
        pkgComparison.lineCoverage2 = pkg2.lineCoverage;
        pkgComparison.branchCoverage2 = pkg2.branchCoverage;
        pkgComparison.linesCovered2 = pkg2.linesCovered;
      }

      if (pkg1 && pkg2) {
        pkgComparison.lineCoverageChange = pkg2.lineCoverage - pkg1.lineCoverage;

        if (pkg1.branchCoverage !== undefined && pkg2.branchCoverage !== undefined) {
          pkgComparison.branchCoverageChange = pkg2.branchCoverage - pkg1.branchCoverage;
        }

        pkgComparison.linesCoveredChange = pkg2.linesCovered - pkg1.linesCovered;
      }

      // Compare classes within package
      if (pkg1 || pkg2) {
        const classNames = new Set<string>();

        if (pkg1) {
          pkg1.classes.forEach(cls => classNames.add(cls.name));
        }

        if (pkg2) {
          pkg2.classes.forEach(cls => classNames.add(cls.name));
        }

        classNames.forEach(clsName => {
          const cls1 = pkg1?.classes.find(c => c.name === clsName);
          const cls2 = pkg2?.classes.find(c => c.name === clsName);

          // Identify new/removed classes
          if (cls1 && !cls2) {
            result.summary.removedClasses.push({
              packageName: pkgName,
              className: clsName
            });
          }

          if (!cls1 && cls2) {
            result.summary.newClasses.push({
              packageName: pkgName,
              className: clsName
            });
          }

          // Create class comparison
          const clsComparison: any = {
            name: clsName,
            exists1: !!cls1,
            exists2: !!cls2
          };

          if (cls1) {
            clsComparison.lineCoverage1 = cls1.lineCoverage;
          }

          if (cls2) {
            clsComparison.lineCoverage2 = cls2.lineCoverage;
          }

          if (cls1 && cls2) {
            clsComparison.lineCoverageChange = cls2.lineCoverage - cls1.lineCoverage;
          }

          pkgComparison.classes.push(clsComparison);
        });
      }

      result.packageComparisons.push(pkgComparison);
    });

    // Sort package comparisons by name
    result.packageComparisons.sort((a, b) => a.name.localeCompare(b.name));

    // Find most improved/declined packages
    packageChanges.sort((a, b) => b.change - a.change);
    result.summary.mostImprovedPackages = packageChanges
      .filter(p => p.change > 0)
      .slice(0, 5);

    packageChanges.sort((a, b) => a.change - b.change);
    result.summary.mostDeclinedPackages = packageChanges
      .filter(p => p.change < 0)
      .slice(0, 5);

    return result;
  }
}