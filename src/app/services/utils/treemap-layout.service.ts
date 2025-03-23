import { Injectable, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { Coverage, TreeNode } from '../../models/coverage.model';
import { TreemapConfig, TreemapFilter, ExclusionPattern } from '../../models/treemap-config.model';

@Injectable({
    providedIn: 'root',
})
export class TreemapLayoutService {
    /**
     * Creates a new treemap visualization and attaches it to the provided element
     * @param element DOM element to render the treemap into
     * @param data Hierarchical data to visualize
     * @param config Configuration options for appearance and behavior
     * @param onNodeClick Optional callback when a node is clicked
     * @param onNodeHover Optional callback when hovering over a node
     * @param onNodeLeave Optional callback when mouse leaves a node
     * @returns An instance object with methods to manipulate the treemap
     */
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
        const svg = d3
            .select(element.nativeElement)
            .append('svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('display', 'block'); // Important for proper sizing

        // Add background
        svg
            .append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', config.themeDark ? '#1a1a1a' : '#f8fafc')
            .attr('rx', 8)
            .attr('class', 'treemap-background');

        // Create container for zooming
        svg.append('g').attr('class', 'zoom-container');

        // Setup zoom behavior with proper bounds
        const zoom = d3
            .zoom()
            .scaleExtent([0.5, 8])
            .extent([
                [0, 0],
                [width, height],
            ])
            .on('zoom', (event) => {
                svg.select('.zoom-container').attr('transform', event.transform);
            });

        // Apply zoom behavior
        svg.call(zoom as any);

        // Create a reference object to store methods that can be called by the host component
        const treemapInstance = {
            svg,
            zoom,
            // Update the entire treemap with new data and configuration
            update: (updatedData: TreeNode, updatedConfig: TreemapConfig) => {
                // Ensure we update the dimensions too
                const updatedWidth = updatedConfig.width || width;
                const updatedHeight = updatedConfig.height || height;

                // Update viewBox to reflect new dimensions
                svg.attr('viewBox', `0 0 ${updatedWidth} ${updatedHeight}`);

                // Update background dimensions
                svg
                    .select('.treemap-background')
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
            // Update just the filters without rebuilding the entire treemap
            updateFilters: (filters: TreemapFilter) => {
                const updatedConfig = { ...config, filter: filters };
                this.updateVisualization(
                    svg,
                    data,
                    updatedConfig,
                    onNodeClick,
                    onNodeHover,
                    onNodeLeave
                );
            },
            // Zoom in to focus on a specific node
            zoomToNode: (node: any) => {
                this.zoomToNode(svg, zoom, node, config);
            },
            // Reset zoom level to show the entire treemap
            resetZoom: () => {
                svg
                    .transition()
                    .duration(300)
                    .call(zoom.transform as any, d3.zoomIdentity);
            },
            // Toggle label visibility
            updateLabels: (showLabels: boolean) => {
                // Update labels visibility
                svg.selectAll('text.node-label').style('opacity', showLabels ? 1 : 0);
            },
            // Highlight a specific node by name
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

    /**
     * Zooms the treemap view to focus on a specific node
     */
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

    /**
     * Updates the treemap visualization with new data or configuration
     */
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
        svg
            .select('.treemap-background')
            .attr('fill', config.themeDark ? '#1a1a1a' : '#f8fafc');

        try {
            // Apply exclusion filtering before visualization
            const filteredData = config.filter
                ? this.applyExclusionFiltering(data, config)
                : data;

            // Calculate optimal padding based on container size
            const paddingOuter = Math.max(3, Math.min(8, width / 100));
            const paddingInner = Math.max(2, Math.min(5, width / 150));
            const paddingTop = config.showLabels
                ? Math.max(20, height / 30)
                : paddingInner;

            const treemap = d3
                .treemap()
                .size([width, height])
                .paddingOuter(paddingOuter)
                .paddingInner(paddingInner)
                .paddingTop(paddingTop)
                .round(true)
                .tile(this.createTileFunctionWithMinSize(10));

            // Create hierarchy and apply treemap layout
            const root = d3.hierarchy(filteredData).sum((d: any) => d.value || 0);

            // Apply sorting based on configuration
            if (config.sortBy) {
                switch (config.sortBy) {
                    case 'coverage':
                        root.sort((a: any, b: any) => b.data.coverage - a.data.coverage);
                        break;
                    case 'name':
                        root.sort((a: any, b: any) => {
                            const nameA = a.data.name || '';
                            const nameB = b.data.name || '';
                            return nameA.localeCompare(nameB);
                        });
                        break;
                    case 'size':
                    default:
                        root.sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
                        break;
                }
            } else {
                // Default sort by size (value)
                root.sort((a: any, b: any) => (b.value || 0) - (a.value || 0));
            }

            treemap(root as any);

            // Filter nodes based on size if grouping is enabled
            const nodesToDisplay = root.descendants().filter((d: any) => {
                // Skip the root node
                if (d.depth === 0) return false;

                // For size-based filtering
                if (config.groupSmallNodes) {
                    const nodeWidth = (d.x1 as number) - (d.x0 as number);
                    const nodeHeight = (d.y1 as number) - (d.y0 as number);
                    return (
                        nodeWidth > config.minNodeSize && nodeHeight > config.minNodeSize
                    );
                }

                return true; // Default to showing all nodes
            });

            // Create node groups
            const nodes = container
                .selectAll('g.node')
                .data(nodesToDisplay)
                .enter()
                .append('g')
                .attr('class', (d: any) => {
                    const depth = d.depth;
                    const isNamespace = d.data.isNamespace;
                    const isDomainGroup = d.data.isDomainGroup;
                    return `node depth-${depth} ${isNamespace ? 'namespace' : 'class'} ${isDomainGroup ? 'domain-group' : ''
                        }`;
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
            nodes
                .append('rect')
                .attr('class', 'node-rect')
                .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
                .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
                .attr('fill', (d: any) =>
                    this.getCoverageColor(d.data.coverage, config)
                )
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
                            if (d.data.isDomainGroup)
                                return config.themeDark ? '#aaa' : '#666';
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
                nodes
                    .append('text')
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
            const hasDomainGroups = nodesToDisplay.some(
                (d) => (d.data as any).isDomainGroup
            );
            if (hasDomainGroups) {
                this.addDomainGroupIndicators(container, nodesToDisplay, config);
            }

            // Add a more compact coverage legend in a better position
            this.addCoverageLegend(svg, config);
        } catch (error) {
            console.error('Error updating visualization:', error);
        }
    }

    /**
     * Update the treemap instance with new filtering
     * @param treemapInstance The treemap instance to update
     * @param updatedConfig New configuration with filter settings
     */
    public updateFilters(
        treemapInstance: any,
        data: TreeNode,
        updatedConfig: TreemapConfig
    ): void {
        if (treemapInstance && treemapInstance.updateFilters) {
            treemapInstance.updateFilters(updatedConfig.filter);
        } else if (treemapInstance && treemapInstance.update) {
            treemapInstance.update(data, updatedConfig);
        }
    }

    /**
     * Highlights a specific node by name
     */
    private highlightNode(svg: any, nodeName: string): void {
        // Reset all nodes to normal appearance
        svg
            .selectAll('rect.node-rect')
            .transition()
            .duration(300)
            .attr('stroke-width', (d: { depth: number }) => (d.depth === 1 ? 2 : 1))
            .attr('stroke-opacity', 0.8);

        // Highlight the specified node
        svg
            .selectAll('rect.node-rect')
            .filter((d: { data: { name: string } }) => d.data.name === nodeName)
            .transition()
            .duration(300)
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 1);
    }

    /**
     * Adds domain group indicators to the visualization
     */
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

    /**
     * Groups packages by domain to create logical groups
     * @param data Flat list of coverage items
     * @returns Restructured list with domain groups
     */
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

    /**
     * Calculates average coverage across multiple nodes
     */
    private calculateAverageCoverage(nodes: Coverage[]): number {
        if (!nodes || nodes.length === 0) return 0;

        const totalLines = nodes.reduce(
            (sum, item) => sum + (item.linesValid || 0),
            0
        );
        const totalCovered = nodes.reduce((sum, item) => {
            const covered =
                item.linesCovered !== undefined
                    ? item.linesCovered
                    : (item.linesValid * item.coverage) / 100;
            return sum + covered;
        }, 0);

        return totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;
    }

    /**
     * Gets a display label for a node
     */
    private getNodeLabel(d: any): string {
        const name = d.data.name;
        const width = d.x1 - d.x0;

        if (width < 30) return '';

        // Clean up compiler-generated names
        let cleanName = name;

        // Fix compiler-generated iterator/state machine names
        if (cleanName.includes('<') && cleanName.includes('>')) {
            // Extract class name from the compiler-generated name
            const match = cleanName.match(/<(.+?)>/);
            if (match && match[1]) {
                cleanName = match[1]; // Use just the method name part
            }
        }

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
        if (cleanName.length <= maxClassChars) {
            return cleanName;
        } else {
            return cleanName.substring(0, maxClassChars - 3) + '...';
        }
    }

    /**
     * Creates a custom tile function with minimum node size
     */
    private createTileFunctionWithMinSize(minSize: number = 8) {
        return function (
            node: any,
            x0: number,
            y0: number,
            x1: number,
            y1: number
        ) {
            // First apply the standard binary treemap layout
            d3.treemapBinary(node, x0, y0, x1, y1);

            // Then adjust nodes that are too small
            if (!node.children) return;

            node.children.forEach((child: any) => {
                // Only apply to leaf nodes
                if (!child.children) {
                    const width = child.x1 - child.x0;
                    const height = child.y1 - child.y0;

                    // Ensure each dimension meets the minimum size
                    if (width < minSize) {
                        // Expand width while keeping centered position
                        const center = (child.x0 + child.x1) / 2;
                        child.x0 = Math.max(x0, center - minSize / 2);
                        child.x1 = Math.min(x1, center + minSize / 2);
                    }

                    if (height < minSize) {
                        // Expand height while keeping centered position
                        const center = (child.y0 + child.y1) / 2;
                        child.y0 = Math.max(y0, center - minSize / 2);
                        child.y1 = Math.min(y1, center + minSize / 2);
                    }
                }
            });
        };
    }

    /**
     * Adds coverage legend to the visualization
     */
    private addCoverageLegend(svg: any, config: TreemapConfig): void {
        // Clear any existing legends
        svg.selectAll('.coverage-legend').remove();

        // Calculate proper positioning to place legend at the top right
        const topMargin = 20;
        const rightMargin = 20;
        const legendX = config.width - rightMargin - 85;
        const legendY = topMargin;

        // Create legend group
        const legendGroup = svg
            .append('g')
            .attr('class', 'coverage-legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);

        // Add semi-transparent background for better readability
        legendGroup
            .append('rect')
            .attr('x', -5)
            .attr('y', -5)
            .attr('width', 85)
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

        // Add legend title
        legendGroup
            .append('text')
            .attr('x', 0)
            .attr('y', 15)
            .attr('font-size', '13px')
            .attr('font-weight', 'bold')
            .attr('fill', config.themeDark ? '#eee' : '#333')
            .text('Coverage');

        // Add legend items
        config.coverageRanges.forEach((range, i) => {
            const item = legendGroup
                .append('g')
                .attr('transform', `translate(0, ${i * 22 + 25})`);

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

        // Check if legend would overflow and adjust if needed
        const rightEdge = legendX + 85;
        if (rightEdge > config.width) {
            const adjustment = rightEdge - config.width + 10;
            legendGroup.attr(
                'transform',
                `translate(${legendX - adjustment}, ${legendY})`
            );
        }
    }

    /**
     * Adds indicators for nodes that are too small to display
     */
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
                return (
                    nodeWidth < config.minNodeSize || nodeHeight < config.minNodeSize
                );
            });
        });

        // Add improved indicators
        parentsWithSmallChildren.forEach((parent: any) => {
            const smallChildren = parent.children.filter((child: any) => {
                const nodeWidth = child.x1 - child.x0;
                const nodeHeight = child.y1 - child.y0;
                return (
                    nodeWidth < config.minNodeSize || nodeHeight < config.minNodeSize
                );
            });

            if (smallChildren.length > 0) {
                // Create group for indicator
                const indicatorGroup = container
                    .append('g')
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
                indicatorGroup
                    .append('circle')
                    .attr('r', 14)
                    .attr('fill', 'rgba(0,0,0,0.4)')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1.5)
                    .attr('filter', 'drop-shadow(0px 1px 2px rgba(0,0,0,0.3))');

                // Add counter text
                indicatorGroup
                    .append('text')
                    .attr('text-anchor', 'middle')
                    .attr('dy', 5)
                    .attr('fill', '#fff')
                    .attr('font-size', '12px')
                    .attr('font-weight', 'bold')
                    .attr('pointer-events', 'none')
                    .text(`+${smallChildren.length}`);

                // Add tooltip on hover
                indicatorGroup
                    .append('title')
                    .text(`${smallChildren.length} hidden items - Click to view`);
            }
        });
    }

    /**
     * Groups small nodes within packages to reduce visual clutter
     * @param data Coverage items to process
     * @param minSize Minimum number of lines for individual display
     * @returns Processed list with small nodes grouped
     */
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

    /**
     * Gets the appropriate color for a coverage percentage
     */
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

    /**
     * Determines the appropriate text color for a node based on its background
     */
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

    /**
     * Helper method to convert hex color to RGB
     */
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

    /**
     * Get default coverage color ranges
     */
    getDefaultCoverageRanges(isDarkTheme: boolean = false): any[] {
        return [
            { min: 90, max: 100, label: '90-100%', color: '#4CAF50' },
            { min: 75, max: 89.9, label: '75-89%', color: '#8BC34A' },
            { min: 50, max: 74.9, label: '50-74%', color: '#FFC107' },
            { min: 25, max: 49.9, label: '25-49%', color: '#FF9800' },
            { min: 0, max: 24.9, label: '0-24%', color: '#F44336' },
        ];
    }

    /**
     * Get colorblind-friendly coverage color ranges
     */
    getColorblindCoverageRanges(): any[] {
        return [
            { min: 90, max: 100, label: '90-100%', color: '#018571' }, // Teal
            { min: 75, max: 89.9, label: '75-89%', color: '#80cdc1' }, // Light teal
            { min: 50, max: 74.9, label: '50-74%', color: '#dfc27d' }, // Tan
            { min: 25, max: 49.9, label: '25-49%', color: '#a6611a' }, // Brown
            { min: 0, max: 24.9, label: '0-24%', color: '#d01c8b' }, // Purple
        ];
    }

    /**
     * Apply exclusion filtering to data before visualization
     * @param data Original data to filter
     * @param config Treemap configuration with filter settings
     * @returns Filtered data
     */
    public applyExclusionFiltering(
        data: TreeNode,
        config: TreemapConfig
    ): TreeNode {
        if (!config.filter) return data;

        // Deep clone to avoid modifying the original data
        const processedData = JSON.parse(JSON.stringify(data));

        // Apply filters recursively through the tree
        this.filterTreeRecursively(processedData, config.filter);

        return processedData;
    }

    /**
     * Recursively filter a tree node and its children based on filter criteria
     * @param node Current tree node to filter
     * @param filter Filter settings to apply
     * @returns True if the node should be kept, false if it should be filtered out
     */
    private filterTreeRecursively(
        node: TreeNode,
        filter: TreemapFilter
    ): boolean {
        if (!node) return false;

        // First check if this node should be excluded
        if (this.shouldExcludeNode(node, filter)) {
            return false;
        }

        // If it's a leaf node with no children, keep it (it passed the exclusion check)
        if (!node.children || node.children.length === 0) {
            return true;
        }

        // Filter children recursively
        const keepChildren: TreeNode[] = [];

        for (const child of node.children) {
            if (this.filterTreeRecursively(child, filter)) {
                keepChildren.push(child);
            }
        }

        // Update the node's children array with filtered results
        node.children = keepChildren;

        // If we've filtered out all children, check if we should keep this parent node
        if (node.children.length === 0) {
            if (
                filter.excludeEmptyPackages &&
                (node.isNamespace || node.packageName)
            ) {
                return false;
            }
        }

        // Always keep the node if it has any remaining children
        return true;
    }

    /**
     * Determine if a node should be excluded based on filter criteria
     * @param node Node to check
     * @param filter Filter settings
     * @returns True if the node should be excluded
     */
    private shouldExcludeNode(node: TreeNode, filter: TreemapFilter): boolean {
        const nodeName = node.name || '';
        const packageName = node.packageName || '';

        // 1. Skip domain groups - they're special aggregation nodes
        if (node.isDomainGroup) return false;

        // 2. Apply search term filter (highest priority)
        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            const nodeNameLower = nodeName.toLowerCase();
            const packageNameLower = packageName.toLowerCase();

            // Keep only if search term matches
            if (!nodeNameLower.includes(term) && !packageNameLower.includes(term)) {
                return true;
            }
        }

        // 3. Apply selected package filter
        if (filter.selectedPackage && filter.selectedPackage !== packageName) {
            return true;
        }

        // 4. Apply package exclusions
        if (filter.packageExclusions && filter.packageExclusions.length > 0) {
            for (const pattern of filter.packageExclusions) {
                // Handle exact matches
                if (pattern === packageName) return true;

                // Handle wildcard patterns (e.g., "Com.Example.*")
                if (
                    pattern.endsWith('*') &&
                    packageName.startsWith(pattern.slice(0, -1))
                ) {
                    return true;
                }
            }
        }

        // 5. Apply class name exclusions
        if (filter.classNameExclusions && filter.classNameExclusions.length > 0) {
            for (const pattern of filter.classNameExclusions) {
                // Handle exact matches
                if (pattern === nodeName) return true;

                // Handle wildcard patterns
                if (
                    pattern.endsWith('*') &&
                    nodeName.startsWith(pattern.slice(0, -1))
                ) {
                    return true;
                }
            }
        }

        // 6. Apply coverage threshold
        if (
            filter.coverageThreshold !== undefined &&
            node.coverage < filter.coverageThreshold
        ) {
            return true;
        }

        // 7. Apply minimum valid lines filter
        if (
            filter.minValidLines !== undefined &&
            node.linesValid < filter.minValidLines
        ) {
            return true;
        }

        // 8. Apply generated code filter
        if (filter.excludeGeneratedCode && this.isGeneratedCode(nodeName)) {
            return true;
        }

        // 9. Apply custom exclusion patterns
        if (filter.exclusionPatterns && filter.exclusionPatterns.length > 0) {
            for (const pattern of filter.exclusionPatterns) {
                if (!pattern.enabled) continue;

                switch (pattern.type) {
                    case 'class':
                        if (nodeName.includes(pattern.pattern)) {
                            return true;
                        }
                        break;
                    case 'package':
                        if (packageName.includes(pattern.pattern)) {
                            return true;
                        }
                        break;
                    case 'regex':
                        try {
                            const regex = new RegExp(pattern.pattern);
                            if (regex.test(nodeName) || regex.test(packageName)) {
                                return true;
                            }
                        } catch (e) {
                            console.error('Invalid regex pattern:', pattern.pattern);
                        }
                        break;
                }
            }
        }

        // If it passed all filters, don't exclude the node
        return false;
    }

    /**
     * Check if a class is compiler-generated code
     * @param className Name of the class to check
     * @returns True if it appears to be generated code
     */
    private isGeneratedCode(className: string): boolean {
        // This detects compiler-generated classes like iterator state machines, etc.
        return (
            className.includes('<>') ||
            className.includes('<PrivateImplementationDetails>') ||
            (className.includes('<') && className.includes('>d__')) ||
            className.includes('$') || // Another common pattern for generated code
            className.includes('__Closure') ||
            className.includes('$DisplayClass')
        );
    }
}
