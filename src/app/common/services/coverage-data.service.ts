import { Injectable } from '@angular/core';
import { CoverageData, TreeNode, PackageInfo, BuildHierarchyOptions } from '../models/coverage.model';



@Injectable({
    providedIn: 'root'
})
export class CoverageDataService {

    buildHierarchy(coverageData: CoverageData | null, options?: BuildHierarchyOptions): TreeNode | null {
        if (!coverageData?.summary || !coverageData.packages) {
            console.warn("Cannot build hierarchy: Missing coverage data or summary");
            return null;
        }

        const groupNodes = options?.groupSmallNodes ?? false;
        // Threshold for grouping small nodes (% of package total)
        const threshold = options?.smallNodeThreshold ?? 10;
        // Whether to simplify package and class names
        const simplifyNames = options?.simplifyNames ?? true;

        console.log(`Building hierarchy with options: groupSmallNodes=${groupNodes}, threshold=${threshold}, simplifyNames=${simplifyNames}`);

        // Initialize root node
        const root: TreeNode = {
            name: 'Overall Coverage',
            lineCoverage: coverageData.summary.lineCoverage || 0,
            branchCoverage: coverageData.summary.branchCoverage || 0,
            complexity: coverageData.summary.complexity || 0,
            linesValid: 0,
            linesCovered: 0,
            isNamespace: true,
            value: 0,
            children: []
        };

        // First pass - calculate total lines for proportion calculations
        let totalLinesValid = 0;
        coverageData.packages.forEach(pkg => {
            const packageLinesValid = pkg.classes.reduce((sum, cls) =>
                sum + (cls.linesValid || 0), 0);
            totalLinesValid += packageLinesValid;
        });

        if (totalLinesValid <= 0) {
            console.warn("Cannot build hierarchy: No valid lines found in coverage data");
            return null;
        }

        console.log(`Building hierarchy with total lines: ${totalLinesValid}`);

        // Second pass - build the hierarchy with proportional values
        let totalValue = 0;
        let totalRootLinesValid = 0;
        let totalRootLinesCovered = 0;

        // Group packages by domain (first two segments of package name) if desired
        const packagesByDomain = new Map<string, PackageInfo[]>();

        // Process each package
        coverageData.packages.forEach((pkgInfo: PackageInfo) => {
            // Skip empty packages
            if (!pkgInfo.classes?.length) return;

            const packageName = pkgInfo.name || 'Default Package';

            // Extract domain (first two segments of package)
            let domain = packageName;
            const parts = packageName.split('.');
            if (parts.length >= 2) {
                domain = `${parts[0]}.${parts[1]}`;
            }

            // Add to domain map
            if (!packagesByDomain.has(domain)) {
                packagesByDomain.set(domain, []);
            }
            packagesByDomain.get(domain)!.push(pkgInfo);
        });

        // Create domain-grouped packages
        for (const [domain, packages] of packagesByDomain.entries()) {
            // Process each package in this domain
            const domainPackages: TreeNode[] = [];
            let domainLinesValid = 0;
            let domainLinesCovered = 0;
            let domainValue = 0;

            packages.forEach(pkgInfo => {
                let packageLinesValid = 0;
                let packageLinesCovered = 0;
                const packageClasses: TreeNode[] = [];

                // Process with small node grouping
                const smallClassNodes: TreeNode[] = [];
                const largeClassNodes: TreeNode[] = [];

                // Process all classes in this package
                pkgInfo.classes.forEach(clsInfo => {
                    const classLinesValid = clsInfo.linesValid ?? 0;
                    if (classLinesValid <= 0) return; // Skip zero-line classes

                    // Determine package proportion threshold for small classes
                    const packageTotal = pkgInfo.classes.reduce((sum, c) => sum + (c.linesValid ?? 0), 0);
                    const classPercentage = (classLinesValid / packageTotal) * 100;

                    // Create class node
                    const classNode: TreeNode = {
                        name: simplifyNames ? this.simplifyClassName(clsInfo.name, pkgInfo.name) : clsInfo.name,
                        packageName: pkgInfo.name,
                        lineCoverage: clsInfo.lineCoverage || 0,
                        branchCoverage: clsInfo.branchCoverage || 0,
                        complexity: clsInfo.complexity || 0,
                        linesValid: classLinesValid,
                        linesCovered: clsInfo.linesCovered ?? 0,
                        isNamespace: false,
                        value: classLinesValid, // Size proportional to lines valid
                        children: undefined,
                        filename: clsInfo.filename
                    };

                    // Group small nodes if enabled
                    if (groupNodes && classPercentage < threshold) {
                        smallClassNodes.push(classNode);
                    } else {
                        largeClassNodes.push(classNode);
                    }

                    // Update package totals
                    packageLinesValid += classLinesValid;
                    packageLinesCovered += (clsInfo.linesCovered ?? 0);
                });

                // Add all large class nodes
                packageClasses.push(...largeClassNodes);

                // Create "Other" group for small classes if needed
                if (smallClassNodes.length > 0) {
                    const totalSmallLines = smallClassNodes.reduce((sum, node) => sum + node.linesValid, 0);
                    const totalSmallCovered = smallClassNodes.reduce((sum, node) => sum + (node.linesCovered || 0), 0);
                    const groupCoverage = totalSmallLines > 0 ? (totalSmallCovered / totalSmallLines) * 100 : 0;

                    const otherNode: TreeNode = {
                        name: `Other (${smallClassNodes.length} small classes)`,
                        packageName: pkgInfo.name,
                        lineCoverage: this.clampRate(groupCoverage),
                        branchCoverage: 0,
                        complexity: smallClassNodes.reduce((sum, node) => sum + (node.complexity || 0), 0),
                        linesValid: totalSmallLines,
                        linesCovered: totalSmallCovered,
                        isNamespace: false,
                        isGroupedNode: true,
                        value: totalSmallLines, // Use total lines as value
                        children: undefined,
                        originalData: smallClassNodes // Store original nodes
                    };

                    packageClasses.push(otherNode);
                }

                // Only add package if it has classes
                if (packageClasses.length > 0) {
                    // Calculate package coverage
                    const packageCoverage = packageLinesValid > 0 ?
                        (packageLinesCovered / packageLinesValid) * 100 : 0;

                    // Simplify package name if option enabled
                    let displayName = pkgInfo.name || '';
                    if (simplifyNames) {
                        displayName = this.simplifyPackageName(displayName, domain);
                    }

                    // Create package node
                    const packageNode: TreeNode = {
                        name: displayName,
                        lineCoverage: this.clampRate(packageCoverage),
                        branchCoverage: pkgInfo.branchCoverage || 0,
                        complexity: pkgInfo.complexity || 0,
                        linesValid: packageLinesValid,
                        linesCovered: packageLinesCovered,
                        isNamespace: true,
                        value: packageLinesValid, // Value proportional to lines valid
                        children: packageClasses,
                        packageName: pkgInfo.name
                    };

                    // Log package details for debugging
                    console.log(`Package: ${pkgInfo.name}, Lines: ${packageLinesValid}, Classes: ${packageClasses.length}, Proportion: ${(packageLinesValid / totalLinesValid * 100).toFixed(2)}%`);

                    // Add to domain packages
                    domainPackages.push(packageNode);
                    domainLinesValid += packageLinesValid;
                    domainLinesCovered += packageLinesCovered;
                    domainValue += packageLinesValid;
                }
            });

            // If there's only one package in the domain, just add it directly to root
            if (domainPackages.length === 1) {
                root.children!.push(domainPackages[0]);
            }
            // Otherwise, create a domain grouping node
            else if (domainPackages.length > 1) {
                // Calculate domain coverage
                const domainCoverage = domainLinesValid > 0 ?
                    (domainLinesCovered / domainLinesValid) * 100 : 0;

                // Create domain node
                const domainNode: TreeNode = {
                    name: domain,
                    lineCoverage: this.clampRate(domainCoverage),
                    linesValid: domainLinesValid,
                    linesCovered: domainLinesCovered,
                    branchCoverage: 0,
                    complexity: 0,
                    isNamespace: true,
                    isDomainGroup: true,
                    value: domainValue, // Value proportional to lines valid
                    children: domainPackages,
                    packageName: domain
                };

                // Add to root
                root.children!.push(domainNode);
            }

            // Update root totals
            totalValue += domainValue;
            totalRootLinesValid += domainLinesValid;
            totalRootLinesCovered += domainLinesCovered;
        }

        // Set final root properties
        root.value = totalRootLinesValid;
        root.linesValid = totalRootLinesValid;
        root.linesCovered = totalRootLinesCovered;
        root.lineCoverage = totalRootLinesValid > 0 ?
            this.clampRate((totalRootLinesCovered / totalRootLinesValid) * 100) : 0;

        if (root.children?.length === 0) {
            console.warn("No valid packages found in coverage data");
            return null;
        }

        // Log hierarchy for debugging
        console.log(`Built hierarchy with ${root.children?.length} packages, total lines: ${totalRootLinesValid}`);
        if (root.children) {
            root.children.forEach(pkg => {
                console.log(`- ${pkg.name}: ${pkg.linesValid} lines (${pkg.value} value), ${pkg.children?.length || 0} classes, ${(pkg.linesValid / totalRootLinesValid * 100).toFixed(2)}%`);
            });
        }

        return root;
    }

