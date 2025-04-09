import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, Output, EventEmitter, OnInit, OnDestroy, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TreemapLayoutService } from '../../../../services/utils/treemap-layout.service';
import { Coverage, TreeNode } from '../../../../models/coverage.model';
import { TreemapConfig, TreemapFilter, CoverageRange } from '../../../../models/treemap-config.model';
import * as d3 from 'd3';

/**
 * Component responsible for rendering the treemap visualization
 * Handles the D3-based visualization and user interactions
 */
@Component({
    selector: 'app-treemap-visualization',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './treemap-visualization.component.html',
    styleUrls: ['./treemap-visualization.component.scss']
})
export class TreemapVisualizationComponent implements OnChanges, OnInit, OnDestroy {
    // --- Inputs ---
    @Input() hierarchyRoot: TreeNode | null = null;
    @Input() isDarkTheme = false;
    @Input() showLabels = true;
    @Input() groupSmallNodes = false;
    @Input() colorMode: 'default' | 'colorblind' = 'default';
    @Input() coverageRanges: CoverageRange[] = [];
    @Input() enableDomainGrouping = true;
    @Input() filters: TreemapFilter = {};
    @Input() sortBy?: 'size' | 'coverage' | 'name';

    @Output() nodeSelected = new EventEmitter<any>();

    @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

    // --- Tooltip properties ---
    tooltipX = 0;
    tooltipY = 0;
    showTooltip = false;
    tooltipNode: Coverage | null = null;

    private treemapInstance: any = null;
    private resizeObserver: ResizeObserver | null = null;
    private resizeTimeout: any;
    private lastWidth = 0;
    private lastHeight = 0;
    private isFirstRender = true;

    constructor(private treemapLayoutService: TreemapLayoutService, private zone: NgZone) { }

