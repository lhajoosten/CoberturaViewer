import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Coverage } from '../../../../models/coverage.model';
import { TreemapLayoutService } from '../../../../services/utils/treemap-layout.service';
import * as d3 from 'd3';

@Component({
    selector: 'app-treemap-visualization',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './treemap-visualization.component.html',
    styleUrls: ['./treemap-visualization.component.scss']
})
export class TreemapVisualizationComponent implements OnChanges, OnInit, OnDestroy {
    @Input() data: Coverage[] = [];
    @Input() isDarkTheme = false;
    @Input() showLabels = true;
    @Input() groupSmallNodes = false;
    @Input() colorMode: 'default' | 'colorblind' = 'default';
    @Input() coverageRanges: any[] = [];

    @Output() nodeSelected = new EventEmitter<Coverage>();

    @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

    // Tooltip properties
    tooltipX = 0;
    tooltipY = 0;
    showTooltip = false;
    tooltipNode: Coverage | null = null;

    // Track the current visualization instance
    private treemapInstance: any = null;
    private resizeObserver: ResizeObserver | null = null;

    constructor(private treemapLayoutService: TreemapLayoutService) { }

    ngOnInit(): void {
        // Create the initial treemap
        this.buildTreemap();

        // Setup resize handling
        this.setupResizeObserver();
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Rebuild the treemap if data or major config changed
        const shouldRebuild = ['data', 'colorMode', 'groupSmallNodes'].some(prop => changes[prop]);

        if (shouldRebuild) {
            this.buildTreemap();
        }
        else if (changes['showLabels'] && this.treemapInstance) {
            // Just update the labels if only that property changed
            this.treemapInstance.updateLabels(this.showLabels);
        }
    }

    ngOnDestroy(): void {
        // Clean up the resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }
    }

    @HostListener('window:resize')
    onResize(): void {
        // Debounce this for better performance
        if (this.treemapInstance) {
            this.buildTreemap();
        }
    }

    private setupResizeObserver(): void {
        const container = this.containerRef.nativeElement;

        this.resizeObserver = new ResizeObserver(entries => {
            // Only rebuild if significant size change occurred
            if (this.treemapInstance) {
                this.buildTreemap();
            }
        });

        this.resizeObserver.observe(container);
    }