    /**
     * Simplifies class names by removing package prefixes and special characters
     */
    private simplifyClassName(className: string, packageName: string): string {
        if (!className) return className;

        // Remove package prefix if present
        if (packageName && className.startsWith(packageName + '.')) {
            className = className.substring(packageName.length + 1);
        }

        // Handle special class naming patterns
        if (className.includes('$')) {
            // Inner class - just show the part after the last $
            className = className.substring(className.lastIndexOf('$') + 1);
        }

        if (className.includes('<') && className.includes('>')) {
            // Generated method - simplify the name
            const match = className.match(/^<(.+?)>/);
            if (match && match[1]) {
                className = match[1];
                if (className.includes('.')) {
                    className = className.substring(className.lastIndexOf('.') + 1);
                }
            } else {
                className = className.replace(/<|>/g, '');
            }
        }

        return className;
    }

    /**
     * Simplifies package names by removing common domain prefixes and standardizing format
     */
    private simplifyPackageName(packageName: string, domain: string): string {
        if (!packageName) return packageName;

        // If the package is exactly the domain, just return it
        if (packageName === domain) return packageName;

        // Otherwise, if it starts with the domain, remove the domain prefix
        if (domain && packageName.startsWith(domain + '.')) {
            return packageName.substring(domain.length + 1);
        }

        return packageName;
    }

    private clampRate(rate: number): number {
        return Math.max(0, Math.min(100, Math.round(rate * 100) / 100));
    }
}