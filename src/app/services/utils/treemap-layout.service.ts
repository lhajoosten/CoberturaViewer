import { Injectable, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { Coverage, TreeNode } from '../../models/coverage.model';
import { TreemapConfig } from '../../models/treemap-config.model';

@Injectable({
    providedIn: 'root',
})
export class TreemapLayoutService {
    createTreemap(
        element: ElementRef,
        data: TreeNode,
        config: TreemapConfig,
        onNodeClick?: (node: any) => void,
        onNodeHover?: (node: any, event: MouseEvent) => void,
        onNodeLeave?: () => void
    ): any {
        // Clear any existing SVG
        d3.select(element.nativeElement).select('svg').remove();

        // Ensure we have valid dimensions
        const width = config.width || 800;
        const height = config.height || 600;

        console.log('Creating treemap with dimensions:', width, height);

        // Create SVG container with responsive attributes
        const svg = d3.select(element.nativeElement)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('display', 'block'); // Important for proper sizing

        // Add background
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', config.themeDark ? '#1a1a1a' : '#f8fafc')
            .attr('rx', 8)
            .attr('class', 'treemap-background');

        // Create container for zooming
        svg.append('g')
            .attr('class', 'zoom-container');

        // Setup zoom behavior with proper bounds
        const zoom = d3.zoom()
            .scaleExtent([0.5, 8])
            .extent([[0, 0], [width, height]])
            .on('zoom', (event) => {
                svg.select('.zoom-container')
                    .attr('transform', event.transform);
            });

        // Apply zoom behavior
        svg.call(zoom as any);

        // Create a reference object to store methods that can be called by the host component
        const treemapInstance = {
            svg,
            zoom,
            update: (updatedData: TreeNode, updatedConfig: TreemapConfig) => {
                // Ensure we update the dimensions too
                const updatedWidth = updatedConfig.width || width;
                const updatedHeight = updatedConfig.height || height;

                // Update viewBox to reflect new dimensions
                svg.attr('viewBox', `0 0 ${updatedWidth} ${updatedHeight}`);

                // Update background dimensions
                svg.select('.treemap-background')
                    .attr('width', updatedWidth)
                    .attr('height', updatedHeight);

                this.updateVisualization(
                    svg,
                    updatedData,
                    updatedConfig,
                    onNodeClick,
                    onNodeHover,
                    onNodeLeave
                );
            },
            zoomToNode: (node: any) => {
                this.zoomToNode(svg, zoom, node, config);
            },
            resetZoom: () => {
                svg.transition().duration(300).call(
                    zoom.transform as any, d3.zoomIdentity
                );
            },
            updateLabels: (showLabels: boolean) => {
                // Update labels visibility
                svg.selectAll('text.node-label')
                    .style('opacity', showLabels ? 1 : 0);
            },
            highlightNode: (nodeName: string) => {
                this.highlightNode(svg, nodeName);
            },
        };

        // Initial visualization
        this.updateVisualization(
            svg,
            data,
            config,
            onNodeClick,
            onNodeHover,
            onNodeLeave
        );

        return treemapInstance;
    }


    private zoomToNode(
        svg: any,
        zoom: any,
        node: any,
        config: TreemapConfig
    ): void {
        if (!node) return;

        const bounds = {
            x0: node.x0,
            y0: node.y0,
            x1: node.x1,
            y1: node.y1,
        };

        const dx = bounds.x1 - bounds.x0;
        const dy = bounds.y1 - bounds.y0;
        const x = (bounds.x0 + bounds.x1) / 2;
        const y = (bounds.y0 + bounds.y1) / 2;

        // Calculate scale factor to fit the node with padding
        const scale = Math.min(
            0.9 / Math.max(dx / config.width, dy / config.height),
            4 // Maximum zoom level
        );

        // Transition to the new view
        svg
            .transition()
            .duration(750)
            .call(
                zoom.transform,
                d3.zoomIdentity
                    .translate(config.width / 2, config.height / 2)
                    .scale(scale)
                    .translate(-x, -y)
            );
    }

    private updateVisualization(
        svg: any,
        data: TreeNode,
        config: TreemapConfig,
        onNodeClick?: (node: any) => void,
        onNodeHover?: (node: any, event: MouseEvent) => void,
        onNodeLeave?: () => void
    ): void {
        // Clear existing visualization elements
        svg.select('.zoom-container').selectAll('*').remove();
        svg.selectAll('.coverage-legend').remove();

        const container = svg.select('.zoom-container');
        const width = config.width;
        const height = config.height;

        // Update background color
        svg.select('.treemap-background')
            .attr('fill', config.themeDark ? '#1a1a1a' : '#f8fafc');

        try {
            // Calculate optimal padding based on container size
            const paddingOuter = Math.max(3, Math.min(8, width / 100));
            const paddingInner = Math.max(2, Math.min(5, width / 150));
            const paddingTop = config.showLabels ? Math.max(20, height / 30) : paddingInner;

            // Create the treemap layout with adjusted padding
            const treemap = d3.treemap()
                .size([width, height])
                .paddingOuter(paddingOuter)
                .paddingInner(paddingInner)
                .paddingTop(paddingTop)
                .round(true);

            // Create hierarchy and apply treemap layout
            const root = d3.hierarchy(data)
                .sum((d: any) => d.value || 0)
                .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

            treemap(root as any);

            // Filter nodes based on size if grouping is enabled
            const nodesToDisplay = root.descendants().filter((d: any) => {
                // Skip the root node
                if (d.depth === 0) return false;

                // Check node dimensions
                const nodeWidth = (d.x1 as number) - (d.x0 as number);
                const nodeHeight = (d.y1 as number) - (d.y0 as number);

                // Apply small node filtering if enabled
                if (config.groupSmallNodes) {
                    return nodeWidth > config.minNodeSize && nodeHeight > config.minNodeSize;
                } else {
                    return true; // Show all nodes when grouping is disabled
                }
            });

            // Create node groups
            const nodes = container.selectAll('g.node')
                .data(nodesToDisplay)
                .enter()
                .append('g')
                .attr('class', (d: any) => {
                    const depth = d.depth;
                    const isNamespace = d.data.isNamespace;
                    const isDomainGroup = d.data.isDomainGroup;
                    return `node depth-${depth} ${isNamespace ? 'namespace' : 'class'} ${isDomainGroup ? 'domain-group' : ''}`;
                })
                .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
                .on('click', (event: any, d: any) => {
                    if (event.defaultPrevented) return;
                    event.preventDefault();
                    if (onNodeClick) {
                        onNodeClick(d);
                    }
                });

            // Add rectangles to nodes with improved styling
            nodes.append('rect')
                .attr('class', 'node-rect')
                .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
                .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
                .attr('fill', (d: any) => this.getCoverageColor(d.data.coverage, config))
                .attr('stroke', (d: any) => {
                    if (d.depth === 1) return config.themeDark ? '#777' : '#444';
                    if (d.data.isNamespace) return config.themeDark ? '#555' : '#aaa';
                    if (d.data.isDomainGroup) return config.themeDark ? '#aaa' : '#666';
                    return config.themeDark ? '#333' : '#ddd';
                })
                .attr('stroke-width', (d: any) => {
                    if (d.data.isDomainGroup) return 2.5;
                    if (d.depth === 1) return 2;
                    if (d.data.isNamespace) return 1.5;
                    return 1;
                })
                .attr('rx', (d: any) => {
                    if (d.depth === 1) return 0;
                    if (d.data.isDomainGroup) return 4;
                    return 2;
                })
                .attr('ry', (d: any) => {
                    if (d.depth === 1) return 0;
                    if (d.data.isDomainGroup) return 4;
                    return 2;
                })
                .on('mouseover', (event: any, d: any) => {
                    // Highlight rectangle
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .attr('stroke', config.themeDark ? '#fff' : '#000')
                        .attr('stroke-width', d.depth === 1 ? 3 : 2);

                    // Call the hover handler if provided
                    if (onNodeHover) {
                        onNodeHover(d, event);
                    }
                })
                .on('mouseout', (event: any, d: any) => {
                    // Reset rectangle style
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .attr('stroke', (d: any) => {
                            if (d.depth === 1) return config.themeDark ? '#777' : '#444';
                            if (d.data.isNamespace) return config.themeDark ? '#555' : '#aaa';
                            if (d.data.isDomainGroup) return config.themeDark ? '#aaa' : '#666';
                            return config.themeDark ? '#333' : '#ddd';
                        })
                        .attr('stroke-width', (d: any) => {
                            if (d.data.isDomainGroup) return 2.5;
                            if (d.depth === 1) return 2;
                            if (d.data.isNamespace) return 1.5;
                            return 1;
                        });

                    // Call the leave handler if provided
                    if (onNodeLeave) {
                        onNodeLeave();
                    }
                });

            // Add better positioned and sized text labels if enabled
            if (config.showLabels) {
                nodes.append('text')
                    .attr('class', 'node-label')
                    .attr('x', 5)
                    .attr('y', 15)
                    .attr('fill', (d: any) => {
                        if (d.depth <= 2) {
                            return config.themeDark ? '#fff' : '#000';
                        }
                        return this.getTextColor(d.data.coverage, config);
                    })
                    .attr('font-size', (d: any) => {
                        // Scale font size based on node size
                        const nodeWidth = d.x1 - d.x0;
                        const nodeHeight = d.y1 - d.y0;
                        const size = Math.min(nodeWidth, nodeHeight);

                        if (d.depth === 1) return Math.min(14, size / 10) + 'px';
                        if (d.depth === 2) return Math.min(12, size / 12) + 'px';
                        return Math.min(11, size / 15) + 'px';
                    })
                    .attr('font-weight', (d: any) => {
                        if (d.depth <= 2) return 'bold';
                        return 'normal';
                    })
                    .text((d: any) => this.getNodeLabel(d))
                    .each(function (this: any, d: any) {
                        // Hide text if rectangle is too small
                        const rectWidth = d.x1 - d.x0;
                        const rectHeight = d.y1 - d.y0;

                        // Different thresholds based on depth
                        const minWidth = d.depth <= 2 ? 60 : 40;
                        const minHeight = d.depth <= 2 ? 30 : 20;

                        if (rectWidth < minWidth || rectHeight < minHeight) {
                            d3.select(this).style('display', 'none');
                        }
                    });
            }

            // Add aggregation indicators if enabled
            if (config.groupSmallNodes) {
                this.addAggregationIndicators(root, container, config, onNodeClick);
            }

            // Add domain group indicators if there are any domain groups
            const hasDomainGroups = nodesToDisplay.some(d => (d.data as any).isDomainGroup);
            if (hasDomainGroups) {
                this.addDomainGroupIndicators(container, nodesToDisplay, config);
            }

            // Add a more compact coverage legend in a better position
            this.addCoverageLegend(svg, config);

        } catch (error) {
            console.error('Error updating visualization:', error);
        }
    }

    private highlightNode(svg: any, nodeName: string): void {
        // Reset all nodes to normal appearance
        svg
            .selectAll('rect.node-rect')
            .transition()
            .duration(300)
            .attr('stroke-width', (d: { depth: number; }) => (d.depth === 1 ? 2 : 1))
            .attr('stroke-opacity', 0.8);

        // Highlight the specified node
        svg
            .selectAll('rect.node-rect')
            .filter((d: { data: { name: string; }; }) => d.data.name === nodeName)
            .transition()
            .duration(300)
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 1);
    }

    private addDomainGroupIndicators(
        container: any,
        nodes: any[],
        config: TreemapConfig
    ): void {
        // Find domain group nodes
        const domainGroups = nodes.filter((d) => d.data.isDomainGroup);

        domainGroups.forEach((group) => {
            // Add a small indicator icon for domain groups
            container
                .append('circle')
                .attr('cx', group.x0 + 18)
                .attr('cy', group.y0 + 12)
                .attr('r', 8)
                .attr(
                    'fill',
                    config.themeDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
                )
                .attr('stroke', config.themeDark ? '#fff' : '#000')
                .attr('stroke-width', 1.5)
                .attr('class', 'domain-indicator');

            // Add domain icon
            container
                .append('text')
                .attr('x', group.x0 + 18)
                .attr('y', group.y0 + 16)
                .attr('text-anchor', 'middle')
                .attr('font-family', 'FontAwesome')
                .attr('font-size', '10px')
                .attr('fill', config.themeDark ? '#fff' : '#000')
                .text('\uf0e8'); // Using FontAwesome sitemap icon
        });
    }

    groupPackagesByDomain(data: Coverage[]): Coverage[] {
        // First, identify domain prefixes from package names
        const packagePrefixes = new Set<string>();
        data.forEach((item) => {
            if (item.packageName) {
                // Extract domain prefix (e.g., "Vanguard.Domain" from "Vanguard.Domain.Orders")
                const parts = item.packageName.split('.');
                if (parts.length >= 2) {
                    packagePrefixes.add(`${parts[0]}.${parts[1]}`);
                }
            }
        });

        // Create domain groups
        const result: Coverage[] = [];
        packagePrefixes.forEach((prefix) => {
            const domainClasses = data.filter((item) =>
                item.packageName?.startsWith(prefix)
            );

            // Only create a domain group if there are multiple packages within it
            const packages = new Set(domainClasses.map((item) => item.packageName));

            if (packages.size > 1) {
                // Create domain group node
                result.push({
                    className: `${prefix}.*`,
                    packageName: prefix,
                    coverage: this.calculateAverageCoverage(domainClasses),
                    linesValid: domainClasses.reduce(
                        (sum, item) => sum + item.linesValid,
                        0
                    ),
                    isDomainGroup: true,
                    children: domainClasses,
                });
            } else {
                // Add individual classes to result
                result.push(...domainClasses);
            }
        });

        return result;
    }

    private calculateAverageCoverage(nodes: Coverage[]): number {
        if (!nodes || nodes.length === 0) return 0;

        const totalLines = nodes.reduce((sum, item) => sum + (item.linesValid || 0), 0);
        const totalCovered = nodes.reduce((sum, item) => {
            const covered = item.linesCovered !== undefined
                ? item.linesCovered
                : (item.linesValid * item.coverage / 100);
            return sum + covered;
        }, 0);

        return totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;
    }

    private getNodeLabel(d: any): string {
        const name = d.data.name;
        const width = d.x1 - d.x0;

        if (width < 30) return '';

        // For domain groups, show special formatting
        if (d.data.isDomainGroup) {
            const domainName = name.replace('.*', '');
            const parts = domainName.split('.');
            const lastPart = parts[parts.length - 1];

            return lastPart + ' Domain';
        }

        // For namespaces, show cleaner package names
        if (d.data.isNamespace) {
            const parts = name.split('.');
            const displayName =
                parts.length > 2
                    ? parts[parts.length - 2] + '.' + parts[parts.length - 1]
                    : name;

            const maxChars = Math.floor(width / 7);
            if (displayName.length <= maxChars) return displayName;
            return displayName.substring(0, maxChars - 3) + '...';
        }

        // For class nodes, use smarter truncation
        const maxClassChars = Math.floor(width / 7);

        // For pattern-based class names, keep meaningful parts
        const patterns = [
            /(Service|Repository|Controller|Handler|Factory|Provider|Manager)$/,
            /^(I)([A-Z][a-z]+)/,
        ];

        for (const pattern of patterns) {
            const match = name.match(pattern);
            if (match) {
                const matchedPart = match[0];
                const prefix = name.substring(0, name.lastIndexOf(matchedPart));

                if (prefix.length + matchedPart.length <= maxClassChars) {
                    return prefix + matchedPart;
                }

                if (prefix.length <= maxClassChars - matchedPart.length - 3) {
                    return (
                        prefix.substring(0, maxClassChars - matchedPart.length - 3) +
                        '...' +
                        matchedPart
                    );
                }
            }
        }

        // Default truncation
        if (name.length <= maxClassChars) {
            return name;
        } else {
            return name.substring(0, maxClassChars - 3) + '...';
        }
    }

    private addCoverageLegend(svg: any, config: TreemapConfig): void {
        // Clear any existing legends
        svg.selectAll('.coverage-legend').remove();

        // Calculate proper positioning to keep legend inside viewable area
        // Use a percentage-based approach for more consistent positioning
        const rightMargin = 20; // pixels from right edge
        const legendX = config.width - rightMargin - 80; // 80px is approximate legend width

        // Bottom positioning with padding
        const bottomPadding = 20;
        const legendY =
            config.height - bottomPadding - config.coverageRanges.length * 22;

        // Create legend group
        const legendGroup = svg
            .append('g')
            .attr('class', 'coverage-legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);

        // Add semi-transparent background for better readability
        legendGroup
            .append('rect')
            .attr('x', -5)
            .attr('y', -25)
            .attr('width', 85) // Slightly wider to fit all content
            .attr('height', config.coverageRanges.length * 22 + 35)
            .attr(
                'fill',
                config.themeDark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.7)'
            )
            .attr('rx', 5)
            .attr('ry', 5)
            .attr(
                'stroke',
                config.themeDark ? 'rgba(80,80,100,0.3)' : 'rgba(180,180,200,0.5)'
            )
            .attr('stroke-width', 1);

        // Add legend title and items as before
        legendGroup
            .append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('font-size', '13px')
            .attr('font-weight', 'bold')
            .attr('fill', config.themeDark ? '#eee' : '#333')
            .text('Coverage');

        // Add legend items
        config.coverageRanges.forEach((range, i) => {
            const item = legendGroup
                .append('g')
                .attr('transform', `translate(0, ${i * 22})`);

            // Color box
            item
                .append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', range.color)
                .attr('rx', 2)
                .attr('ry', 2);

            // Label
            item
                .append('text')
                .attr('x', 22)
                .attr('y', 12)
                .attr('font-size', '12px')
                .attr('fill', config.themeDark ? '#eee' : '#333')
                .text(range.label);
        });

        // Add a debug check to ensure legend stays in bounds
        const rightEdge = legendX + 85;
        if (rightEdge > config.width) {
            console.warn('Legend may be cut off:', {
                configWidth: config.width,
                legendRight: rightEdge,
                overflow: rightEdge - config.width,
            });

            // Emergency repositioning if legend would overflow
            if (rightEdge > config.width) {
                const adjustment = rightEdge - config.width + 10;
                legendGroup.attr(
                    'transform',
                    `translate(${legendX - adjustment}, ${legendY})`
                );
            }
        }
    }

    private addAggregationIndicators(
        root: any,
        container: any,
        config: TreemapConfig,
        onNodeClick?: (node: any) => void
    ): void {
        // Find parents with small children
        const parentsWithSmallChildren = root.descendants().filter((d: any) => {
            if (!d.children) return false;

            return d.children.some((child: any) => {
                const nodeWidth = child.x1 - child.x0;
                const nodeHeight = child.y1 - child.y0;
                return nodeWidth < config.minNodeSize || nodeHeight < config.minNodeSize;
            });
        });

        // Add improved indicators
        parentsWithSmallChildren.forEach((parent: any) => {
            const smallChildren = parent.children.filter((child: any) => {
                const nodeWidth = child.x1 - child.x0;
                const nodeHeight = child.y1 - child.y0;
                return nodeWidth < config.minNodeSize || nodeHeight < config.minNodeSize;
            });

            if (smallChildren.length > 0) {
                // Create group for indicator
                const indicatorGroup = container.append('g')
                    .attr('class', 'aggregation-indicator-group')
                    .attr('transform', `translate(${parent.x0 + 25}, ${parent.y0 + 20})`)
                    .style('cursor', 'pointer')
                    .on('click', (event: any) => {
                        event.stopPropagation();
                        if (onNodeClick) {
                            onNodeClick(parent);
                        }
                    });

                // Add circle background with shadow
                indicatorGroup.append('circle')
                    .attr('r', 14)
                    .attr('fill', 'rgba(0,0,0,0.4)')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1.5)
                    .attr('filter', 'drop-shadow(0px 1px 2px rgba(0,0,0,0.3))');

                // Add counter text
                indicatorGroup.append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', 5)
                    .attr('fill', '#fff')
                    .attr('font-size', '12px')
                    .attr('font-weight', 'bold')
                    .attr('pointer-events', 'none')
                    .text(`+${smallChildren.length}`);

                // Add tooltip on hover
                indicatorGroup.append('title')
                    .text(`${smallChildren.length} hidden items - Click to view`);
            }
        });
    }

    groupSmallNodes(data: Coverage[], minSize: number = 5): Coverage[] {
        // First, group by package
        const packageGroups = new Map<string, Coverage[]>();

        for (const item of data) {
            const packageName = item.packageName || 'Default';
            if (!packageGroups.has(packageName)) {
                packageGroups.set(packageName, []);
            }
            packageGroups.get(packageName)!.push(item);
        }

        const result: Coverage[] = [];

        // For each package, separate small nodes and keep large ones
        packageGroups.forEach((items, packageName) => {
            const largeNodes = items.filter((item) => item.linesValid >= minSize);
            const smallNodes = items.filter((item) => item.linesValid < minSize);

            // Add all large nodes
            result.push(...largeNodes);

            // If we have small nodes, create an aggregate
            if (smallNodes.length > 0) {
                // Calculate aggregate metrics
                const totalLines = smallNodes.reduce(
                    (sum, item) => sum + item.linesValid,
                    0
                );
                const totalCoveredLines = smallNodes.reduce(
                    (sum, item) =>
                        sum +
                        (item.linesCovered || (item.linesValid * item.coverage) / 100),
                    0
                );
                const aggregateCoverage =
                    totalLines > 0 ? (totalCoveredLines / totalLines) * 100 : 0;

                // Create the "Other" node
                result.push({
                    className: `Other (${smallNodes.length} small classes)`,
                    packageName,
                    coverage: aggregateCoverage,
                    linesValid: totalLines,
                    linesCovered: totalCoveredLines,
                    isNamespace: false,
                    value: totalLines,
                    // Store the original small nodes for reference
                    children: smallNodes,
                });
            }
        });

        return result;
    }

    getCoverageColor(coverage: number, config: TreemapConfig): string {
        // First check if we can use config ranges
        if (config.coverageRanges && config.coverageRanges.length > 0) {
            const range = config.coverageRanges.find(
                (r) => coverage >= r.min && coverage <= r.max
            );
            if (range) return range.color;
        }

        // Use enhanced color palette based on colorMode
        if (config.colorMode === 'colorblind') {
            // Improved colorblind palette with better contrast
            if (coverage >= 90) return '#018571'; // Teal
            if (coverage >= 75) return '#80cdc1'; // Light teal
            if (coverage >= 50) return '#dfc27d'; // Tan
            if (coverage >= 25) return '#a6611a'; // Brown
            return '#d01c8b'; // Purple
        } else {
            // Enhanced default colors with better contrast
            if (coverage >= 90) return '#38a169'; // Green (darker)
            if (coverage >= 75) return '#68d391'; // Light green
            if (coverage >= 50) return '#f6e05e'; // Yellow
            if (coverage >= 25) return '#ed8936'; // Orange
            return '#e53e3e'; // Red
        }
    }

    getTextColor(coverage: number, config: TreemapConfig): string {
        // Get the background color to determine text color
        const backgroundColor = this.getCoverageColor(coverage, config);

        // Try to use design system text colors
        if (config.themeDark) {
            try {
                return (
                    getComputedStyle(document.documentElement)
                        .getPropertyValue('--text-color')
                        .trim() || '#ffffff'
                );
            } catch (e) {
                return '#ffffff';
            }
        }

        // Calculate contrast ratio to determine optimal text color
        try {
            // Convert hex to RGB
            const rgb = this.hexToRgb(backgroundColor);
            if (!rgb) return config.themeDark ? '#ffffff' : '#000000';

            // Calculate luminance - this is a better way to determine text color
            // Using the formula: (0.299*R + 0.587*G + 0.114*B)
            const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

            // Use white text for dark backgrounds, black text for light backgrounds
            // 0.5 is the threshold - below 0.5 is considered dark
            return luminance > 0.5 ? '#000000' : '#ffffff';
        } catch (e) {
            // Fallback to the previous logic
            if (coverage >= 90) return config.themeDark ? '#fff' : '#000';
            if (coverage >= 75) return config.themeDark ? '#fff' : '#222';
            if (coverage >= 50) return '#333';
            return '#ffffff';
        }
    }

    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        // Remove # if present
        hex = hex.replace(/^#/, '');

        // Parse hex
        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;

        // Check for valid values
        if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

        return { r, g, b };
    }

    getDefaultCoverageRanges(isDarkTheme: boolean = false): any[] {
        return [
            { min: 90, max: 100, label: '90-100%', color: '#4CAF50' },
            { min: 75, max: 89.9, label: '75-89%', color: '#8BC34A' },
            { min: 50, max: 74.9, label: '50-74%', color: '#FFC107' },
            { min: 25, max: 49.9, label: '25-49%', color: '#FF9800' },
            { min: 0, max: 24.9, label: '0-24%', color: '#F44336' },
        ];
    }

    getColorblindCoverageRanges(): any[] {
        return [
            { min: 90, max: 100, label: '90-100%', color: '#018571' }, // Teal
            { min: 75, max: 89.9, label: '75-89%', color: '#80cdc1' }, // Light teal
            { min: 50, max: 74.9, label: '50-74%', color: '#dfc27d' }, // Tan
            { min: 25, max: 49.9, label: '25-49%', color: '#a6611a' }, // Brown
            { min: 0, max: 24.9, label: '0-24%', color: '#d01c8b' }, // Purple
        ];
    }
}

// Declare global interfaces for TypeScript
declare global {
    interface Window {
        zoomControlsResizeHandlerAdded?: boolean;
    }

    interface SVGElement {
        __resizeObserver?: ResizeObserver;
    }
}
