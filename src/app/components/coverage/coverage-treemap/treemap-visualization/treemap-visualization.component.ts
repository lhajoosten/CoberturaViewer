import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreeNode } from '../../../../models/coverage.model';
import { TreemapLayoutService } from '../../../../services/utils/treemap-layout.service';
import { TreemapConfig } from '../../../../models/treemap-config.model';

@Component({
    selector: 'app-treemap-visualization',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './treemap-visualization.component.html',
    styleUrls: ['./treemap-visualization.component.scss']
})
export class TreemapVisualizationComponent implements OnInit, OnChanges, OnDestroy {
    @ViewChild('container', { static: true }) container!: ElementRef;
    @ViewChild('tooltip', { static: true }) tooltipElement!: ElementRef;

    @Input() data: TreeNode | null = null;
    @Input() isDarkTheme = false;
    @Input() showLabels = true;
    @Input() groupSmallNodes = true;
    @Input() colorMode: 'default' | 'colorblind' = 'default';
    @Input() coverageRanges: Array<{ min: number, max: number, label: string, color: string }> = [];
    @Input() minNodeSize = 10;

    @Output() nodeSelected = new EventEmitter<any>();

    // Tooltip state
    tooltipNode: any = null;
    tooltipX = 0;
    tooltipY = 0;
    showTooltip = false;

    private treemap: any;
    private resizeObserver: ResizeObserver | null = null;

    constructor(private treemapService: TreemapLayoutService) { }

    ngOnInit(): void {
        // Initialize the visualization if we already have data
        this.initVisualization();

        // Set up resize observer for responsive behavior
        this.setupResizeObserver();

        // Listen for mouse movement to handle tooltip positioning
        this.container.nativeElement.addEventListener('mousemove', this.handleMouseMove);
    }

    ngOnChanges(changes: SimpleChanges): void {
        // React to input changes by updating the visualization
        if (this.treemap && (
            changes['data'] ||
            changes['isDarkTheme'] ||
            changes['showLabels'] ||
            changes['groupSmallNodes'] ||
            changes['colorMode']
        )) {
            this.updateVisualization();
        }
    }

    ngOnDestroy(): void {
        // Clean up event handlers
        if (this.container && this.container.nativeElement) {
            this.container.nativeElement.removeEventListener('mousemove', this.handleMouseMove);
        }

        // Clean up resize observer
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
    }

    private handleMouseMove = (event: MouseEvent) => {
        if (this.showTooltip) {
            // Position tooltip relative to mouse
            const containerRect = this.container.nativeElement.getBoundingClientRect();
            const tooltipRect = this.tooltipElement.nativeElement.getBoundingClientRect();

            // Calculate position, ensuring tooltip stays within container
            this.tooltipX = Math.min(
                event.clientX - containerRect.left + 15,
                containerRect.width - tooltipRect.width - 5
            );
            this.tooltipY = Math.min(
                event.clientY - containerRect.top - tooltipRect.height - 5,
                containerRect.height - tooltipRect.height - 5
            );

            // Ensure tooltip is not positioned off the top or left
            if (this.tooltipY < 5) this.tooltipY = event.clientY - containerRect.top + 15;
            if (this.tooltipX < 5) this.tooltipX = 5;
        }
    };

    private initVisualization(): void {
        if (!this.data) return;

        const config = this.getConfig();

        // Create the treemap
        this.treemap = this.treemapService.createTreemap(
            this.container,
            this.data,
            config,
            this.handleNodeClick.bind(this),
            this.handleNodeHover.bind(this),
            this.handleNodeLeave.bind(this)
        );
    }

    private updateVisualization(): void {
        if (!this.treemap || !this.data) return;

        const config = this.getConfig();

        // Update the treemap with new data/config
        this.treemap.update(this.data, config);
    }

    // Node event handlers
    private handleNodeClick(node: any): void {
        this.hideTooltip();
        this.nodeSelected.emit(node);
    }

    private handleNodeHover(node: any, event: MouseEvent): void {
        this.tooltipNode = node;
        this.showTooltip = true;
        this.handleMouseMove(event);
    }

    private handleNodeLeave(): void {
        this.hideTooltip();
    }

    private hideTooltip(): void {
        this.showTooltip = false;
    }

    private getConfig(): TreemapConfig {
        // Get container dimensions
        const element = this.container.nativeElement;
        const fullWidth = element.clientWidth > 50 ? element.clientWidth : 800;

        const controlsGap = 20;
        const width = fullWidth - controlsGap;

        const height = element.clientHeight > 500 ? element.clientHeight : 700;

        return {
            width,
            height,
            showLabels: this.showLabels,
            themeDark: this.isDarkTheme,
            groupSmallNodes: this.groupSmallNodes,
            minNodeSize: this.minNodeSize,
            colorMode: this.colorMode,
            coverageRanges: this.coverageRanges,
            autoHideControls: true
        };
    }

    private setupResizeObserver(): void {
        if (!this.container || !this.container.nativeElement) return;

        // Create resize observer to handle container size changes
        this.resizeObserver = new ResizeObserver(() => {
            if (this.treemap) {
                this.updateVisualization();
            }
        });

        // Start observing size changes
        this.resizeObserver.observe(this.container.nativeElement);
    }

    // Format and styling helpers
    getCoverageClass(coverage: number | undefined): string {
        if (!coverage) return 'poor';
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }

    formatCoverage(coverage: number | undefined): string {
        if (coverage === undefined) return '0.0%';
        return `${coverage.toFixed(1)}%`;
    }

    // Public methods that can be called from parent
    zoomToNode(node: any): void {
        if (this.treemap && this.treemap.zoomToNode) {
            this.treemap.zoomToNode(node);
        }
    }

    resetZoom(): void {
        if (this.treemap && this.treemap.resetZoom) {
            this.treemap.resetZoom();
        }
    }
}