import { Injectable, ElementRef } from '@angular/core';
import * as d3 from 'd3';
import { TreeNode } from '../../models/coverage.model';
import { TreemapConfig, TreemapFilter } from '../../models/treemap-config.model';
import { NotificationService } from './notification.service';
import { BaseType } from 'd3';

@Injectable({
    providedIn: 'root',
})
export class TreemapLayoutService {

    // Inject NotificationService
    constructor(private notificationService: NotificationService) { }

    public createTreemap(
        element: ElementRef,
        data: TreeNode,
        config: TreemapConfig,
        onNodeClick?: (node: d3.HierarchyRectangularNode<TreeNode>) => void,
        onNodeHover?: (node: d3.HierarchyRectangularNode<TreeNode>, event: MouseEvent) => void,
        onNodeLeave?: () => void
    ): any {
        // Clear any existing SVG
        d3.select(element.nativeElement).select('svg').remove();

        const width = config.width || 800;
        const height = config.height || 600;

        if (width <= 0 || height <= 0) {
            console.error("TreemapLayoutService: Invalid dimensions provided.", { width, height });
            return null; // Don't proceed with invalid dimensions
        }

        const svg = d3
            .select(element.nativeElement)
            .append('svg')
            .attr('class', 'treemap-svg')
            .attr('width', '100%')
            .attr('height', '100%')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .style('display', 'block');

        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', config.themeDark ? '#1a1a1a' : '#f8fafc')
            .attr('rx', 8)
            .attr('class', 'treemap-background');

        const zoomContainer = svg.append('g')
            .attr('class', 'zoom-container');

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.5, 8])
            .extent([[0, 0], [width, height]])
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                zoomContainer.attr('transform', event.transform.toString());
            });

        svg.call(zoom);

        const treemapInstance = {
            svg,
            zoom,
            update: (updatedData: TreeNode, updatedConfig: TreemapConfig) => {
                // Update dimensions
                const updatedWidth = updatedConfig.width || width;
                const updatedHeight = updatedConfig.height || height;

                if (updatedWidth <= 0 || updatedHeight <= 0) {
                    console.error("TreemapLayoutService Update: Invalid dimensions.", { updatedWidth, updatedHeight });
                    return;
                }

                svg.attr('viewBox', `0 0 ${updatedWidth} ${updatedHeight}`);
                svg.select('.treemap-background')
                    .attr('width', updatedWidth)
                    .attr('height', updatedHeight)
                    .attr('fill', updatedConfig.themeDark ? '#1a1a1a' : '#f8fafc');

                // Call the internal render logic with new data and config
                this.renderVisualization(
                    zoomContainer,
                    updatedData,
                    updatedConfig,
                    onNodeClick,
                    onNodeHover,
                    onNodeLeave
                );
            },
            zoomToNode: (node: d3.HierarchyRectangularNode<TreeNode>) => {
                this.zoomToNode(svg, zoom, node, config);
            },
            resetZoom: () => {
                svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity);
            },
            updateLabels: (showLabels: boolean) => {
                // Ensure labels update happens after potential rendering delay
                setTimeout(() => {
                    svg.selectAll('g.node text.node-label').style('opacity', showLabels ? 1 : 0);
                }, 0);
            },
            highlightNode: (nodeName: string) => {
                this.highlightNode(svg, nodeName);
            },
        };

        // Initial render
        this.renderVisualization(
            zoomContainer,
            data,
            config,
            onNodeClick,
            onNodeHover,
            onNodeLeave
        );

        return treemapInstance;
    }

    private renderVisualization(
        container: d3.Selection<SVGGElement, unknown, null, undefined>,
        data: TreeNode,
        config: TreemapConfig,
        onNodeClick?: (node: d3.HierarchyRectangularNode<TreeNode>) => void,
        onNodeHover?: (node: d3.HierarchyRectangularNode<TreeNode>, event: MouseEvent) => void,
        onNodeLeave?: () => void
    ): void {
        // Clear existing content
        container.selectAll('*').remove();

        // Get SVG root to add legend
        const svgRoot = container.select(function (this: SVGGElement) {
            return this.parentNode as SVGSVGElement;
        }) as d3.Selection<SVGSVGElement, unknown, null, undefined>;

        // Clear existing legend
        svgRoot.selectAll('.coverage-legend').remove();

        const width = config.width;
        const height = config.height;

        if (!data || width <= 0 || height <= 0) {
            console.warn("Cannot render treemap: Invalid data or dimensions");
            return;
        }

        try {
            // 1. Create Hierarchy & Sum
            const root = d3.hierarchy(data)
                .sum((d: TreeNode) => Math.max(0, d.value || 0)) as d3.HierarchyRectangularNode<TreeNode>;

            if (!root.value || root.value <= 0) {
                console.warn("Cannot render treemap: Root has no value");
                return;
            }

            // 2. Apply Sorting
            if (config.sortBy) {
                switch (config.sortBy) {
                    case 'coverage':
                        root.sort((a, b) => (b.data.coverage || 0) - (a.data.coverage || 0));
                        break;
                    case 'name':
                        root.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''));
                        break;
                    case 'size':
                    default:
                        root.sort((a, b) => (b.value || 0) - (a.value || 0));
                        break;
                }
            } else {
                // Default sort by size
                root.sort((a, b) => (b.value || 0) - (a.value || 0));
            }

            // 3. Calculate Treemap Layout with appropriate padding
            const paddingOuter = Math.max(3, Math.min(8, width / 100));
            const paddingInner = Math.max(2, Math.min(5, width / 150));
            const paddingTop = config.showLabels ? Math.max(20, height / 30) : paddingInner;

            d3.treemap<TreeNode>()
                .size([width, height])
                .paddingOuter(paddingOuter)
                .paddingInner(paddingInner)
                .paddingTop(paddingTop)
                .round(true)
                (root);

            // 4. Data Binding & Rendering (excluding root node)
            const allNodes = root.descendants().filter(d => d.depth > 0);
            console.log("Full layout calculated for node count:", allNodes.length);

            // Key function for stable updates
            const nodeKeyFn = (d: d3.HierarchyRectangularNode<TreeNode>): string => {
                return (d.data.packageName || `_pkg_${d.parent?.data?.name || 'root'}`) + '.' + d.data.name;
            };

            // Create and update node groups
            const nodeGroups = container
                .selectAll<SVGGElement, d3.HierarchyRectangularNode<TreeNode>>('g.node')
                .data(allNodes, nodeKeyFn)
                .join(
                    // Enter selection
                    enter => enter.append('g')
                        .attr('class', (d) => {
                            return `node depth-${d.depth} ${d.data.isNamespace ? 'namespace' : 'class'} ${d.data.isDomainGroup ? 'domain-group' : ''}`;
                        })
                        .attr('transform', (d) => `translate(${d.x0 ?? 0},${d.y0 ?? 0})`)
                        // Apply filtering using opacity/pointer-events
                        .style('opacity', d => this.shouldExcludeNode(d.data, config.filter || {}) ? 0 : 1)
                        .style('pointer-events', d => this.shouldExcludeNode(d.data, config.filter || {}) ? 'none' : 'all')
                        .call(selection => this.appendNodeElements(selection, config, onNodeClick, onNodeHover, onNodeLeave)),

                    // Update selection
                    update => update
                        .attr('class', (d) => {
                            return `node depth-${d.depth} ${d.data.isNamespace ? 'namespace' : 'class'} ${d.data.isDomainGroup ? 'domain-group' : ''}`;
                        })
                        .transition().duration(300)
                        .attr('transform', (d) => `translate(${d.x0 ?? 0},${d.y0 ?? 0})`)
                        .style('opacity', d => this.shouldExcludeNode(d.data, config.filter || {}) ? 0 : 1)
                        .style('pointer-events', d => this.shouldExcludeNode(d.data, config.filter || {}) ? 'none' : 'all')
                        .call(transition => {
                            // Update rectangles
                            transition.select('rect.node-rect')
                                .attr('width', (d) => Math.max(0, (d.x1 ?? d.x0 ?? 0) - (d.x0 ?? 0)))
                                .attr('height', (d) => Math.max(0, (d.y1 ?? d.y0 ?? 0) - (d.y0 ?? 0)))
                                .attr('fill', (d: any) => TreemapLayoutService.getCoverageColor(d.data.coverage, config))
                                .attr('stroke', (d) => TreemapLayoutService.getNodeStroke(d, config))
                                .attr('stroke-width', (d) => TreemapLayoutService.getNodeStrokeWidth(d));

                            // Update labels
                            if (config.showLabels) {
                                transition.select('text.node-label')
                                    .attr('fill', (d) => TreemapLayoutService.getTextColor(d.data.coverage, config))
                                    .attr('font-size', (d) => TreemapLayoutService.getNodeFontSize(d))
                                    .text((d) => TreemapLayoutService.getNodeLabel(d));
                            }
                        }),

                    // Exit selection
                    exit => exit.transition().duration(300).style('opacity', 0).remove()
                );

            // Update rectangles and labels for existing nodes
            nodeGroups.each(function (d) {
                const group = d3.select(this);
                const rect = group.select('rect.node-rect');

                if (rect.empty()) {
                    group.append('rect')
                        .attr('class', 'node-rect')
                        .attr('width', Math.max(0, (d.x1 ?? d.x0 ?? 0) - (d.x0 ?? 0)))
                        .attr('height', Math.max(0, (d.y1 ?? d.y0 ?? 0) - (d.y0 ?? 0)))
                        .attr('fill', (d: any) => TreemapLayoutService.getCoverageColor(d.data.coverage, config))
                        .attr('stroke', (d: any) => TreemapLayoutService.getNodeStroke(d, config))
                        .attr('stroke-width', (d) => TreemapLayoutService.getNodeStrokeWidth(d))
                        .attr('rx', (d.depth === 1 ? 0 : (d.data.isDomainGroup ? 4 : 2)))
                        .attr('ry', (d.depth === 1 ? 0 : (d.data.isDomainGroup ? 4 : 2)));
                }

                // Update or create labels
                if (config.showLabels) {
                    const label = group.select('text.node-label');
                    if (label.empty()) {
                        group.append('text')
                            .attr('class', 'node-label')
                            .attr('x', 5)
                            .attr('y', 15)
                            .attr('pointer-events', 'none')
                            .attr('fill', (d: any) => TreemapLayoutService.getTextColor(d.data.coverage, config))
                            .attr('font-size', (d: any) => TreemapLayoutService.getNodeFontSize(d))
                            .attr('font-weight', (d.depth <= 1 ? '600' : '400'))
                            .text((d: any) => TreemapLayoutService.getNodeLabel(d));
                    }
                }
            });

            // Add legend
            this.addCoverageLegend(svgRoot, config);

        } catch (error: any) {
            console.error("Error rendering treemap:", error);
            this.notificationService.showError(
                "Visualization Error",
                "An error occurred while rendering the treemap."
            );
        }
    }

    private appendNodeElements(
        selection: d3.Selection<SVGGElement, d3.HierarchyRectangularNode<TreeNode>, SVGGElement, unknown>,
        config: TreemapConfig,
        onNodeClick?: (node: d3.HierarchyRectangularNode<TreeNode>) => void,
        onNodeHover?: (node: d3.HierarchyRectangularNode<TreeNode>, event: MouseEvent) => void,
        onNodeLeave?: () => void
    ): void {
        // Add rectangles
        selection.append('rect')
            .attr('class', 'node-rect')
            .attr('width', (d) => Math.max(0, (d.x1 ?? d.x0 ?? 0) - (d.x0 ?? 0)))
            .attr('height', (d) => Math.max(0, (d.y1 ?? d.y0 ?? 0) - (d.y0 ?? 0)))
            .attr('fill', (d) => TreemapLayoutService.getCoverageColor(d.data.coverage, config))
            .attr('stroke', (d) => TreemapLayoutService.getNodeStroke(d, config))
            .attr('stroke-width', (d) => TreemapLayoutService.getNodeStrokeWidth(d))
            .attr('rx', (d) => (d.depth === 1 ? 0 : (d.data.isDomainGroup ? 4 : 2)))
            .attr('ry', (d) => (d.depth === 1 ? 0 : (d.data.isDomainGroup ? 4 : 2)))
            .style('cursor', onNodeClick ? 'pointer' : 'default')
            .on('click', (event: MouseEvent, d) => {
                // Don't allow click if node should be filtered out
                if (this.shouldExcludeNode(d.data, config.filter || {})) return;
                if (event.defaultPrevented || !onNodeClick) return;
                event.preventDefault();
                onNodeClick(d);
            })
            .on('mouseover', (event: MouseEvent, d) => {
                if (this.shouldExcludeNode(d.data, config.filter || {})) return;
                d3.select(event.currentTarget as SVGRectElement)
                    .transition().duration(100)
                    .attr('stroke', config.themeDark ? '#fff' : '#000')
                    .attr('stroke-width', d.depth === 1 ? 3 : 2.5);
                if (onNodeHover) onNodeHover(d, event);
            })
            .on('mouseout', (event: MouseEvent, d) => {
                d3.select(event.currentTarget as SVGRectElement)
                    .transition().duration(100)
                    .attr('stroke', (d: any) => TreemapLayoutService.getNodeStroke(d, config))
                    .attr('stroke-width', (d: any) => TreemapLayoutService.getNodeStrokeWidth(d));
                if (onNodeLeave) onNodeLeave();
            });

        // Add labels if enabled
        if (config.showLabels) {
            selection.append('text')
                .attr('class', 'node-label')
                .attr('x', 5)
                .attr('y', 15)
                .attr('pointer-events', 'none')
                .attr('fill', (d) => TreemapLayoutService.getTextColor(d.data.coverage, config))
                .attr('font-size', (d) => TreemapLayoutService.getNodeFontSize(d))
                .attr('font-weight', (d) => (d.depth <= 1 ? '600' : '400'))
                .style('opacity', 1)
                .text((d) => TreemapLayoutService.getNodeLabel(d))
                .each(function (d) {
                    // Check if label should be visible based on node size
                    const labelElement = d3.select(this);
                    const nodeWidth = (d.x1 ?? d.x0 ?? 0) - (d.x0 ?? 0);
                    const nodeHeight = (d.y1 ?? d.y0 ?? 0) - (d.y0 ?? 0);

                    let show = true;
                    if (nodeWidth < 15 || nodeHeight < 15) {
                        show = false;
                    } else {
                        try {
                            const textLength = this.getComputedTextLength() ?? 0;
                            const fontSize = parseFloat(labelElement.attr('font-size'));
                            if (textLength > (nodeWidth - 10) || nodeHeight < (fontSize + 5)) {
                                show = false;
                            }
                        } catch (e) {
                            show = false;
                        }
                    }

                    labelElement.style('display', show ? '' : 'none');
                });
        }
    }

    private shouldExcludeNode(nodeData: TreeNode, filter: TreemapFilter): boolean {
        if (!nodeData) return true; // Exclude null/undefined data

        const nodeName = nodeData.name || '';
        const packageName = nodeData.packageName || '';

        // Domain groups are visual constructs, don't filter them directly
        if (nodeData.isDomainGroup) return false;

        // Apply search term filter
        if (filter.searchTerm) {
            const term = filter.searchTerm.toLowerCase();
            if (!nodeName.toLowerCase().includes(term) && !packageName?.toLowerCase().includes(term)) {
                return true;
            }
        }

        // Apply selected package filter
        if (filter.selectedPackage && nodeData.packageName !== filter.selectedPackage) {
            // Allow package nodes themselves if they match
            if (!nodeData.isNamespace || nodeData.name !== filter.selectedPackage) {
                return true;
            }
        }

        // Apply package exclusions
        if (filter.packageExclusions?.length && nodeData.packageName) {
            if (filter.packageExclusions.some(pattern => this.matchesPattern(nodeData.packageName!, pattern))) {
                return true;
            }
        }

        // Apply class name exclusions
        if (!nodeData.isNamespace && filter.classNameExclusions?.length) {
            if (filter.classNameExclusions.some(pattern => this.matchesPattern(nodeName, pattern))) {
                return true;
            }
        }

        // Apply coverage threshold
        if (filter.coverageThreshold !== undefined && nodeData.coverage < filter.coverageThreshold) {
            return true;
        }

        // Apply minimum valid lines filter
        if (filter.minValidLines !== undefined && nodeData.linesValid < filter.minValidLines) {
            // Only filter leaf nodes by line count
            if (!nodeData.isNamespace) {
                return true;
            }
        }

        // Apply generated code filter
        if (!nodeData.isNamespace && filter.excludeGeneratedCode && this.isGeneratedCode(nodeName)) {
            return true;
        }

        // Apply custom exclusion patterns
        if (filter.exclusionPatterns?.length) {
            for (const pattern of filter.exclusionPatterns.filter(p => p.enabled)) {
                const target = pattern.type === 'class' ? nodeName : (nodeData.packageName || '');
                const isMatch = pattern.type === 'regex'
                    ? new RegExp(pattern.pattern).test(target)
                    : target.includes(pattern.pattern);

                if (isMatch) {
                    if (pattern.type === 'class' && !nodeData.isNamespace) return true;
                    if (pattern.type === 'package') return true;
                    if (pattern.type === 'regex') {
                        if (!nodeData.isNamespace && new RegExp(pattern.pattern).test(nodeName)) return true;
                        if (nodeData.packageName && new RegExp(pattern.pattern).test(nodeData.packageName)) return true;
                    }
                }
            }
        }

        return false; // Keep node if no exclusion criteria met
    }

    private matchesPattern(text: string, pattern: string): boolean {
        if (!text) return false;
        if (pattern.endsWith('*')) {
            return text.startsWith(pattern.slice(0, -1));
        }
        return text === pattern;
    }

    private isGeneratedCode(className: string): boolean {
        return (
            className.includes('<>') ||
            className.includes('<PrivateImplementationDetails>') ||
            (className.includes('<') && className.includes('>d__')) ||
            className.includes('$') ||
            className.includes('__Closure') ||
            className.includes('$DisplayClass')
        );
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

    private highlightNode(svg: any, nodeName: string): void {
        // Reset all nodes to normal appearance
        svg
            .selectAll('rect.node-rect')
            .transition()
            .duration(300)
            .attr('stroke-width', (d: any) => (d.depth === 1 ? 2 : 1))
            .attr('stroke-opacity', 0.8);

        // Highlight the specified node
        svg
            .selectAll('rect.node-rect')
            .filter((d: any) => d.data.name === nodeName)
            .transition()
            .duration(300)
            .attr('stroke', '#fff')
            .attr('stroke-width', 3)
            .attr('stroke-opacity', 1);
    }

    private static getNodeLabel(d: d3.HierarchyRectangularNode<TreeNode>): string {
        const nodeData = d.data;
        const name = nodeData.name || '';
        const width = (d.x1 ?? d.x0 ?? 0) - (d.x0 ?? 0);

        // Estimate character width loosely (adjust multiplier as needed)
        const approxCharWidth = parseFloat(TreemapLayoutService.getNodeFontSize(d)) * 0.6;
        const maxChars = Math.max(1, Math.floor(width / approxCharWidth)) - 1;

        if (maxChars <= 2) return ''; // Too small for any meaningful label

        let cleanName = name;

        // Simplify compiler-generated names
        if (cleanName.includes('<') && cleanName.includes('>')) {
            const match = cleanName.match(/^<(.+?)>/);
            if (match && match[1]) {
                cleanName = match[1];
                if (cleanName.includes('.')) {
                    cleanName = cleanName.substring(cleanName.lastIndexOf('.') + 1);
                }
            } else {
                cleanName = cleanName.replace(/<|>/g, '');
            }
        }

        // Handle inner class names
        cleanName = cleanName.includes('$') ? cleanName.substring(cleanName.lastIndexOf('$') + 1) : cleanName;

        // Special handling for namespaces/packages
        if (nodeData.isNamespace) {
            const parts = cleanName.split('.');
            let displayParts = parts;

            if (d.depth > 1 && parts.length > 1) {
                displayParts = [parts[parts.length - 1]];
            } else if (parts.length > 2) {
                displayParts = parts.slice(-2);
            }

            cleanName = displayParts.join('.');

            if (nodeData.isDomainGroup) {
                cleanName += ' (Domain)';
            }
        }

        // Apply truncation
        if (cleanName.length > maxChars) {
            return cleanName.substring(0, maxChars - 1) + '…';
        }

        return cleanName;
    }

    private addCoverageLegend(svg: any, config: TreemapConfig): void {
        // Clear any existing legends
        svg.selectAll('.coverage-legend').remove();

        // Calculate proper positioning
        const topMargin = 25;
        const rightMargin = 5;
        const legendX = config.width - rightMargin - 85;
        const legendY = topMargin;

        // Create legend group
        const legendGroup = svg
            .append('g')
            .attr('class', 'coverage-legend')
            .attr('transform', `translate(${legendX}, ${legendY})`);

        // Add semi-transparent background
        legendGroup
            .append('rect')
            .attr('x', -5)
            .attr('y', -5)
            .attr('width', 85)
            .attr('height', config.coverageRanges.length * 22 + 35)
            .attr('fill', config.themeDark ? 'rgba(20,20,20,0.7)' : 'rgba(255,255,255,0.7)')
            .attr('rx', 5)
            .attr('ry', 5)
            .attr('stroke', config.themeDark ? 'rgba(80,80,100,0.3)' : 'rgba(180,180,200,0.5)')
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
            legendGroup.attr('transform', `translate(${legendX - adjustment}, ${legendY})`);
        }
    }

    private static getNodeStroke(d: d3.HierarchyRectangularNode<TreeNode>, config: TreemapConfig): string {
        if (d.depth === 1) return config.themeDark ? '#777' : '#444';
        if (d.data.isNamespace) return config.themeDark ? '#555' : '#aaa';
        if (d.data.isDomainGroup) return config.themeDark ? '#aaa' : '#666';
        return config.themeDark ? '#333' : '#ddd';
    }

    private static getNodeStrokeWidth(d: any): number {
        if (d.data.isDomainGroup) return 2.5;
        if (d.depth === 1) return 2;
        if (d.data.isNamespace) return 1.5;
        return 1;
    }

    private static getNodeFontSize(d: d3.HierarchyRectangularNode<TreeNode>): string {
        const nodeWidth = (d.x1 ?? d.x0 ?? 0) - (d.x0 ?? 0);
        const nodeHeight = (d.y1 ?? d.y0 ?? 0) - (d.y0 ?? 0);
        const availableArea = nodeWidth * nodeHeight;

        let baseSize = 11; // Default small font size

        if (d.depth === 1) { // Top-level packages
            baseSize = 14;
        } else if (d.depth === 2) { // Second-level packages/classes
            baseSize = 12;
        }

        // Scale slightly with area, but clamp firmly
        const scaledSize = Math.sqrt(availableArea) / 20;
        const finalSize = Math.max(8, Math.min(baseSize, Math.round(scaledSize)));

        return `${finalSize}px`;
    }

    private static getCoverageColor(coverage: number, config: TreemapConfig): string {
        if (!config.coverageRanges || config.coverageRanges.length === 0) {
            // Fallback logic if ranges aren't provided
            if (coverage >= 90) return config.colorMode === 'colorblind' ? '#018571' : '#38a169';
            if (coverage >= 75) return config.colorMode === 'colorblind' ? '#80cdc1' : '#68d391';
            if (coverage >= 50) return config.colorMode === 'colorblind' ? '#dfc27d' : '#f6e05e';
            if (coverage >= 25) return config.colorMode === 'colorblind' ? '#a6611a' : '#ed8936';
            return config.colorMode === 'colorblind' ? '#d01c8b' : '#e53e3e';
        }

        const range = config.coverageRanges.find(r => coverage >= r.min && coverage <= r.max);
        return range ? range.color : (config.themeDark ? '#555' : '#ccc'); // Default color
    }

    private static getTextColor(coverage: number, config: TreemapConfig): string {
        // Get the background color to determine text color
        const backgroundColor = TreemapLayoutService.getCoverageColor(coverage, config);

        try {
            // Convert hex to RGB
            const rgb = this.hexToRgb(backgroundColor);
            if (!rgb) return config.themeDark ? '#ffffff' : '#000000';

            // Calculate luminance to determine optimal text color
            const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

            // Use white text for dark backgrounds, black text for light backgrounds
            return luminance > 0.5 ? '#000000' : '#ffffff';
        } catch (e) {
            // Fallback logic
            if (coverage >= 90) return config.themeDark ? '#fff' : '#000';
            if (coverage >= 75) return config.themeDark ? '#fff' : '#222';
            if (coverage >= 50) return '#333';
            return '#ffffff';
        }
    }

    private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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

    public getDefaultCoverageRanges(isDarkTheme: boolean = false): any[] {
        return [
            { min: 90, max: 100, label: '90-100%', color: '#4CAF50' },
            { min: 75, max: 89.9, label: '75-89%', color: '#8BC34A' },
            { min: 50, max: 74.9, label: '50-74%', color: '#FFC107' },
            { min: 25, max: 49.9, label: '25-49%', color: '#FF9800' },
            { min: 0, max: 24.9, label: '0-24%', color: '#F44336' },
        ];
    }

    public getColorblindCoverageRanges(): any[] {
        return [
            { min: 90, max: 100, label: '90-100%', color: '#018571' }, // Teal
            { min: 75, max: 89.9, label: '75-89%', color: '#80cdc1' }, // Light teal
            { min: 50, max: 74.9, label: '50-74%', color: '#dfc27d' }, // Tan
            { min: 25, max: 49.9, label: '25-49%', color: '#a6611a' }, // Brown
            { min: 0, max: 24.9, label: '0-24%', color: '#d01c8b' }, // Purple
        ];
    }
}