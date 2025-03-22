import { Injectable, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { TreeNode } from '../../models/coverage.model';
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

        // Add zoom controls
        this.addZoomControls(svg, zoom, config);

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
                .size([treemapWidth, config.height])
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

            // Make sure zoom controls are re-added as well
            this.addZoomControls(svg, d3.zoom, config);

        } catch (error) {
            console.error('Error updating visualization:', error);
        }
    }

    /**
     * Gets coverage color based on value and color mode
     */
    private getCoverageColor(coverage: number, config: TreemapConfig): string {
        if (config.colorMode === 'colorblind') {
            // Colorblind-friendly palette
            if (coverage >= 90) return '#018571'; // Teal
            if (coverage >= 75) return '#80cdc1'; // Light teal
            if (coverage >= 50) return '#dfc27d'; // Tan
            return '#a6611a'; // Brown
        } else {
            // Standard color palette based on coverage ranges
            const range = config.coverageRanges.find(r =>
                coverage >= r.min && coverage <= r.max
            );
            return range ? range.color : '#f44336'; // Default to red if no range matches
        }
    }

    /**
     * Gets text color based on background color
     */
    private getTextColor(coverage: number, config: TreemapConfig): string {
        // For high coverage (green backgrounds), use darker text
        if (coverage >= 90) return config.themeDark ? '#fff' : '#000';
        // For medium-high coverage (light green), use dark text
        if (coverage >= 75) return config.themeDark ? '#fff' : '#222';
        // For medium coverage (yellow), use dark text
        if (coverage >= 50) return '#333';
        // For low coverage (red backgrounds), use light text
        return '#ffffff';
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

    private addZoomControls(svg: any, zoom: any, config: TreemapConfig): void {
        // Remove any existing zoom controls
        svg.selectAll('.zoom-controls').remove();

        // Position the controls just to the right of the treemap content
        const treemapWidth = config.width - 60; // Same as controlsSpace from above
        const controlsY = 50;
        const buttonSpacing = 45;

        // Create control panel
        const controlPanel = svg.append('g')
            .attr('class', 'zoom-controls')
            .attr('transform', `translate(${treemapWidth + 20}, ${controlsY})`)

        // Modern translucent glass-like background for controls
        const borderColor = config.themeDark
            ? 'rgba(80, 80, 100, 0.4)'
            : 'rgba(180, 180, 200, 0.5)';

        // Helper function to create consistent buttons with enhanced visuals
        const createButton = (yOffset: number, icon: string, clickHandler: () => void, tooltip: string): void => {
            const buttonGroup = controlPanel.append('g')
                .attr('class', 'control-button')
                .attr('transform', `translate(0, ${yOffset})`)
                .style('cursor', 'pointer')
                .on('click', clickHandler);

            // Button background with subtle gradient
            const buttonRadius = 18;
            const buttonFill = config.themeDark
                ? 'url(#darkButtonGradient)'
                : 'url(#lightButtonGradient)';

            buttonGroup.append('circle')
                .attr('cx', -20)
                .attr('cy', 0)
                .attr('r', buttonRadius)
                .attr('fill', buttonFill)
                .attr('stroke', config.themeDark ? '#444' : '#ddd')
                .attr('stroke-width', 1);

            // Button icon - using SVG elements instead of text for better appearance
            const iconColor = config.themeDark ? '#ffffff' : '#333';

            if (icon === '+') {
                // Plus icon
                buttonGroup.append('line')
                    .attr('x1', -28)
                    .attr('y1', 0)
                    .attr('x2', -12)
                    .attr('y2', 0)
                    .attr('stroke', iconColor)
                    .attr('stroke-width', 2)
                    .attr('stroke-linecap', 'round');

                buttonGroup.append('line')
                    .attr('x1', -20)
                    .attr('y1', -8)
                    .attr('x2', -20)
                    .attr('y2', 8)
                    .attr('stroke', iconColor)
                    .attr('stroke-width', 2)
                    .attr('stroke-linecap', 'round');
            } else if (icon === '-') {
                // Minus icon
                buttonGroup.append('line')
                    .attr('x1', -28)
                    .attr('y1', 0)
                    .attr('x2', -12)
                    .attr('y2', 0)
                    .attr('stroke', iconColor)
                    .attr('stroke-width', 2)
                    .attr('stroke-linecap', 'round');
            } else if (icon === 'reset') {
                // Diamond icon
                buttonGroup.append('path')
                    .attr('d', 'M-20,-10 L-10,0 L-20,10 L-30,0 Z')
                    .attr('fill', 'none')
                    .attr('stroke', iconColor)
                    .attr('stroke-width', 2)
                    .attr('stroke-linejoin', 'round');
            }

            // Tooltip
            const tooltipBg = config.themeDark ? '#222' : '#fff';
            const tooltipText = config.themeDark ? '#fff' : '#333';

            const tooltipGroup = buttonGroup.append('g')
                .attr('class', 'tooltip')
                .style('opacity', 0)
                .attr('pointer-events', 'none');

            tooltipGroup.append('rect')
                .attr('x', -90)
                .attr('y', -12)
                .attr('width', 65)
                .attr('height', 24)
                .attr('rx', 4)
                .attr('ry', 4)
                .attr('fill', tooltipBg)
                .attr('stroke', borderColor)
                .attr('stroke-width', 1);

            tooltipGroup.append('text')
                .attr('x', -58)
                .attr('y', 0)
                .attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'middle')
                .attr('fill', tooltipText)
                .style('font-size', '11px')
                .style('font-family', 'Arial, sans-serif')
                .text(tooltip);

            // Hover effects with animations
            buttonGroup
                .on('mouseover', function (this: SVGGElement) {
                    d3.select(this).select('circle')
                        .transition()
                        .duration(200)
                        .attr('r', buttonRadius * 1.1)
                        .attr('stroke-width', 2);

                    d3.select(this).select('.tooltip')
                        .transition()
                        .duration(200)
                        .style('opacity', 0.9);
                })
                .on('mouseout', function (this: SVGGElement) {
                    d3.select(this).select('circle')
                        .transition()
                        .duration(200)
                        .attr('r', buttonRadius)
                        .attr('stroke-width', 1);

                    d3.select(this).select('.tooltip')
                        .transition()
                        .duration(200)
                        .style('opacity', 0);
                });
        };

        // Define gradients for buttons
        const defs = svg.append('defs');

        // Light theme gradient
        const lightGradient = defs.append('radialGradient')
            .attr('id', 'lightButtonGradient')
            .attr('cx', '0.5')
            .attr('cy', '0.5')
            .attr('r', '0.5')
            .attr('fx', '0.4')
            .attr('fy', '0.4');

        lightGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#ffffff');

        lightGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#f0f0f0');

        // Dark theme gradient
        const darkGradient = defs.append('radialGradient')
            .attr('id', 'darkButtonGradient')
            .attr('cx', '0.5')
            .attr('cy', '0.5')
            .attr('r', '0.5')
            .attr('fx', '0.4')
            .attr('fy', '0.4');

        darkGradient.append('stop')
            .attr('offset', '0%')
            .attr('stop-color', '#444');

        darkGradient.append('stop')
            .attr('offset', '100%')
            .attr('stop-color', '#333');

        // Create the buttons with smoother zoom behaviors
        createButton(buttonSpacing, '+', () => {
            svg.transition()
                .duration(400)
                .ease(d3.easeCubicOut)
                .call(zoom.scaleBy, 1.4);
        }, 'Zoom In');

        createButton(buttonSpacing * 2, '-', () => {
            svg.transition()
                .duration(400)
                .ease(d3.easeCubicOut)
                .call(zoom.scaleBy, 0.7);
        }, 'Zoom Out');

        createButton(buttonSpacing * 3, 'reset', () => {
            svg.transition()
                .duration(600)
                .ease(d3.easeCubicInOut)
                .call(zoom.transform, d3.zoomIdentity);
        }, 'Reset View');
    }

    /**
     * Adds coverage legend to the visualization
     */
    // Fix for legend positioning in the treemap-layout.service.ts
    private addCoverageLegend(svg: any, config: TreemapConfig): void {
        const treemapWidth = config.width - 80; // Same as controlsSpace from above
        const legendGroup = svg.append('g')
            .attr('class', 'coverage-legend')
            .attr('transform', `translate(${treemapWidth + 10}, ${config.height - 160 - (config.coverageRanges.length * 22)})`);

        // Add legend title with better spacing
        legendGroup.append('text')
            .attr('x', 0)
            .attr('y', -15) // Move further up to avoid overlap
            .attr('font-size', '13px')
            .attr('font-weight', 'bold')
            .attr('fill', config.themeDark ? '#eee' : '#333')
            .text('Coverage');

        // Add legend items with improved spacing
        config.coverageRanges.forEach((range, i) => {
            const item = legendGroup.append('g')
                .attr('transform', `translate(0, ${i * 22})`); // Increase spacing between items

            // Color box
            item.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', range.color)
                .attr('rx', 2)
                .attr('ry', 2);

            // Label with adjusted positioning
            item.append('text')
                .attr('x', 22) // Move text slightly further from the color box
                .attr('y', 12)
                .attr('font-size', '12px')
                .attr('fill', config.themeDark ? '#eee' : '#333')
                .text(range.label);
        });
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