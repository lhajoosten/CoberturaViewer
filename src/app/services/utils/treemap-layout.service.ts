import { Injectable, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { Coverage, TreeNode } from '../../models/coverage.model';
import { TreemapConfig } from '../../models/treemap-config.model';

@Injectable({
    providedIn: 'root'
})
export class TreemapLayoutService {
    /**
     * Creates a new D3 treemap visualization
     * Updated to support event handlers as parameters
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

        // Create SVG container
        const svg = d3.select(element.nativeElement)
            .append('svg')
            .attr('width', config.width)
            .attr('height', config.height)
            .attr('viewBox', `0 0 ${config.width} ${config.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Add background
        svg.append('rect')
            .attr('width', config.width)
            .attr('height', config.height)
            .attr('fill', config.themeDark ? '#1a1a1a' : '#f8fafc')
            .attr('rx', 8)
            .attr('class', 'treemap-background');

        // Create container for zooming
        svg.append('g')
            .attr('class', 'zoom-container');

        // Setup zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 8])
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
            }
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
     * Zooms the view to a specific node
     */
    private zoomToNode(svg: any, zoom: any, node: any, config: TreemapConfig): void {
        if (!node) return;

        const bounds = {
            x0: node.x0,
            y0: node.y0,
            x1: node.x1,
            y1: node.y1
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
        svg.transition().duration(750).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(config.width / 2, config.height / 2)
                .scale(scale)
                .translate(-x, -y)
        );
    }

    /**
     * Updates the visualization with new data or config
     * Updated to support event handlers as parameters
     */
    private updateVisualization(
        svg: any,
        data: TreeNode,
        config: TreemapConfig,
        onNodeClick?: (node: any) => void,
        onNodeHover?: (node: any, event: MouseEvent) => void,
        onNodeLeave?: () => void
    ): void {
        // Clear ALL existing visualization elements, including legends!
        svg.select('.zoom-container').selectAll('*').remove();

        // ALSO remove any existing legends before creating new ones
        svg.selectAll('.coverage-legend').remove();
        svg.selectAll('.zoom-controls').remove();

        const container = svg.select('.zoom-container');

        // Update background color
        svg.select('.treemap-background')
            .attr('fill', config.themeDark ? '#1a1a1a' : '#f8fafc');

        try {
            // Adjust the treemap size to leave space for controls and legend
            const controlsSpace = 80; // Space reserved for controls/legend
            const treemapWidth = config.width - controlsSpace;

            // Apply the treemap layout with reduced width
            const treemap = d3.treemap()
                .size([config.width - 10, config.height]) // Slight adjustment to leave room for legend
                .paddingOuter(3)
                .paddingInner(2)
                .paddingTop(config.showLabels ? 20 : 2)
                .round(true);

            // Create hierarchy
            const root = d3.hierarchy(data)
                .sum((d: any) => d.value || 0)
                .sort((a: any, b: any) => (b.value || 0) - (a.value || 0));

            // Apply treemap layout
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
                    return `node depth-${depth} ${isNamespace ? 'namespace' : 'class'}`;
                })
                .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
                .on('click', (event: any, d: any) => {
                    if (event.defaultPrevented) return;
                    event.preventDefault();
                    // Call the click handler if provided
                    if (onNodeClick) {
                        onNodeClick(d);
                    }
                });

            // Add rectangles to nodes
            nodes.append('rect')
                .attr('width', (d: any) => Math.max(0, d.x1 - d.x0))
                .attr('height', (d: any) => Math.max(0, d.y1 - d.y0))
                .attr('fill', (d: any) => this.getCoverageColor(d.data.coverage, config))
                .attr('stroke', (d: any) => {
                    // Darker stroke for top-level containers
                    if (d.depth === 1) return config.themeDark ? '#777' : '#444';
                    // Slightly darker stroke for namespaces
                    if (d.data.isNamespace) return config.themeDark ? '#555' : '#aaa';
                    // Default stroke for classes
                    return config.themeDark ? '#333' : '#ddd';
                })
                .attr('stroke-width', (d: any) => {
                    // Thicker borders for higher level containers
                    if (d.depth === 1) return 2;
                    if (d.data.isNamespace) return 1.5;
                    return 1;
                })
                .attr('rx', (d: any) => d.depth === 1 ? 0 : 2) // Square corners for top level, rounded for others
                .attr('ry', (d: any) => d.depth === 1 ? 0 : 2)
                .attr('data-name', (d: any) => d.data.name)
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
                            return config.themeDark ? '#333' : '#ddd';
                        })
                        .attr('stroke-width', (d: any) => {
                            if (d.depth === 1) return 2;
                            if (d.data.isNamespace) return 1.5;
                            return 1;
                        });

                    // Call the leave handler if provided
                    if (onNodeLeave) {
                        onNodeLeave();
                    }
                });

            // Add text labels if enabled
            if (config.showLabels) {
                nodes.append('text')
                    .attr('x', 5) // Small padding
                    .attr('y', 15) // Position for text
                    .attr('fill', (d: any) => {
                        if (d.depth <= 2) {
                            // For top levels, use a consistent color
                            return config.themeDark ? '#fff' : '#000';
                        }
                        return this.getTextColor(d.data.coverage, config);
                    })
                    .attr('font-size', (d: any) => {
                        // Larger font for top levels, smaller for deeper levels
                        if (d.depth === 1) return '14px';
                        if (d.depth === 2) return '12px';
                        return '11px';
                    })
                    .attr('font-weight', (d: any) => {
                        // Bolder for top levels
                        if (d.depth <= 2) return 'bold';
                        return 'normal';
                    })
                    .text((d: any) => this.getNodeLabel(d))
                    .each(function (this: any, d: any) {
                        // Hide text if rectangle is too small
                        const rectWidth = d.x1 - d.x0;
                        const rectHeight = d.y1 - d.y0;

                        // Different thresholds based on depth
                        const minWidth = d.depth <= 2 ? 80 : 50;
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

            // Add coverage legend
            this.addCoverageLegend(svg, config);

        } catch (error) {
            console.error('Error updating visualization:', error);
        }
    }

    /**
     * Gets node label with truncation if needed
     */
    private getNodeLabel(d: any): string {
        const name = d.data.name;
        const width = d.x1 - d.x0;

        // If rectangle is too small, don't show text
        if (width < 30) return '';

        // For namespaces, show full name if possible
        if (d.data.isNamespace) {
            const maxChars = Math.floor(width / 7);

            // For top-level nodes, always show the full name if possible
            if (d.depth <= 2 || name.length <= maxChars) return name;

            // For long names that won't fit, truncate with ellipsis
            if (name.length > maxChars) {
                return name.substring(0, maxChars - 3) + '...';
            }
        }

        // For class nodes, truncate if needed
        const maxClassChars = Math.floor(width / 7);

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
        const legendY = config.height - bottomPadding - (config.coverageRanges.length * 22);

        // Create legend group
        const legendGroup = svg.append('g')
            .attr('class', 'coverage-legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);

        // Add semi-transparent background for better readability
        legendGroup.append('rect')
            .attr('x', -5)
            .attr('y', -25)
            .attr('width', 85) // Slightly wider to fit all content
            .attr('height', (config.coverageRanges.length * 22) + 35)
            .attr('fill', config.themeDark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.7)')
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('stroke', config.themeDark ? 'rgba(80,80,100,0.3)' : 'rgba(180,180,200,0.5)')
            .attr('stroke-width', 1);

        // Add legend title and items as before
        legendGroup.append('text')
            .attr('x', 0)
            .attr('y', -10)
            .attr('font-size', '13px')
            .attr('font-weight', 'bold')
            .attr('fill', config.themeDark ? '#eee' : '#333')
            .text('Coverage');

        // Add legend items
        config.coverageRanges.forEach((range, i) => {
            const item = legendGroup.append('g')
                .attr('transform', `translate(0, ${i * 22})`);

            // Color box
            item.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', range.color)
                .attr('rx', 2)
                .attr('ry', 2);

            // Label
            item.append('text')
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
                overflow: rightEdge - config.width
            });

            // Emergency repositioning if legend would overflow
            if (rightEdge > config.width) {
                const adjustment = rightEdge - config.width + 10;
                legendGroup.attr('transform', `translate(${legendX - adjustment}, ${legendY})`);
            }
        }
    }

    /**
     * Adds indicators for small nodes that are grouped
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
                return nodeWidth < config.minNodeSize || nodeHeight < config.minNodeSize;
            });
        });

        // Add indicators
        parentsWithSmallChildren.forEach((parent: any) => {
            const smallChildren = parent.children.filter((child: any) => {
                const nodeWidth = child.x1 - child.x0;
                const nodeHeight = child.y1 - child.y0;
                return nodeWidth < config.minNodeSize || nodeHeight < config.minNodeSize;
            });

            if (smallChildren.length > 0) {
                // Add indicator
                container.append('circle')
                    .attr('cx', parent.x0 + 20)
                    .attr('cy', parent.y0 + 20)
                    .attr('r', 12)
                    .attr('fill', 'rgba(0,0,0,0.4)')
                    .attr('stroke', '#fff')
                    .attr('stroke-width', 1)
                    .attr('class', 'aggregation-indicator')
                    .on('click', (event: any) => {
                        event.stopPropagation();
                        // Call the node click handler if provided, passing the parent node
                        if (onNodeClick) {
                            onNodeClick(parent);
                        }
                    })
                    .append('title')
                    .text(`${smallChildren.length} hidden items - Click to view`);

                // Add counter text
                container.append('text')
                    .attr('x', parent.x0 + 20)
                    .attr('y', parent.y0 + 24)
                    .attr('text-anchor', 'middle')
                    .attr('fill', '#fff')
                    .attr('font-size', '10px')
                    .attr('font-weight', 'bold')
                    .attr('pointer-events', 'none')
                    .text(`+${smallChildren.length}`);
            }
        });
    }

    // This method groups small nodes into a single "Other" node per package
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
            const largeNodes = items.filter(item => item.linesValid >= minSize);
            const smallNodes = items.filter(item => item.linesValid < minSize);

            // Add all large nodes
            result.push(...largeNodes);

            // If we have small nodes, create an aggregate
            if (smallNodes.length > 0) {
                // Calculate aggregate metrics
                const totalLines = smallNodes.reduce((sum, item) => sum + item.linesValid, 0);
                const totalCoveredLines = smallNodes.reduce((sum, item) =>
                    sum + (item.linesCovered || item.linesValid * item.coverage / 100), 0);
                const aggregateCoverage = totalLines > 0 ? (totalCoveredLines / totalLines) * 100 : 0;

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
                    children: smallNodes
                });
            }
        });

        return result;
    }

    getCoverageColor(coverage: number, config: TreemapConfig): string {
        if (config.colorMode === 'colorblind') {
            // Colorblind-friendly palette
            if (coverage >= 90) return '#018571'; // Teal
            if (coverage >= 75) return '#80cdc1'; // Light teal
            if (coverage >= 50) return '#dfc27d'; // Tan
            if (coverage >= 25) return '#a6611a'; // Brown
            return '#d01c8b'; // Purple for very low coverage
        } else {
            // Try to use the coverage ranges from config first
            if (config.coverageRanges && config.coverageRanges.length > 0) {
                const range = config.coverageRanges.find(r =>
                    coverage >= r.min && coverage <= r.max
                );
                if (range) return range.color;
            }

            // Fallback to CSS variables if available
            try {
                if (coverage >= 90) return getComputedStyle(document.documentElement).getPropertyValue('--excellent-color').trim() || '#4caf50';
                if (coverage >= 75) return getComputedStyle(document.documentElement).getPropertyValue('--good-color').trim() || '#8bc34a';
                if (coverage >= 50) return getComputedStyle(document.documentElement).getPropertyValue('--average-color').trim() || '#ffb400';
                if (coverage >= 25) return getComputedStyle(document.documentElement).getPropertyValue('--poor-color').trim() || '#f44336';
                return getComputedStyle(document.documentElement).getPropertyValue('--poor-color').trim() || '#f44336';
            } catch (e) {
                // If CSS variables fail, use hardcoded colors
                if (coverage >= 90) return '#4caf50'; // Green
                if (coverage >= 75) return '#8bc34a'; // Light green
                if (coverage >= 50) return '#ffb400'; // Yellow/orange
                if (coverage >= 25) return '#ff9800'; // Orange
                return '#f44336';    // Red
            }
        }
    }

    getTextColor(coverage: number, config: TreemapConfig): string {
        // Get the background color to determine text color
        const backgroundColor = this.getCoverageColor(coverage, config);

        // Try to use design system text colors
        if (config.themeDark) {
            try {
                return getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim() || '#ffffff';
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
    private hexToRgb(hex: string): { r: number, g: number, b: number } | null {
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

    // Default coverage ranges for the visualization
    getDefaultCoverageRanges(isDarkTheme: boolean = false): any[] {
        return [
            { min: 90, max: 100, label: '90-100%', color: '#4CAF50' },
            { min: 75, max: 89.9, label: '75-89%', color: '#8BC34A' },
            { min: 50, max: 74.9, label: '50-74%', color: '#FFC107' },
            { min: 25, max: 49.9, label: '25-49%', color: '#FF9800' },
            { min: 0, max: 24.9, label: '0-24%', color: '#F44336' }
        ];
    }

    // Colorblind-friendly coverage ranges
    getColorblindCoverageRanges(): any[] {
        return [
            { min: 90, max: 100, label: '90-100%', color: '#018571' }, // Teal
            { min: 75, max: 89.9, label: '75-89%', color: '#80cdc1' }, // Light teal
            { min: 50, max: 74.9, label: '50-74%', color: '#dfc27d' }, // Tan
            { min: 25, max: 49.9, label: '25-49%', color: '#a6611a' }, // Brown
            { min: 0, max: 24.9, label: '0-24%', color: '#d01c8b' }    // Purple
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