    ngOnInit(): void {
        // Initialize after a short delay to ensure the container has been properly rendered
        setTimeout(() => {
            this.initializeTreemap();
            this.setupResizeObserver();
        }, 100);
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Don't process changes until component is fully initialized
        if (!this.containerRef?.nativeElement) return;

        // Determine if rebuild or update is needed
        let needsRebuild = false;
        let needsConfigUpdate = false;

        // Check which inputs have changed and determine appropriate action
        if (changes['hierarchyRoot'] && !changes['hierarchyRoot'].firstChange) {
            needsRebuild = true;
        }

        if (changes['sortBy'] && !changes['sortBy'].firstChange) {
            needsRebuild = true;
        }

        if (changes['groupSmallNodes'] && !changes['groupSmallNodes'].firstChange) {
            needsRebuild = true;
        }

        if (changes['enableDomainGrouping'] && !changes['enableDomainGrouping'].firstChange) {
            needsRebuild = true;
        }

        if (changes['filters'] && !changes['filters'].firstChange) {
            needsConfigUpdate = true;
        }

        if (changes['isDarkTheme'] || changes['colorMode'] || changes['coverageRanges']) {
            if (!this.isFirstRender) {
                needsConfigUpdate = true;
            }
        }

        // Handle label visibility separately if treemap exists
        if (changes['showLabels'] && !changes['showLabels'].firstChange && this.treemapInstance) {
            this.treemapInstance.updateLabels(this.showLabels);
        }

        // Debounce updates to avoid flickering
        if (needsRebuild || needsConfigUpdate) {
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                this.updateTreemap(needsRebuild);
            }, 50);
        }
    }

    ngOnDestroy(): void {
        // Clean up resources
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        // Remove D3 SVG
        const element = this.containerRef?.nativeElement;
        if (element) {
            d3.select(element).select('svg').remove();
        }

        this.treemapInstance = null;
    }

    /**
     * Initialize the treemap visualization for the first time
     * Measures container and creates initial instance
     */
    private initializeTreemap(): void {
        if (!this.containerRef?.nativeElement) return;

        const container = this.containerRef.nativeElement;
        this.lastWidth = container.clientWidth || 800;
        this.lastHeight = container.clientHeight || 600;

        console.log('Initializing treemap with dimensions:', this.lastWidth, this.lastHeight);

        // Only build if we have dimensions and data
        if (this.lastWidth > 0 && this.lastHeight > 0 && this.hierarchyRoot) {
            this.buildTreemap();
            this.isFirstRender = false;
        }
    }

    /**
     * Update the treemap when inputs change
     */
    private updateTreemap(fullRebuild: boolean = false): void {
        if (!this.containerRef?.nativeElement || !this.hierarchyRoot) return;

        if (fullRebuild || !this.treemapInstance) {
            this.buildTreemap();
        } else if (this.treemapInstance?.update) {
            // Just update the existing instance with new config
            const config = this.createTreemapConfig();
            this.treemapInstance.update(this.hierarchyRoot, config);
        }
    }

    /**
     * Build a new treemap instance
     */
    private buildTreemap(): void {
        const container = this.containerRef?.nativeElement;

        if (!container || !this.hierarchyRoot) return;

        // Ensure container dimensions
        if (this.lastWidth <= 0 || this.lastHeight <= 0) {
            this.lastWidth = container.clientWidth || 800;
            this.lastHeight = container.clientHeight || 600;
        }

        // Clear any existing instance
        if (this.treemapInstance) {
            d3.select(container).select('svg').remove();
            this.treemapInstance = null;
        }

        console.log('Building treemap with dimensions:', this.lastWidth, this.lastHeight);

        const config = this.createTreemapConfig();

        // Create event handlers - ensuring they run in Angular zone
        const handleNodeClick = (node: any) => this.onNodeSelectedInternal(node);
        const handleNodeHover = (node: any, event: MouseEvent) => this.onNodeHover(node, event);
        const handleNodeLeave = () => this.onNodeLeave();

        // Create treemap instance
        this.treemapInstance = this.treemapLayoutService.createTreemap(
            this.containerRef,
            this.hierarchyRoot,
            config,
            handleNodeClick,
            handleNodeHover,
            handleNodeLeave
        );
    }

    /**
     * Create configuration object for the treemap
     */
    private createTreemapConfig(): TreemapConfig {
        return {
            width: this.lastWidth,
            height: this.lastHeight,
            showLabels: this.showLabels,
            themeDark: this.isDarkTheme,
            groupSmallNodes: this.groupSmallNodes,
            minNodeSize: 15,
            colorMode: this.colorMode,
            coverageRanges: this.coverageRanges && this.coverageRanges.length > 0 ?
                this.coverageRanges :
                this.colorMode === 'colorblind' ?
                    this.treemapLayoutService.getColorblindCoverageRanges() :
                    this.treemapLayoutService.getDefaultCoverageRanges(this.isDarkTheme),
            enableDomainGrouping: this.enableDomainGrouping,
            filter: this.filters,
            sortBy: this.sortBy || 'size'
        };
    }

    /**
     * Set up ResizeObserver to monitor container size changes
     */
    private setupResizeObserver(): void {
        if (!this.containerRef?.nativeElement) return;

        const container = this.containerRef.nativeElement;

        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;

                // Only trigger on significant size changes
                if (width > 0 && height > 0 && (
                    Math.abs(this.lastWidth - width) > 5 ||
                    Math.abs(this.lastHeight - height) > 5
                )) {
                    console.log('Resize detected:', width, height);
                    this.lastWidth = width;
                    this.lastHeight = height;

                    // Debounce resize updates
                    clearTimeout(this.resizeTimeout);
                    this.resizeTimeout = setTimeout(() => {
                        if (this.treemapInstance && this.hierarchyRoot) {
                            this.updateTreemap(true);
                        }
                    }, 250);
                }
            }
        });

        this.resizeObserver.observe(container);
    }

    /**
     * Handle node selection and emit event to parent
     */
    private onNodeSelectedInternal(node: any): void {
        if (node && node.data) {
            // Run in Angular zone to ensure change detection
            this.zone.run(() => {
                this.nodeSelected.emit(node.data);
            });
        }
    }

    /**
     * Handle node hover to show tooltip
     */
    private onNodeHover(node: any, event: MouseEvent): void {
        this.zone.run(() => {
            if (node && node.data) {
                this.tooltipNode = node.data;
                const containerRect = this.containerRef.nativeElement.getBoundingClientRect();

                // Position tooltip near cursor
                this.tooltipX = event.clientX - containerRect.left + 10;
                this.tooltipY = event.clientY - containerRect.top + 10;

                // Make sure tooltip stays within visible area
                const maxX = containerRect.width - 280; // Assuming tooltip max width
                if (this.tooltipX > maxX) {
                    this.tooltipX = maxX;
                }

                this.showTooltip = true;
            }
        });
    }

    /**
     * Handle node leave to hide tooltip
     */
    private onNodeLeave(): void {
        this.zone.run(() => {
            this.showTooltip = false;
            this.tooltipNode = null;
        });
    }

    /**
     * Update coverage range colors
     */
    public updateCoverageRanges(newRanges: CoverageRange[]): void {
        this.coverageRanges = newRanges;
        if (this.treemapInstance && !this.isFirstRender) {
            this.updateTreemap(false);
        }
    }

    // --- Public API methods for parent component ---

    /**
     * Reset zoom to show entire treemap
     */
    public resetZoom(): void {
        if (this.treemapInstance?.resetZoom) {
            this.treemapInstance.resetZoom();
        }
    }

    /**
     * Get SVG element for export
     */
    public getSvgElement(): SVGElement | null {
        return this.containerRef?.nativeElement.querySelector('svg') || null;
    }

    /**
     * Export SVG as downloadable file
     */
    public exportSvg(): void {
        const svgElement = this.getSvgElement();
        if (!svgElement) {
            console.error("Cannot export SVG: Element not found.");
            return;
        }

        try {
            // Create SVG for export
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = url;
            link.download = 'coverage-treemap.svg';
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting SVG:', error);
        }
    }

    /**
     * Find and highlight a specific node by name
     */
    public findAndHighlightNode(nodeName: string): void {
        if (this.treemapInstance?.highlightNode) {
            this.treemapInstance.highlightNode(nodeName);
        }
    }

    /**
     * Handle container visibility changes
     * (e.g., when tab is activated or panel is opened)
     */
    public handleVisibilityChange(): void {
        // Re-check dimensions and rebuild if necessary
        setTimeout(() => {
            const container = this.containerRef?.nativeElement;
            if (container) {
                const newWidth = container.clientWidth;
                const newHeight = container.clientHeight;

                if (newWidth > 0 && newHeight > 0 && (
                    this.lastWidth !== newWidth ||
                    this.lastHeight !== newHeight
                )) {
                    console.log("Visibility change detected, updating dimensions:", newWidth, newHeight);
                    this.lastWidth = newWidth;
                    this.lastHeight = newHeight;

                    if (this.hierarchyRoot) {
                        this.updateTreemap(true);
                    }
                }
            }
        }, 100);
    }
}