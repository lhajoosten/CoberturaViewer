import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, Input, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoverageStoreService } from '../../../services/coverage-store.service';
import { ChartMetric, CoverageData, HistoryEntry, TimeRange } from '../../../models/coverage.model';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../../services/utils/theme.service';

@Component({
    selector: 'app-coverage-trends',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './coverage-trends.component.html',
    styleUrls: ['./coverage-trends.component.scss']
})
export class CoverageTrendsComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    @ViewChild('lineChart') lineChartElement!: ElementRef;
    @ViewChild('velocityChart') velocityChartElement!: ElementRef;
    @ViewChild('coverageDistributionChart') coverageDistributionElement!: ElementRef;

    history: HistoryEntry[] = [];
    filteredHistory: HistoryEntry[] = [];
    hasHistory = false;
    timeRange = '30';

    // Metric definitions
    metrics: ChartMetric[] =
        [
            { id: 'lineRate', label: 'Line Coverage', color: '#4caf50', enabled: true, accessor: (d, _, __) => d.data.summary.lineRate },
            { id: 'branchRate', label: 'Branch Coverage', color: '#2196f3', enabled: true, accessor: (d, _, __) => d.data.summary.branchRate },
            { id: 'methodRate', label: 'Method Coverage', color: '#ff9800', enabled: true, accessor: (d, _, __) => d.data.summary.methodRate },
            { id: 'classRate', label: 'Class Coverage', color: '#f44336', enabled: true, accessor: (d, _, __) => d.data.summary.classRate }
        ];


    // Available time ranges
    timeRanges: TimeRange[] = [
        { value: '7', label: 'Last 7 Days', days: 7 },
        { value: '14', label: 'Last 14 Days', days: 14 },
        { value: '30', label: 'Last 30 Days', days: 30 },
        { value: '90', label: 'Last 90 Days', days: 90 },
        { value: '365', label: 'Last Year', days: 365 },
        { value: '0', label: 'All Time', days: 0 }
    ];

    // Chart state
    showTarget = true;
    targetCoverage = 80;
    chartMode: 'absolute' | 'relative' = 'absolute';
    showTooltips = true;

    // Derived metrics
    coverageVelocity: number = 0;
    projectionsData: { weeksToTarget: number | null, targetDate: Date | null, estimatedDateString: string } = {
        weeksToTarget: null,
        targetDate: null,
        estimatedDateString: 'N/A'
    };
    averageCoverage: number = 0;

    // Theme integration
    themeDark = false;

    constructor(
        private coverageStore: CoverageStoreService,
        private themeService: ThemeService
    ) { }

    ngOnInit(): void {
        // Try to load history from localStorage
        const savedHistory = localStorage.getItem('coverageHistory');
        if (savedHistory) {
            try {
                // Parse the saved history data, converting date strings back to Date objects
                const parsed = JSON.parse(savedHistory);
                this.history = parsed.map((entry: any) => ({
                    ...entry,
                    date: new Date(entry.date)
                }));

                // Sort by date to ensure correct order
                this.history.sort((a, b) => a.date.getTime() - b.date.getTime());

                this.hasHistory = this.history.length > 0;
                this.updateFilteredHistory();
                this.calculateDerivedMetrics();
            } catch (e) {
                console.error('Failed to parse saved history:', e);
            }
        }

        // Subscribe to current coverage data changes
        this.coverageStore.getCoverageData().subscribe(data => {
            if (data) {
                // Check if we should add this to history
                this.addCurrentToHistory(data);
            }
        });

        // Subscribe to theme changes
        this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
            this.isDarkTheme = isDark;
            if (this.hasHistory) {
                this.renderCharts(); // Re-render charts with new theme
            }
        });
    }

    ngAfterViewInit(): void {
        if (this.hasHistory) {
            setTimeout(() => {
                this.renderCharts();
            }, 0);
        }
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    /**
    * Properly converts timestamp to Date object based on format
    * @param timestamp The timestamp from Cobertura XML
    */
    private convertTimestampToDate(timestamp: string | number): Date {
        if (!timestamp) {
            return new Date(); // Default to current time if no timestamp
        }

        // Convert to number if it's a string
        const tsNum = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;

        // Check if it's a Unix timestamp in seconds (10 digits) or milliseconds (13 digits)
        if (tsNum.toString().length <= 10) {
            // It's in seconds, multiply by 1000 to get milliseconds
            return new Date(tsNum * 1000);
        } else {
            // It's already in milliseconds
            return new Date(tsNum);
        }
    }

    loadDemoData(): void {
        // Example implementation for demo data with specific dates
        const demoHistory: HistoryEntry[] = [
            // March 30th data
            {
                date: this.convertTimestampToDate('1743070133'),
                data: {
                    summary: {
                        lineRate: 68.00,
                        branchRate: 53.00,
                        linesValid: 3110,
                        linesCovered: 2100,
                        methodRate: 65.00,
                        classRate: 70.00,
                        complexity: 0,
                        timestamp: '1743070133'
                    },
                    packages: []
                }
            },
            // April 4th data
            {
                date: this.convertTimestampToDate('1743502133'),
                data: {
                    summary: {
                        lineRate: 64.00,
                        branchRate: 49.00,
                        linesValid: 3090,
                        linesCovered: 2000,
                        methodRate: 62.00,
                        classRate: 67.00,
                        complexity: 0,
                        timestamp: '1743502133'
                    },
                    packages: []
                }
            },
            // April 9th data
            {
                date: this.convertTimestampToDate('1743934133'),
                data: {
                    summary: {
                        lineRate: 67.00,
                        branchRate: 52.00,
                        linesValid: 3105,
                        linesCovered: 2080,
                        methodRate: 64.00,
                        classRate: 69.00,
                        complexity: 0,
                        timestamp: '1743934133'
                    },
                    packages: []
                }
            },
            // April 14th data
            {
                date: this.convertTimestampToDate('1744366133'),
                data: {
                    summary: {
                        lineRate: 65.00,
                        branchRate: 50.00,
                        linesValid: 3100,
                        linesCovered: 2030,
                        methodRate: 63.00,
                        classRate: 68.00,
                        complexity: 0,
                        timestamp: '1744366133'
                    },
                    packages: []
                }
            },
            // April 19th data
            {
                date: this.convertTimestampToDate('1744798133'),
                data: {
                    summary: {
                        lineRate: 67.50,
                        branchRate: 52.50,
                        linesValid: 3115,
                        linesCovered: 2090,
                        methodRate: 65.50,
                        classRate: 71.00,
                        complexity: 0,
                        timestamp: '1744798133'
                    },
                    packages: []
                }
            }
        ];

        this.history = demoHistory;
        this.hasHistory = true;
        this.updateFilteredHistory();
        this.calculateDerivedMetrics();
        this.saveHistoryToLocalStorage();
        this.renderCharts();
    }

    addCurrentToHistory(data: CoverageData): void {
        // Use the timestamp from the data if available, otherwise use current time
        const timestamp = data.summary.timestamp ?
            this.convertTimestampToDate(data.summary.timestamp) :
            new Date();

        // Check if we already have an entry with this timestamp
        const existingEntry = this.history.find(entry =>
            entry.date.getTime() === timestamp.getTime()
        );

        if (existingEntry) {
            // Update existing entry instead of adding a new one
            existingEntry.data = data;
        } else {
            // Add new entry with the correct timestamp
            this.history.push({ date: timestamp, data });
        }

        // Sort by date to ensure correct order
        this.history.sort((a, b) => a.date.getTime() - b.date.getTime());

        this.hasHistory = true;
        this.updateFilteredHistory();
        this.calculateDerivedMetrics();
        this.saveHistoryToLocalStorage();

        // Re-render charts after DOM has been updated
        setTimeout(() => {
            this.renderCharts();
        }, 0);
    }

    loadHistoryEntry(entry: HistoryEntry): void {
        this.coverageStore.setCoverageData(entry.data);
    }

    removeHistoryEntry(entry: HistoryEntry): void {
        const index = this.history.indexOf(entry);
        if (index !== -1) {
            this.history.splice(index, 1);
            this.hasHistory = this.history.length > 0;
            this.updateFilteredHistory();
            this.calculateDerivedMetrics();
            this.saveHistoryToLocalStorage();
            this.renderCharts();
        }
    }

    updateFilteredHistory(): void {
        if (this.timeRange === '0') {
            // Show all history
            this.filteredHistory = [...this.history];
            return;
        }

        const days = parseInt(this.timeRange, 10);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        this.filteredHistory = this.history.filter(entry => entry.date >= cutoffDate);
    }

    renderCharts(): void {
        if (!this.hasHistory || this.filteredHistory.length < 2) {
            return;
        }

        this.renderLineChart();
        this.renderVelocityChart();
        this.renderCoverageDistributionChart();
    }

    renderLineChart(): void {
        if (!this.lineChartElement || !this.filteredHistory.length) return;

        const element = this.lineChartElement.nativeElement;
        d3.select(element).selectAll('*').remove();

        const margin = { top: 20, right: 80, bottom: 30, left: 50 };
        const width = element.clientWidth - margin.left - margin.right;
        const height = element.clientHeight - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(element)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        const isDarkTheme = this.isDarkTheme;

        // Modify chart elements to respect theme
        svg.select('.x-axis path')
            .attr('stroke', isDarkTheme ? '#555' : '#ccc');

        svg.selectAll('.x-axis .tick line, .y-axis .tick line, .y-axis path')
            .attr('stroke', isDarkTheme ? '#555' : '#ccc');

        svg.selectAll('.x-axis .tick text, .y-axis .tick text')
            .attr('fill', isDarkTheme ? '#adb5bd' : '#666');

        svg.select('.grid')
            .selectAll('line')
            .style('stroke', isDarkTheme ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)');

        // Update tooltip style
        const tooltip = d3.select('body').append('div')
            .attr('class', 'chart-tooltip')
            .style('opacity', 0)
            .style('position', 'absolute')
            .style('background', isDarkTheme ? '#333' : 'white')
            .style('color', isDarkTheme ? '#fff' : '#333')
            .style('border', `1px solid ${isDarkTheme ? '#444' : '#ddd'}`)
            .style('border-radius', '4px')
            .style('padding', '8px')
            .style('pointer-events', 'none')
            .style('z-index', 1000);

        // Define scales
        const xScale = d3.scaleTime()
            .domain(d3.extent(this.filteredHistory, d => d.date) as [Date, Date])
            .range([0, width]);

        const yScale = d3.scaleLinear()
            .domain([0, 100])
            .range([height, 0]);

        // Add axes
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        // Add grid lines
        svg.append('g')
            .attr('class', 'grid')
            .call(d3.axisLeft(yScale)
                .tickSize(-width)
                .tickFormat(() => '')
            )
            .style('stroke-opacity', 0.1);

        // Add target line if enabled
        if (this.showTarget) {
            svg.append('line')
                .attr('class', 'target-line')
                .attr('x1', 0)
                .attr('x2', width)
                .attr('y1', yScale(this.targetCoverage))
                .attr('y2', yScale(this.targetCoverage))
                .style('stroke', '#ff9800')
                .style('stroke-width', 1.5)
                .style('stroke-dasharray', '5,5');

            svg.append('text')
                .attr('class', 'target-label')
                .attr('x', width)
                .attr('y', yScale(this.targetCoverage) - 5)
                .attr('text-anchor', 'end')
                .style('fill', '#ff9800')
                .style('font-size', '12px')
                .text(`Target: ${this.targetCoverage}%`);
        }

        // Add lines for each enabled metric
        const enabledMetrics = this.metrics.filter(m => m.enabled);

        enabledMetrics.forEach(metric => {
            // Create line generator
            const line = d3.line<HistoryEntry>()
                .x(d => xScale(d.date))
                .y(d => yScale(metric.accessor(d, 0, [])))
                .curve(d3.curveMonotoneX);

            // Add line
            svg.append('path')
                .datum(this.filteredHistory)
                .attr('class', `line-${metric.id}`)
                .attr('fill', 'none')
                .attr('stroke', metric.color)
                .attr('stroke-width', 2)
                .attr('d', line);

            // Add data points
            svg.selectAll(`.point-${metric.id}`)
                .data(this.filteredHistory)
                .enter()
                .append('circle')
                .attr('class', `point-${metric.id}`)
                .attr('cx', d => xScale(d.date))
                .attr('cy', d => yScale(metric.accessor(d, 0, [])))
                .attr('r', 4)
                .attr('fill', metric.color)
                .attr('stroke', '#fff')
                .attr('stroke-width', 1.5);
        });

        // Add legend
        const legend = svg.append('g')
            .attr('class', 'legend')
            .attr('transform', `translate(${width - 120}, 0)`);

        enabledMetrics.forEach((metric, i) => {
            const lg = legend.append('g')
                .attr('transform', `translate(0, ${i * 20})`);

            lg.append('rect')
                .attr('width', 12)
                .attr('height', 12)
                .attr('fill', metric.color);

            lg.append('text')
                .attr('x', 20)
                .attr('y', 10)
                .attr('font-size', '12px')
                .text(metric.label);
        });

        // Add tooltip functionality if enabled
        if (this.showTooltips) {
            const tooltip = d3.select('body').append('div')
                .attr('class', 'chart-tooltip')
                .style('opacity', 0)
                .style('position', 'absolute')
                .style('background', 'white')
                .style('border', '1px solid #ddd')
                .style('border-radius', '4px')
                .style('padding', '8px')
                .style('pointer-events', 'none')
                .style('z-index', 1000);

            // Voronoi overlay for better tooltip interaction
            const voronoi = d3.Delaunay
                .from(
                    this.filteredHistory,
                    d => xScale(d.date),
                    d => yScale(enabledMetrics[0].accessor(d, 0, []))
                )
                .voronoi([0, 0, width, height]);

            svg.append('g')
                .selectAll('path')
                .data(this.filteredHistory)
                .enter()
                .append('path')
                .attr('d', (_, i) => voronoi.renderCell(i))
                .attr('fill', 'none')
                .attr('pointer-events', 'all')
                .on('mouseover', (event, d) => {
                    tooltip.transition()
                        .duration(200)
                        .style('opacity', 0.9);

                    const content = `
                        <div style="font-weight: bold;">${d.date.toLocaleDateString()}</div>
                        ${enabledMetrics.map(m =>
                        `<div style="display:flex;justify-content:space-between;margin:3px 0;">
                                <span style="margin-right:10px;">${m.label}:</span>
                                <span style="font-weight:500;color:${m.color}">
                                    ${m.accessor(d, 0, []).toFixed(2)}%
                                </span>
                            </div>`
                    ).join('')}
                    `;

                    tooltip.html(content)
                        .style('left', `${event.pageX + 15}px`)
                        .style('top', `${event.pageY - 28}px`);

                    // Highlight the point
                    enabledMetrics.forEach(m => {
                        svg.selectAll(`.point-${m.id}`)
                            .filter((p: any) => p === d)
                            .attr('r', 6)
                            .attr('stroke-width', 2);
                    });
                })
                .on('mouseout', () => {
                    tooltip.transition()
                        .duration(500)
                        .style('opacity', 0);

                    // Reset point size
                    enabledMetrics.forEach(m => {
                        svg.selectAll(`.point-${m.id}`)
                            .attr('r', 4)
                            .attr('stroke-width', 1.5);
                    });
                });
        }

        // Add axes labels
        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Coverage (%)');
    }

    renderVelocityChart(): void {
        if (!this.velocityChartElement || !this.filteredHistory.length) return;

        const element = this.velocityChartElement.nativeElement;
        d3.select(element).selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 30, left: 50 };
        const width = element.clientWidth - margin.left - margin.right;
        const height = element.clientHeight - margin.top - margin.bottom;

        // Create SVG
        const svg = d3.select(element)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Calculate weekly velocity data
        const velocityData = this.calculateWeeklyVelocity(this.filteredHistory);

        // Define scales
        const xScale = d3.scaleBand()
            .domain(velocityData.map(d => d.week))
            .range([0, width])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([
                Math.min(0, d3.min(velocityData, d => d.change) || 0),
                Math.max(5, d3.max(velocityData, d => d.change) || 5)
            ])
            .range([height, 0]);

        // Add axes
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale));

        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        // Add zero line
        svg.append('line')
            .attr('class', 'zero-line')
            .attr('x1', 0)
            .attr('x2', width)
            .attr('y1', yScale(0))
            .attr('y2', yScale(0))
            .style('stroke', '#999')
            .style('stroke-width', 1)
            .style('stroke-dasharray', '3,3');

        // Add bars
        svg.selectAll('.velocity-bar')
            .data(velocityData)
            .enter()
            .append('rect')
            .attr('class', 'velocity-bar')
            .attr('x', d => xScale(d.week) || 0)
            .attr('y', d => d.change >= 0 ? yScale(d.change) : yScale(0))
            .attr('width', xScale.bandwidth())
            .attr('height', d => Math.abs(yScale(d.change) - yScale(0)))
            .attr('fill', d => d.change >= 0 ? '#4caf50' : '#f44336');

        // Add labels
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '500')
            .text('Weekly Coverage Velocity');

        svg.append('text')
            .attr('class', 'y-axis-label')
            .attr('transform', 'rotate(-90)')
            .attr('y', -margin.left + 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .text('Change (% points)');
    }

    renderCoverageDistributionChart(): void {
        if (!this.coverageDistributionElement || !this.filteredHistory.length) return;

        const element = this.coverageDistributionElement.nativeElement;
        d3.select(element).selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 30, left: 40 };
        const width = element.clientWidth - margin.left - margin.right;
        const height = element.clientHeight - margin.top - margin.bottom;

        // Get latest coverage data
        const latestEntry = this.filteredHistory[this.filteredHistory.length - 1];
        if (!latestEntry || !latestEntry.data.packages) return;

        // Extract class coverage data
        const classData: { name: string, coverage: number }[] = [];
        latestEntry.data.packages.forEach(pkg => {
            pkg.classes.forEach(cls => {
                classData.push({
                    name: cls.name,
                    coverage: cls.lineRate
                });
            });
        });

        // Sort by coverage
        classData.sort((a, b) => a.coverage - b.coverage);

        // Create SVG
        const svg = d3.select(element)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Define scales
        const xScale = d3.scaleLinear()
            .domain([0, 100])
            .range([0, width]);

        const yScale = d3.scaleBand()
            .domain(classData.map(d => d.name))
            .range([0, height])
            .padding(0.1);

        // Add axes
        svg.append('g')
            .attr('class', 'x-axis')
            .attr('transform', `translate(0,${height})`)
            .call(d3.axisBottom(xScale).ticks(5));

        svg.append('g')
            .attr('class', 'y-axis')
            .call(d3.axisLeft(yScale));

        // Add bars
        svg.selectAll('.bar')
            .data(classData)
            .enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => yScale(d.name) || 0)
            .attr('width', d => xScale(d.coverage))
            .attr('height', yScale.bandwidth())
            .attr('fill', d => this.getCoverageColor(d.coverage));

        // Add bar labels
        svg.selectAll('.bar-label')
            .data(classData)
            .enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('x', d => xScale(d.coverage) + 5)
            .attr('y', d => (yScale(d.name) || 0) + yScale.bandwidth() / 2)
            .attr('dy', '0.35em')
            .style('font-size', '10px')
            .text(d => `${d.coverage.toFixed(0)}%`);

        // Add title
        svg.append('text')
            .attr('class', 'chart-title')
            .attr('x', width / 2)
            .attr('y', -5)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '500')
            .text('Coverage Distribution by Class');
    }

    calculateWeeklyVelocity(history: HistoryEntry[]): any[] {
        if (!history.length) return [];

        // Group entries by week
        const weekMap = new Map<string, HistoryEntry[]>();

        history.forEach(entry => {
            const date = entry.date;
            const year = date.getFullYear();
            const week = this.getWeekNumber(date);
            const key = `${year}-W${week.toString().padStart(2, '0')}`;

            if (!weekMap.has(key)) {
                weekMap.set(key, []);
            }

            weekMap.get(key)?.push(entry);
        });

        // Calculate average line coverage for each week
        const weeklyData: { week: string, avgCoverage: number }[] = [];

        weekMap.forEach((entries, week) => {
            const totalCoverage = entries.reduce((sum, entry) => sum + entry.data.summary.lineRate, 0);
            weeklyData.push({
                week,
                avgCoverage: totalCoverage / entries.length
            });
        });

        // Sort by week
        weeklyData.sort((a, b) => a.week.localeCompare(b.week));

        // Calculate week-over-week changes
        const velocityData = weeklyData.map((weekData, i) => {
            const prevWeek = i > 0 ? weeklyData[i - 1].avgCoverage : weekData.avgCoverage;
            return {
                week: weekData.week,
                avgCoverage: weekData.avgCoverage,
                change: weekData.avgCoverage - prevWeek
            };
        });

        return velocityData;
    }

    getWeekNumber(date: Date): number {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }

    calculateDerivedMetrics(): void {
        if (this.filteredHistory.length < 2) {
            this.coverageVelocity = 0;
            this.averageCoverage = this.filteredHistory.length ?
                this.filteredHistory[0].data.summary.lineRate : 0;
            return;
        }

        // Calculate coverage velocity (points per week)
        const oldestEntry = this.filteredHistory[0];
        const newestEntry = this.filteredHistory[this.filteredHistory.length - 1];

        const coverageDiff = newestEntry.data.summary.lineRate - oldestEntry.data.summary.lineRate;
        const daysDiff = (newestEntry.date.getTime() - oldestEntry.date.getTime()) / (1000 * 60 * 60 * 24);
        const weeksDiff = Math.max(daysDiff / 7, 1); // Avoid division by zero

        this.coverageVelocity = coverageDiff / weeksDiff;

        // Calculate average coverage
        this.averageCoverage = this.filteredHistory.reduce(
            (sum, entry) => sum + entry.data.summary.lineRate, 0
        ) / this.filteredHistory.length;

        // Generate projection data
        if (this.coverageVelocity > 0) {
            const weeksToTarget = this.targetCoverage > newestEntry.data.summary.lineRate ?
                (this.targetCoverage - newestEntry.data.summary.lineRate) / this.coverageVelocity : 0;

            const targetDate = new Date(newestEntry.date);
            targetDate.setDate(targetDate.getDate() + Math.ceil(weeksToTarget * 7));

            this.projectionsData = {
                weeksToTarget: Math.ceil(weeksToTarget),
                targetDate: targetDate,
                estimatedDateString: targetDate.toLocaleDateString()
            };
        } else {
            this.projectionsData = {
                weeksToTarget: null,
                targetDate: null,
                estimatedDateString: 'N/A (no upward trend)'
            };
        }
    }

    toggleMetric(metricId: string): void {
        const metric = this.metrics.find(m => m.id === metricId);
        if (metric) {
            metric.enabled = !metric.enabled;
            this.renderCharts();
        }
    }

    updateTimeRange(): void {
        this.updateFilteredHistory();
        this.calculateDerivedMetrics();
        this.renderCharts();
    }

    toggleChartMode(): void {
        this.chartMode = this.chartMode === 'absolute' ? 'relative' : 'absolute';
        this.renderCharts();
    }

    updateTargetCoverage(): void {
        this.calculateDerivedMetrics();
        this.renderCharts();
    }

    saveHistoryToLocalStorage(): void {
        try {
            localStorage.setItem('coverageHistory', JSON.stringify(this.history));
        } catch (e) {
            console.error('Failed to save history to localStorage:', e);
        }
    }

    getCoverageClass(rate: number): string {
        if (rate >= 90) return 'excellent';
        if (rate >= 75) return 'good';
        if (rate >= 50) return 'average';
        return 'poor';
    }

    getCoverageColor(rate: number): string {
        if (rate >= 90) return 'var(--excellent-color, #4caf50)';
        if (rate >= 75) return 'var(--good-color, #8bc34a)';
        if (rate >= 50) return 'var(--average-color, #ffb400)';
        return 'var(--poor-color, #f44336)';
    }
}