    private buildTreemap(): void {
        const container = this.containerRef.nativeElement;

        // Skip if data is empty or container not available
        if (!this.data?.length || !container) return;

        // Get dimensions from the container
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Clear existing content
        container.innerHTML = '';

        // Create an SVG element
        const svg = d3.select(container)
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet')
            .classed('treemap-svg', true);

        // Add a background
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', this.isDarkTheme ? '#1a1a1a' : '#f8fafc')
            .attr('rx', 8)
            .attr('class', 'treemap-background');

        // Create a container for the treemap cells
        const treemapContainer = svg.append('g')
            .attr('class', 'treemap-container');

        // Prepare the data hierarchy
        const hierarchy = this.prepareHierarchy(this.data);

        // Create the treemap layout
        const treemap = d3.treemap()
            .size([width - 20, height - 20]) // Padding
            .paddingOuter(3)
            .paddingInner(2)
            .paddingTop(this.showLabels ? 20 : 2)
            .round(true);

        // Apply the treemap layout to the hierarchy
        const root = treemap(hierarchy);

        // Create cells for each node
        const cells = treemapContainer.selectAll('g')
            .data(root.leaves())
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.x0 + 10},${d.y0 + 10})`)
            .on('click', (event, d) => {
                this.nodeSelected.emit(d.data as Coverage);
            });

        // Add rectangles to each cell
        cells.append('rect')
            .attr('width', d => Math.max(0, d.x1 - d.x0))
            .attr('height', d => Math.max(0, d.y1 - d.y0))
            .attr('fill', d => this.getCellColor(d.data as Coverage))
            .attr('stroke', this.isDarkTheme ? '#333' : '#ddd')
            .attr('rx', 4)
            .attr('ry', 4)
            .on('mouseover', (event, d) => {
                // Highlight on hover
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('stroke', this.isDarkTheme ? '#fff' : '#000')
                    .attr('stroke-width', 2);

                // Show tooltip
                this.tooltipNode = d.data as Coverage;
                const rect = event.currentTarget.getBoundingClientRect();
                this.tooltipX = rect.left + rect.width / 2;
                this.tooltipY = rect.top - 10;
                this.showTooltip = true;
            })
            .on('mouseout', (event, d) => {
                // Reset highlight
                d3.select(event.currentTarget)
                    .transition()
                    .duration(200)
                    .attr('stroke', this.isDarkTheme ? '#333' : '#ddd')
                    .attr('stroke-width', 1);

                // Hide tooltip
                this.showTooltip = false;
            });

        // Add labels if enabled
        if (this.showLabels) {
            cells.append('text')
                .attr('x', 5)
                .attr('y', 15)
                .attr('fill', d => this.getTextColor(d.data as Coverage))
                .attr('font-size', '12px')
                .text(d => this.truncateText((d.data as Coverage).className, d.x1 - d.x0))
                .attr('pointer-events', 'none')
                .each(function (d) {
                    // Hide text if rectangle is too small
                    const width = d.x1 - d.x0;
                    const height = d.y1 - d.y0;
                    if (width < 40 || height < 25) {
                        d3.select(this).style('display', 'none');
                    }
                });
        }

        // Add coverage percentage
        cells.append('text')
            .attr('x', 5)
            .attr('y', this.showLabels ? 35 : 20)
            .attr('fill', d => this.getTextColor(d.data as Coverage))
            .attr('font-size', '11px')
            .attr('font-weight', 'bold')
            .text(d => `${(d.data as Coverage).coverage.toFixed(1)}%`)
            .attr('pointer-events', 'none')
            .each(function (d) {
                // Hide text if rectangle is too small
                const width = d.x1 - d.x0;
                const height = d.y1 - d.y0;
                if (width < 40 || height < 25) {
                    d3.select(this).style('display', 'none');
                }
            });

        // Store the current visualization instance
        this.treemapInstance = {
            svg,
            updateLabels: (showLabels: boolean) => {
                // Toggle visibility of labels
                svg.selectAll('text.label')
                    .style('display', showLabels ? '' : 'none');
            }
        };
    }

    // Prepare the data hierarchy for D3's treemap layout using a similar approach to your example
    private prepareHierarchy(data: Coverage[]): d3.HierarchyNode<any> {
        // Group data by package first
        const packageMap = new Map<string, Coverage[]>();

        // Organize classes by package
        data.forEach(item => {
            const packageName = item.packageName || 'Default Package';
            if (!packageMap.has(packageName)) {
                packageMap.set(packageName, []);
            }
            packageMap.get(packageName)!.push(item);
        });

        // Calculate total lines and coverage for each package
        const packages = Array.from(packageMap.entries()).map(([packageName, classes]) => {
            const totalLines = classes.reduce((sum, cls) => sum + (cls.linesValid || 0), 0);
            const totalCovered = classes.reduce((sum, cls) => {
                return sum + ((cls.linesCovered !== undefined)
                    ? cls.linesCovered
                    : (cls.linesValid || 0) * (cls.coverage || 0) / 100);
            }, 0);

            const packageCoverage = totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;

            return {
                name: packageName,
                coverage: packageCoverage,
                linesValid: totalLines,
                linesCovered: totalCovered,
                value: totalLines, // Size based on number of lines
                children: classes.map(cls => ({
                    ...cls,
                    value: cls.linesValid || 1 // Ensure we have a value for sizing
                }))
            };
        });

        // Create the root node with all packages
        const root = {
            name: 'All Code',
            coverage: this.calculateOverallCoverage(data),
            linesValid: data.reduce((sum, item) => sum + (item.linesValid || 0), 0),
            value: data.reduce((sum, item) => sum + (item.linesValid || 0), 0),
            children: packages
        };

        // Convert to D3 hierarchy and explicitly set the value for sizing
        return d3.hierarchy(root)
            .sum(d => d.value)
            .sort((a, b) => (b.value || 0) - (a.value || 0));
    }

    // Calculate the overall coverage percentage
    private calculateOverallCoverage(data: Coverage[]): number {
        const totalLines = data.reduce((sum, item) => sum + (item.linesValid || 0), 0);
        const totalCovered = data.reduce((sum, item) => {
            return sum + ((item.linesCovered !== undefined)
                ? item.linesCovered
                : (item.linesValid || 0) * (item.coverage || 0) / 100);
        }, 0);

        return totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;
    }

    // Get cell color based on coverage
    private getCellColor(node: Coverage): string {
        const coverage = node.coverage;

        // Use either default or colorblind-friendly palette
        if (this.colorMode === 'colorblind') {
            if (coverage >= 90) return '#018571'; // Teal
            if (coverage >= 75) return '#80cdc1'; // Light teal  
            if (coverage >= 50) return '#dfc27d'; // Tan
            if (coverage >= 25) return '#a6611a'; // Brown
            return '#d01c8b'; // Purple for very low coverage
        } else {
            if (coverage >= 90) return '#4CAF50'; // Green
            if (coverage >= 75) return '#8BC34A'; // Light green
            if (coverage >= 50) return '#FFC107'; // Yellow  
            if (coverage >= 25) return '#FF9800'; // Orange
            return '#F44336'; // Red for very low coverage
        }
    }

    // Get text color that will be visible against the cell background
    private getTextColor(node: Coverage): string {
        const coverage = node.coverage;

        // Light text for dark backgrounds, dark text for light backgrounds
        if (coverage < 50) {
            return '#FFFFFF'; // White for low coverage (dark backgrounds)
        }
        return this.isDarkTheme ? '#FFFFFF' : '#000000';
    }

    // Truncate text to fit inside a cell
    private truncateText(text: string, width: number): string {
        // Calculate approximate number of characters that will fit
        const charWidth = 7; // Approximate width of one character in pixels
        const maxChars = Math.floor(width / charWidth);

        if (text.length <= maxChars) {
            return text;
        }

        return text.substring(0, maxChars - 3) + '...';
    }
}