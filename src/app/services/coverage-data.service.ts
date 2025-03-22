import { Injectable } from '@angular/core';
import { CoverageData, TreeNode } from '../models/coverage.model';

@Injectable({
    providedIn: 'root'
})
export class CoverageDataService {
    /**
     * Transforms raw coverage data into a clean hierarchical structure
     * Complete rewrite to fix the redundant namespaces issue
     */
    transformToHierarchy(coverageData: CoverageData): TreeNode {
        // First, let's extract and normalize all class paths
        const allClasses: {
            path: string[];
            name: string;
            coverage: number;
            branchRate: number;
            linesValid: number;
            linesCovered: number;
            filename: string;
        }[] = [];

        coverageData.packages.forEach(pkg => {
            pkg.classes.forEach(cls => {
                // Extract fully qualified class name as path segments
                // Example: "Vanguard.Domain.Entities.SkillAggregate"
                const fullPath = `${pkg.name || 'Default Package'}.${cls.name}`;
                const pathSegments = fullPath.split('.');

                // Remove duplicates from the path (handles redundant namespaces)
                // This prevents cases like "Vanguard.Domain.Vanguard.Domain.Entities"
                const uniqueSegments = [];
                const seen = new Set<string>();

                for (const segment of pathSegments) {
                    if (!seen.has(segment)) {
                        seen.add(segment);
                        uniqueSegments.push(segment);
                    }
                }

                // Last segment is the class name
                const className = uniqueSegments.pop() || '';

                // Add to our collection
                allClasses.push({
                    path: uniqueSegments,
                    name: className,
                    coverage: cls.lineRate,
                    branchRate: cls.branchRate,
                    linesValid: cls.lines.length,
                    linesCovered: cls.lines.length * (cls.lineRate / 100),
                    filename: cls.filename
                });
            });
        });

        // Now build the tree from these clean paths
        const root: TreeNode = {
            name: 'Coverage',
            children: [],
            isNamespace: true,
            coverage: 0,
            value: 0
        };

        // Keep track of existing namespaces to avoid duplication
        const namespaceMap = new Map<string, TreeNode>();

        // Add each class to the tree
        allClasses.forEach(cls => {
            let currentNode = root;
            let currentPath = '';

            // Navigate/create the namespace path
            for (const segment of cls.path) {
                currentPath = currentPath ? `${currentPath}.${segment}` : segment;

                // Check if this namespace already exists
                let namespaceNode = namespaceMap.get(currentPath);

                if (!namespaceNode) {
                    // Create new namespace node
                    namespaceNode = {
                        name: segment,
                        fullPath: currentPath,
                        isNamespace: true,
                        coverage: 0, // Will calculate later
                        value: 0,    // Will calculate later
                        children: []
                    };

                    // Add to parent and update tracking
                    currentNode.children.push(namespaceNode);
                    namespaceMap.set(currentPath, namespaceNode);
                }

                // Move to next level
                currentNode = namespaceNode;
            }

            // Add the class to its parent namespace
            const fullPath = currentPath ? `${currentPath}.${cls.name}` : cls.name;
            currentNode.children.push({
                name: cls.name,
                fullName: cls.name,
                coverage: cls.coverage,
                branchRate: cls.branchRate,
                linesValid: cls.linesValid,
                linesCovered: cls.linesCovered,
                value: cls.linesValid,
                path: fullPath,
                filename: cls.filename,
                isNamespace: false,
                children: [] // Empty array for leaf nodes
            });
        });

        // Calculate coverage metrics for the tree
        this.calculateMetrics(root);

        return root;
    }

    /**
     * Recursively calculates coverage metrics for all nodes
     */
    private calculateMetrics(node: TreeNode): { lines: number, covered: number } {
        if (!node.children || node.children.length === 0) {
            // Leaf node (class)
            return {
                lines: node['linesValid'] || 0,
                covered: node['linesCovered'] || 0
            };
        }

        // Process children first (bottom-up)
        let totalLines = 0;
        let totalCovered = 0;

        for (const child of node.children) {
            const metrics = this.calculateMetrics(child);
            totalLines += metrics.lines;
            totalCovered += metrics.covered;
        }

        // Update current node
        node.value = totalLines;
        node.coverage = totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;

        return { lines: totalLines, covered: totalCovered };
    }

    /**
     * Filters hierarchy based on minimum coverage threshold
     */
    filterByCoverage(node: TreeNode, minCoverage: number): TreeNode {
        // Create a deep copy to avoid modifying the original
        const result = { ...node, children: [...(node.children || [])] };

        // Filter children
        if (result.children.length > 0) {
            result.children = result.children
                .map(child => this.filterByCoverage(child, minCoverage))
                .filter(child => {
                    // Keep namespaces regardless of coverage (will be filtered at leaf level)
                    if (child.isNamespace) {
                        return child.children.length > 0; // Only keep if it has children
                    }
                    // Filter classes based on coverage
                    return child.coverage >= minCoverage;
                });
        }

        return result;
    }

    /**
     * Searches hierarchy for matching nodes
     */
    applySearch(node: TreeNode, searchTerm: string): boolean {
        if (!searchTerm) return true;

        const term = searchTerm.toLowerCase();
        let hasMatch = false;

        // Check if this node matches
        if (node.name && node.name.toLowerCase().includes(term)) {
            node['matchesSearch'] = true;
            hasMatch = true;
        } else {
            node['matchesSearch'] = false;
        }

        // Check children
        if (node.children && node.children.length > 0) {
            const childMatches = node.children.map(child =>
                this.applySearch(child, searchTerm)
            );

            if (childMatches.some(match => match)) {
                hasMatch = true;
                node['containsMatch'] = true;
            } else {
                node['containsMatch'] = false;
            }
        }

        return hasMatch;
    }
}