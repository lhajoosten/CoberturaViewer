import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as d3 from 'd3';
import { CoverageData } from '../../../models/coverage.model';
import { CoverageStoreService } from '../../../services/coverage-store.service';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../services/utils/theme.service';

@Component({
    selector: 'app-coverage-sunburst',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './coverage-sunburst.component.html',
    styleUrls: ['./coverage-sunburst.component.scss']
})
export class CoverageSunburstComponent implements OnInit, AfterViewInit, OnDestroy {
    @ViewChild('sunburstContainer') sunburstContainer!: ElementRef;

    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    coverageData: CoverageData | null = null;
    isLoading = false;

    breadcrumbs: Array<{ name: string, node: any }> = [];
    currentNode: any = null;

    private width = 0;
    private height = 0;
    private radius = 0;
    private svg: any;
    private hierarchyData: any;
    private partition: any;
    private arc: any;
    private rootNode: any;

    constructor(
        private coverageStore: CoverageStoreService,
        private themeService: ThemeService
    ) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe((data: any) => {
            this.isLoading = true;
            this.coverageData = data;

            if (data && this.svg) {
                this.prepareHierarchyData();
                this.updateVisualization();
            }

            this.isLoading = false;
        });

        // Subscribe to theme changes
        this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
            this.isDarkTheme = isDark;
            this.updateVisualization();
        });
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.initVisualization();
        });
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    private initVisualization(): void {
        const element = this.sunburstContainer.nativeElement;

        // Get dimensions based on container size
        const containerRect = element.getBoundingClientRect();
        this.width = containerRect.width;
        this.height = containerRect.height;
        this.radius = Math.min(this.width, this.height) / 2;

        // Clear any existing SVG
        d3.select(element).select('svg').remove();

        // Create SVG
        this.svg = d3.select(element)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .append('g')
            .attr('transform', `translate(${this.width / 2},${this.height / 2})`);

        // Create partition layout
        this.partition = d3.partition()
            .size([2 * Math.PI, this.radius]);

        // Create arc generator
        this.arc = d3.arc()
            .startAngle((d: any) => d.x0)
            .endAngle((d: any) => d.x1)
            .innerRadius((d: any) => d.y0)
            .outerRadius((d: any) => d.y1);

        if (this.coverageData) {
            this.prepareHierarchyData();
            this.updateVisualization();
        }
    }

    private prepareHierarchyData(): void {
        if (!this.coverageData) {
            this.hierarchyData = { name: 'root', children: [] };
            return;
        }

        const root = {
            name: 'All Code',
            coverage: this.coverageData.summary.lineRate,
            linesValid: this.coverageData.summary.linesValid,
            children: this.coverageData.packages.map((pkg: { classes: any[]; name: any; lineRate: number; branchRate: any; }) => {
                // Calculate total lines for this package
                const totalLines = pkg.classes.reduce((sum: any, cls: { lines: string | any[]; }) => sum + cls.lines.length, 0);

                return {
                    name: pkg.name || 'Default Package',
                    coverage: pkg.lineRate,
                    branchRate: pkg.branchRate,
                    linesValid: totalLines,
                    linesCovered: totalLines * (pkg.lineRate / 100),
                    value: totalLines, // Size based on number of lines
                    children: pkg.classes.map((cls: { name: any; lineRate: number; branchRate: any; lines: string | any[]; filename: any; }) => ({
                        name: cls.name,
                        coverage: cls.lineRate,
                        branchRate: cls.branchRate,
                        linesValid: cls.lines.length,
                        linesCovered: cls.lines.length * (cls.lineRate / 100),
                        value: cls.lines.length, // Size based on number of lines
                        path: `${pkg.name || 'Default Package'}.${cls.name}`,
                        filename: cls.filename
                    }))
                };
            })
        };

        this.hierarchyData = root;

        // Initialize breadcrumbs with root
        this.breadcrumbs = [{
            name: 'All Code',
            node: this.hierarchyData
        }];

        this.currentNode = { data: this.hierarchyData };
    }

    updateVisualization(): void {
        if (!this.svg || !this.hierarchyData) return;

        // Clear previous visualization
        this.svg.selectAll('*').remove();

        // Create hierarchy
        const root = d3.hierarchy(this.hierarchyData)
            .sum(d => d.value || 0);

        this.rootNode = root;

        // Apply partition layout
        this.partition(root);

        // Capture component context
        const that = this;

        // Draw arcs
        const path = this.svg.selectAll('path')
            .data(root.descendants().slice(1)) // Skip the root node
            .enter()
            .append('path')
            .attr('d', this.arc)
            .style('fill', (d: any) => this.getCoverageColor(d.data.coverage))
            .style('stroke', this.isDarkTheme ? '#1a1a1a' : '#ffffff')
            .style('stroke-width', 1)
            .style('opacity', 1)
            .on('click', function (this: SVGPathElement, event: Event, d: any) {
                that.click(d);
            })
            .on('mouseover', function (this: SVGPathElement, event: MouseEvent, d: any) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('opacity', 0.8)
                    .style('stroke-width', 2)
                    .style('stroke', that.isDarkTheme ? '#ffffff' : '#000000');

                that.showTooltip(event, d);
            })
            .on('mousemove', function (this: SVGPathElement, event: MouseEvent) {
                that.moveTooltip(event);
            })
            .on('mouseout', function (this: SVGPathElement, event: MouseEvent) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .style('opacity', 1)
                    .style('stroke-width', 1)
                    .style('stroke', that.isDarkTheme ? '#1a1a1a' : '#ffffff');

                that.hideTooltip();
            });

        // Add text labels to larger arcs
        this.svg.selectAll('text')
            .data(root.descendants().slice(1).filter((d: any) => (d.x1 - d.x0) * this.radius > 30))
            .enter()
            .append('text')
            .attr('transform', (d: any) => {
                const x = (d.x0 + d.x1) / 2;
                const y = (d.y0 + d.y1) / 2;
                const angle = x - Math.PI / 2;
                const radius = (d.y0 + d.y1) / 2;  // This was the fixed line
                return `rotate(${angle * 180 / Math.PI}) translate(${radius},0) rotate(${angle >= Math.PI ? 180 : 0})`;
            })
            .attr('dx', (d: any) => (d.x1 - d.x0) * this.radius > 60 ? '-2em' : '-1em')
            .attr('dy', '.5em')
            .attr('text-anchor', 'middle')
            .text((d: any) => d.data.name.substring(0, 10) + (d.data.name.length > 10 ? '...' : ''))
            .style('font-size', '10px')
            .style('fill', (d: any) => this.getTextColor(d.data.coverage))
            .style('pointer-events', 'none');

        // Add center circle for navigating back
        this.svg.append('circle')
            .attr('r', this.radius * 0.1)
            .attr('fill', this.isDarkTheme ? '#333' : '#f8fafc')
            .attr('stroke', this.isDarkTheme ? '#444' : '#e2e8f0')
            .style('cursor', 'pointer')
            .on('click', () => this.resetView());

        // Add center icon
        this.svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .attr('font-family', 'FontAwesome')
            .attr('font-size', '14px')
            .attr('fill', this.isDarkTheme ? '#fff' : '#666')
            .text('\uf015') // Home icon
            .style('cursor', 'pointer')
            .on('click', () => this.resetView());
    }

    // Click handler for zooming
    private click(d: any): void {
        // Update breadcrumbs
        this.breadcrumbs = [
            ...this.breadcrumbs,
            { name: d.data.name, node: d }
        ];

        // Update current node
        this.currentNode = d;

        // Create new root by focusing on clicked node
        this.rootNode = d3.hierarchy(d.data)
            .sum(d => d.value || 0);

        // Apply partition layout to new root
        this.partition(this.rootNode);

        // Animate transition
        const path = this.svg.selectAll('path')
            .data(this.rootNode.descendants().slice(1))
            .transition()
            .duration(750)
            .attrTween('d', (d: any) => {
                const interpolate = d3.interpolate(
                    { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 },
                    { x0: 0, x1: 2 * Math.PI, y0: 0, y1: this.radius }
                );
                return (t: number) => this.arc(interpolate(t));
            });

        // Update text labels
        this.svg.selectAll('text')
            .data(this.rootNode.descendants().slice(1).filter((d: any) => (d.x1 - d.x0) * this.radius > 30))
            .transition()
            .duration(750)
            .attr('transform', (d: any) => {
                const x = (d.x0 + d.x1) / 2;
                const y = (d.y0 + d.y1) / 2;
                const angle = x - Math.PI / 2;
                const radius = (d.y0 + d.y1) / 2;
                return `rotate(${angle * 180 / Math.PI}) translate(${radius},0) rotate(${angle >= Math.PI ? 180 : 0})`;
            });
    }

    // Reset view to root node
    resetView(): void {
        if (!this.rootNode || !this.hierarchyData) return;

        // Reset breadcrumbs
        this.breadcrumbs = [{
            name: 'All Code',
            node: this.hierarchyData
        }];

        // Reset current node
        this.currentNode = { data: this.hierarchyData };

        // Create new hierarchy from root data
        this.rootNode = d3.hierarchy(this.hierarchyData)
            .sum(d => d.value || 0);

        // Apply partition layout
        this.partition(this.rootNode);

        // Animate transition
        const path = this.svg.selectAll('path')
            .data(this.rootNode.descendants().slice(1))
            .transition()
            .duration(750)
            .attrTween('d', (d: any) => {
                const interpolate = d3.interpolate(
                    { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 },
                    { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }
                );
                return (t: number) => this.arc(interpolate(t));
            });

        // Update text labels
        this.svg.selectAll('text')
            .data(this.rootNode.descendants().slice(1).filter((d: any) => (d.x1 - d.x0) * this.radius > 30))
            .transition()
            .duration(750)
            .attr('transform', (d: any) => {
                const x = (d.x0 + d.x1) / 2;
                const y = (d.y0 + d.y1) / 2;
                const angle = x - Math.PI / 2;
                const radius = (d.y0 + d.y1) / 2;
                return `rotate(${angle * 180 / Math.PI}) translate(${radius},0) rotate(${angle >= Math.PI ? 180 : 0})`;
            });
    }

    // Navigate to specific breadcrumb
    navigateToBreadcrumb(index: number): void {
        if (index >= this.breadcrumbs.length - 1) return;

        // Truncate breadcrumbs to selected index
        this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);

        // Update current node
        this.currentNode = this.breadcrumbs[index].node;

        // Create new hierarchy from node data
        this.rootNode = d3.hierarchy(this.currentNode.data)
            .sum(d => d.value || 0);

        // Apply partition layout
        this.partition(this.rootNode);

        // Animate transition
        const path = this.svg.selectAll('path')
            .data(this.rootNode.descendants().slice(1))
            .transition()
            .duration(750)
            .attrTween('d', (d: any) => {
                const interpolate = d3.interpolate(
                    { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 },
                    { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 }
                );
                return (t: number) => this.arc(interpolate(t));
            });

        // Update text labels
        this.svg.selectAll('text')
            .data(this.rootNode.descendants().slice(1).filter((d: any) => (d.x1 - d.x0) * this.radius > 30))
            .transition()
            .duration(750)
            .attr('transform', (d: any) => {
                const x = (d.x0 + d.x1) / 2;
                const y = (d.y0 + d.y1) / 2;
                const angle = x - Math.PI / 2;
                const radius = (d.y0 + d.y1) / 2;
                return `rotate(${angle * 180 / Math.PI}) translate(${radius},0) rotate(${angle >= Math.PI ? 180 : 0})`;
            });
    }

    // Export as PNG
    exportAsPNG(): void {
        const svgElement = this.svg.node().parentNode;

        // Create a canvas element
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Set canvas dimensions
        canvas.width = this.width;
        canvas.height = this.height;

        // Fill background
        if (context) {
            context.fillStyle = this.isDarkTheme ? '#1a1a1a' : '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Convert SVG to image
            const image = new Image();
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            image.onload = () => {
                // Draw image on canvas
                context.drawImage(image, 0, 0);
                URL.revokeObjectURL(url);

                // Convert canvas to PNG and trigger download
                canvas.toBlob(blob => {
                    if (blob) {
                        const downloadUrl = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = 'coverage-sunburst.png';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(downloadUrl);
                    }
                });
            };

            image.src = url;
        }
    }

    // Tooltip handling
    private tooltipDiv: any;

    private ensureTooltipExists(): void {
        if (!this.tooltipDiv) {
            this.tooltipDiv = d3.select('body').append('div')
                .attr('class', 'sunburst-tooltip')
                .style('opacity', 0)
                .style('position', 'absolute')
                .style('padding', '8px')
                .style('background', this.isDarkTheme ? '#333' : 'white')
                .style('color', this.isDarkTheme ? '#fff' : '#333')
                .style('border-radius', '4px')
                .style('pointer-events', 'none')
                .style('box-shadow', '0 0 10px rgba(0,0,0,0.1)')
                .style('z-index', 1000)
                .style('max-width', '300px');
        }
    }

    private showTooltip(event: MouseEvent, d: any): void {
        this.ensureTooltipExists();

        const tooltipContent = `
      <div style="font-weight: bold; margin-bottom: 5px;">${d.data.name}</div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>Coverage:</span>
        <span style="font-weight: 500; color: ${this.getCoverageColor(d.data.coverage)}">
          ${d.data.coverage.toFixed(2)}%
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span>Lines:</span>
        <span>${d.data.linesValid}</span>
      </div>
      ${d.data.path ? `
      <div style="display: flex; justify-content: space-between; font-size: 0.9em; color: ${this.isDarkTheme ? '#ccc' : '#666'};">
        <span>Path:</span>
        <span style="font-family: monospace; word-break: break-all;">${d.data.path}</span>
      </div>` : ''}
    `;

        this.tooltipDiv.html(tooltipContent)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px')
            .transition()
            .duration(200)
            .style('opacity', 0.9);

        // Update tooltip to match current theme
        this.tooltipDiv
            .style('background', this.isDarkTheme ? '#333' : 'white')
            .style('color', this.isDarkTheme ? '#fff' : '#333');
    }

    private moveTooltip(event: MouseEvent): void {
        if (this.tooltipDiv) {
            this.tooltipDiv
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 28) + 'px');
        }
    }

    private hideTooltip(): void {
        if (this.tooltipDiv) {
            this.tooltipDiv.transition()
                .duration(500)
                .style('opacity', 0);
        }
    }

    private getCoverageColor(coverage: number): string {
        if (coverage >= 90) return 'var(--excellent-color, #4caf50)';
        if (coverage >= 75) return 'var(--good-color, #8bc34a)';
        if (coverage >= 50) return 'var(--average-color, #ffb400)';
        return 'var(--poor-color, #f44336)';
    }

    private getTextColor(coverage: number): string {
        // For light background colors (high coverage), use dark text
        if (coverage >= 75) return this.isDarkTheme ? '#fff' : '#000';
        // For dark background colors (low coverage), use light text
        return '#ffffff';
    }

    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }
}