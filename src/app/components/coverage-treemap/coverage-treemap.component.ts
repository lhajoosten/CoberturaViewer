import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { CoverageData } from '../../models/coverage.model';
import * as d3 from 'd3';

@Component({
    selector: 'app-coverage-treemap',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './coverage-treemap.component.html',
    styleUrls: ['./coverage-treemap.component.scss']
})
export class CoverageTreemapComponent implements OnInit, AfterViewInit {
    @ViewChild('treemapContainer') treemapContainer!: ElementRef;

    coverageData: CoverageData | null = null;
    minCoverage = 0;
    hasData = false;
    hoverInfo: any = null;

    private width = 0;
    private height = 0;
    private svg: any;
    private hierarchyData: any;

    constructor(private coverageStore: CoverageStoreService) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe(data => {
            console.log('Coverage data received:', data);
            this.coverageData = data;
            this.hasData = !!data;
            if (data && this.svg) {
                this.prepareHierarchyData();
                this.updateVisualization();
            }
        });
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.initVisualization();
        });
    }

    private initVisualization(): void {
        const element = this.treemapContainer.nativeElement;
        console.log('Container dimensions:', element.clientWidth, element.clientHeight);

        // Set fixed dimensions if the container size is 0 or very small
        this.width = element.clientWidth > 50 ? element.clientWidth : 800;
        this.height = element.clientHeight > 50 ? element.clientHeight : 600;

        // Clear any existing SVG first
        d3.select(element).select('svg').remove();

        this.svg = d3.select(element)
            .append('svg')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('viewBox', `0 0 ${this.width} ${this.height}`)
            .attr('preserveAspectRatio', 'xMidYMid meet');

        // Add a background rectangle for debugging
        this.svg.append('rect')
            .attr('width', this.width)
            .attr('height', this.height)
            .attr('fill', '#f8fafc')
            .attr('rx', 8);

        if (this.coverageData) {
            this.prepareHierarchyData();
            this.updateVisualization();
        }
    }

    updateVisualization(): void {
        if (!this.coverageData || !this.svg) {
            console.log('Missing data or SVG for visualization');
            return;
        }

        console.log('Updating visualization with minCoverage:', this.minCoverage);

        // Clear existing visualization
        this.svg.selectAll('g.node').remove();

        try {
            // Create filtered data for hierarchy
            const filteredData = this.filterDataByCoverage(this.hierarchyData, this.minCoverage);
            console.log('Filtered data:', filteredData);

            // Create a treemap layout
            const treemap = d3.treemap()
                .size([this.width, this.height])
                .paddingOuter(3)
                .paddingInner(1)
                .round(true);

            // Create hierarchy
            const root = d3.hierarchy(filteredData)
                .sum(d => d.value || 0)
                .sort((a, b) => (b.value || 0) - (a.value || 0));

            // Apply the treemap layout
            treemap(root);

            // Create a group for each node
            const nodes = this.svg.selectAll('g.node')
                .data(root.descendants().filter(d => d.depth > 0))
                .enter()
                .append('g')
                .attr('class', 'node')
                .attr('transform', (d: { x0: any; y0: any; }) => `translate(${d.x0},${d.y0})`);

            // Add rectangles to each node
            nodes.append('rect')
                .attr('width', (d: { x1: number; x0: number; }) => Math.max(0, d.x1 - d.x0))
                .attr('height', (d: { y1: number; y0: number; }) => Math.max(0, d.y1 - d.y0))
                .attr('fill', (d: { data: { coverage: number; }; }) => this.getCoverageColor(d.data.coverage))
                .attr('stroke', '#ffffff')
                .attr('stroke-width', 1)
                .attr('rx', 2)
                .attr('ry', 2)
                .on('mouseover', (event: { currentTarget: any; }, d: any) => {
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .attr('stroke', '#000000')
                        .attr('stroke-width', 2);

                    this.showHoverInfo(d);
                })
                .on('mouseout', (event: { currentTarget: any; }) => {
                    d3.select(event.currentTarget)
                        .transition()
                        .duration(200)
                        .attr('stroke', '#ffffff')
                        .attr('stroke-width', 1);
                });

            // Add text labels to each node
            // Add text labels to each node
            nodes.append('text')
                .attr('x', 4)
                .attr('y', 14)
                .attr('fill', (d: { data: { coverage: number; }; }) => this.getTextColor(d.data.coverage))
                .attr('font-size', '10px')
                .attr('font-weight', '500')
                .text((d: any) => this.getNodeLabel(d))
                .each(function (this: any, d: any) {
                    // Using regular function for D3's 'this' context to work
                    // Add explicit 'this: any' type annotation to avoid TypeScript error
                    const rectWidth = d.x1 - d.x0;
                    const rectHeight = d.y1 - d.y0;
                    if (rectWidth < 40 || rectHeight < 20) {
                        d3.select(this).style('display', 'none');
                    }
                });

            console.log('Visualization updated successfully');
        } catch (error) {
            console.error('Error updating visualization:', error);
        }
    }

    private prepareHierarchyData(): void {
        if (!this.coverageData) {
            this.hierarchyData = { name: 'root', children: [] };
            return;
        }

        const root = {
            name: 'Coverage',
            children: this.coverageData.packages.map(pkg => {
                // Calculate total lines for this package
                const totalLines = pkg.classes.reduce((sum, cls) => sum + cls.lines.length, 0);

                return {
                    name: pkg.name || 'Default Package',
                    coverage: pkg.lineRate,
                    linesValid: totalLines,
                    value: totalLines, // Size based on number of lines
                    children: pkg.classes.map(cls => ({
                        name: cls.name,
                        coverage: cls.lineRate,
                        linesValid: cls.lines.length,
                        value: cls.lines.length, // Size based on number of lines
                        path: `${pkg.name || 'Default Package'}.${cls.name}`,
                        filename: cls.filename
                    }))
                };
            })
        };

        this.hierarchyData = root;
        console.log('Hierarchy data prepared:', this.hierarchyData);
    }

    private filterDataByCoverage(data: any, minCoverage: number): any {
        // Create a deep copy of the data to avoid modifying the original
        const result = { ...data };

        // Keep all packages (level 1), but filter their children based on coverage
        if (result.children) {
            result.children = result.children.map((pkg: any) => {
                const pkgCopy = { ...pkg };

                // Filter classes within packages
                if (pkgCopy.children) {
                    pkgCopy.children = pkgCopy.children.filter((cls: { coverage: number; }) =>
                        cls.coverage >= minCoverage
                    );
                }

                return pkgCopy;
            });
        }

        return result;
    }

    private getNodeLabel(d: any): string {
        const name = d.data.name;
        if (name.length <= 20) return name;
        return name.substring(0, 18) + '...';
    }

    private getCoverageColor(coverage: number): string {
        if (coverage >= 90) return 'var(--excellent-color, #4caf50)';
        if (coverage >= 75) return 'var(--good-color, #8bc34a)';
        if (coverage >= 50) return 'var(--average-color, #ffb400)';
        return 'var(--poor-color, #f44336)';
    }

    private getTextColor(coverage: number): string {
        // For light background colors (high coverage), use dark text
        if (coverage >= 75) return '#000000';
        // For dark background colors (low coverage), use light text
        return '#ffffff';
    }

    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }

    private showHoverInfo(d: any): void {
        this.hoverInfo = {
            name: d.data.name,
            coverage: d.data.coverage,
            linesValid: d.data.linesValid,
            path: d.data.path,
            filename: d.data.filename
        };
    }
}