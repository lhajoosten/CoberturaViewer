import { Injectable } from '@angular/core';
import { CoverageData, TreeNode, PackageInfo, ClassInfo } from '../models/coverage.model';

export interface BuildHierarchyOptions {
    groupSmallNodes?: boolean;
    smallNodeThreshold?: number; // e.g., linesValid threshold
}

@Injectable({
    providedIn: 'root'
})
export class CoverageDataService {

    buildHierarchy(coverageData: CoverageData | null, options?: BuildHierarchyOptions): TreeNode | null {
        if (!coverageData?.summary || !coverageData.packages) { /* ... error handling ... */ return null; }

        const groupNodes = options?.groupSmallNodes ?? false;
        // Threshold for grouping (e.g., classes with fewer than 10 lines)
        const threshold = options?.smallNodeThreshold ?? 10;

        const root: TreeNode = { /* ... root setup ... */
            name: 'Overall Coverage', coverage: coverageData.summary.lineRate || 0, branchRate: coverageData.summary.branchRate || 0, complexity: coverageData.summary.complexity || 0, linesValid: 0, linesCovered: 0, isNamespace: true, value: 0, children: []
        };
        let totalRootValue = 0, totalRootLinesValid = 0, totalRootLinesCovered = 0;

        coverageData.packages.forEach((pkgInfo: PackageInfo) => {
            let packageLinesValid = 0, packageLinesCovered = 0, packageValue = 0;
            const finalPackageChildren: TreeNode[] = []; // Nodes to actually add (including 'Other')
            const largeClassNodes: TreeNode[] = [];
            const smallClassData: ClassInfo[] = []; // Collect raw small class data

            pkgInfo.classes.forEach((clsInfo: ClassInfo) => {
                const classLinesValid = clsInfo.linesValid ?? 0;
                if (classLinesValid <= 0) return; // Skip zero-line classes always

                // *** Grouping Logic ***
                if (groupNodes && classLinesValid < threshold) {
                    smallClassData.push(clsInfo); // Collect small classes
                } else {
                    // Process large classes normally
                    const classValue = classLinesValid;
                    const classNode: TreeNode = { /* ... create classNode as before ... */
                        name: clsInfo.name, packageName: pkgInfo.name, coverage: clsInfo.lineRate || 0, branchRate: clsInfo.branchRate || 0, complexity: clsInfo.complexity || 0, linesValid: classLinesValid, linesCovered: clsInfo.linesCovered ?? 0, isNamespace: false, value: classValue, children: undefined, filename: clsInfo.filename
                    };
                    largeClassNodes.push(classNode); // Add to large nodes list
                }
                // Aggregate totals for package regardless of grouping for accurate stats
                packageLinesValid += classLinesValid;
                packageLinesCovered += (clsInfo.linesCovered ?? 0);
            });

            // Add all large nodes to final list
            finalPackageChildren.push(...largeClassNodes);
            packageValue += largeClassNodes.reduce((sum, node) => sum + (node.value || 0), 0);

            // Create 'Other' node if small classes were collected and grouping is on
            if (groupNodes && smallClassData.length > 0) {
                const smallNodesLinesValid = smallClassData.reduce((sum, cls) => sum + (cls.linesValid ?? 0), 0);
                const smallNodesLinesCovered = smallClassData.reduce((sum, cls) => sum + (cls.linesCovered ?? 0), 0);
                const smallNodesComplexity = smallClassData.reduce((sum, cls) => sum + (cls.complexity ?? 0), 0);
                const smallNodesValue = smallNodesLinesValid; // Value based on total lines
                const smallNodesCoverage = smallNodesLinesValid > 0 ? (smallNodesLinesCovered / smallNodesLinesValid) * 100 : 0;
                // Note: BranchRate for 'Other' is hard to calculate meaningfully, maybe omit or average?

                const otherNode: TreeNode = {
                    name: `Other (${smallClassData.length} small classes)`,
                    packageName: pkgInfo.name,
                    coverage: this.clampRate(smallNodesCoverage),
                    branchRate: 0, // Or calculate average?
                    complexity: smallNodesComplexity,
                    linesValid: smallNodesLinesValid,
                    linesCovered: smallNodesLinesCovered,
                    isNamespace: false, // Treat as a leaf visually
                    isGroupedNode: true, // Add flag to identify this node
                    value: Math.max(1, smallNodesValue), // Ensure grouped node has at least value 1
                    children: undefined, // No children visually
                    originalData: smallClassData // Optionally store original data
                };
                finalPackageChildren.push(otherNode);
                packageValue += otherNode.value || 0;
            }

            // Add the package node if it has children (large or 'Other')
            if (finalPackageChildren.length > 0) {
                const packageCoverage = packageLinesValid > 0 ? (packageLinesCovered / packageLinesValid) * 100 : 0;
                const packageNode: TreeNode = { /* ... create packageNode as before ... */
                    name: pkgInfo.name || 'Default Package', coverage: this.clampRate(packageCoverage), branchRate: pkgInfo.branchRate || 0, complexity: pkgInfo.complexity || 0, linesValid: packageLinesValid, linesCovered: packageLinesCovered, isNamespace: true, value: packageValue, children: finalPackageChildren, packageName: pkgInfo.name
                };
                root.children!.push(packageNode);
                totalRootValue += packageValue;
                totalRootLinesValid += packageLinesValid;
                totalRootLinesCovered += packageLinesCovered;
            }
        });

        // Set final root stats
        root.value = totalRootValue || 1;
        root.linesValid = totalRootLinesValid;
        root.linesCovered = totalRootLinesCovered;
        root.coverage = root.linesValid > 0 ? this.clampRate((root.linesCovered / root.linesValid) * 100) : 0;

        if (!root.children || root.children.length === 0) {
            console.warn("Hierarchy built, but root has no children packages (might be due to zero-line class filtering).");
        } else if (root.value <= 1) {
            console.warn(`Hierarchy root value is low (${root.value}). Check source data.`);
        }

        return root;
    }

    private clampRate(rate: number): number {
        return Math.max(0, Math.min(100, Math.round(rate * 100) / 100));
    }
}