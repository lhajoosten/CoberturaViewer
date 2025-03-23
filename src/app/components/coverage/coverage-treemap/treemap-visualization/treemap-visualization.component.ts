import { Component, Input, ElementRef, ViewChild, OnChanges, SimpleChanges, Output, EventEmitter, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Coverage } from '../../../../models/coverage.model';
import { TreemapLayoutService } from '../../../../services/utils/treemap-layout.service';
import { TreemapConfig } from '../../../../models/treemap-config.model';

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
    @Input() hierarchicalData: any = null;
    @Input() enableDomainGrouping = true;

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

    private resizeTimeout: any;
    private lastWidth = 0;
    private lastHeight = 0;

    constructor(private treemapLayoutService: TreemapLayoutService) { }

    ngOnInit(): void {
        // Add a slight delay to ensure the container is fully rendered
        setTimeout(() => {
            this.buildTreemap();
            this.setupResizeObserver();
        }, 100);
    }

    ngOnChanges(changes: SimpleChanges): void {
        // Rebuild the treemap if data or major config changed
        const shouldRebuild = ['data', 'colorMode', 'groupSmallNodes', 'hierarchicalData'].some(prop => changes[prop]);

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
        // Debounce resize events
        if (this.resizeTimeout) {
            clearTimeout(this.resizeTimeout);
        }

        this.resizeTimeout = setTimeout(() => {
            if (this.treemapInstance) {
                const container = this.containerRef.nativeElement;
                const width = container.clientWidth;
                const height = container.clientHeight;

                // Only rebuild if dimensions changed significantly
                if (Math.abs(this.lastWidth - width) > 5 || Math.abs(this.lastHeight - height) > 5) {
                    console.log('Rebuilding treemap due to size change:', width, height);
                    this.lastWidth = width;
                    this.lastHeight = height;
                    this.buildTreemap();
                }
            }
        }, 250); // 250ms debounce
    }

    updateLabels(show: boolean): void {
        this.showLabels = show;

        // If we have a treemap instance, update it
        if (this.treemapInstance) {
            // Simple approach - toggle visibility of existing labels
            const container = this.containerRef.nativeElement;
            const labels = container.querySelectorAll('text.node-label');
            labels.forEach((label: any) => {
                label.style.display = show ? '' : 'none';
            });
        }
    }

    /**
     * Get the SVG element for export
     */
    getSvgElement(): SVGElement | null {
        try {
            const container = this.containerRef.nativeElement;
            return container.querySelector('svg') as SVGElement;
        } catch (error) {
            console.error('Error getting SVG element:', error);
            return null;
        }
    }

    private setupResizeObserver(): void {
        const container = this.containerRef.nativeElement;

        this.resizeObserver = new ResizeObserver(entries => {
            // Get the new dimensions from the entry
            const entry = entries[0];
            if (entry) {
                const newWidth = entry.contentRect.width;
                const newHeight = entry.contentRect.height;

                // Only rebuild if dimensions changed significantly
                if (Math.abs(this.lastWidth - newWidth) > 5 || Math.abs(this.lastHeight - newHeight) > 5) {
                    console.log('ResizeObserver detected size change:', newWidth, newHeight);
                    this.lastWidth = newWidth;
                    this.lastHeight = newHeight;
                    this.buildTreemap();
                }
            }
        });

        this.resizeObserver.observe(container);
    }

    private buildTreemap(): void {
        const container = this.containerRef.nativeElement;

        // Skip if no data or container not available
        if ((!this.data?.length && !this.hierarchicalData) || !container) return;

        // Get dimensions from the container
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Store dimensions for resize comparisons
        this.lastWidth = width;
        this.lastHeight = height;

        console.log('Building treemap with dimensions:', width, height);

        // Configure the treemap
        const config: TreemapConfig = {
            width,
            height,
            showLabels: this.showLabels,
            themeDark: this.isDarkTheme,
            groupSmallNodes: this.groupSmallNodes,
            minNodeSize: 20,
            colorMode: this.colorMode,
            coverageRanges: this.coverageRanges,
            autoHideControls: false,
            enableDomainGrouping: this.enableDomainGrouping
        };

        // Either use provided hierarchical data or create it from flat data
        const hierarchyData = this.hierarchicalData || this.convertToHierarchy(this.data);

        // Create or update the treemap using the TreemapLayoutService
        if (this.treemapInstance) {
            this.treemapInstance.update(hierarchyData, config);
        } else {
            this.treemapInstance = this.treemapLayoutService.createTreemap(
                this.containerRef,
                hierarchyData,
                config,
                (node) => this.onNodeSelectedInternal(node),
                (node, event) => this.onNodeHover(node, event),
                () => this.onNodeLeave()
            );
        }
    }

    /**
     * Creates a hierarchical structure suitable for D3 treemap
     */
    private convertToHierarchy(data: Coverage[]): any {
        // Group by package first
        const packageMap = new Map<string, Coverage[]>();

        data.forEach(item => {
            // Handle domain groups specially
            if (item.isDomainGroup && item.children) {
                packageMap.set(item.packageName || 'Default', [item]);
                return;
            }

            const pkgName = item.packageName || 'Default';
            if (!packageMap.has(pkgName)) {
                packageMap.set(pkgName, []);
            }
            packageMap.get(pkgName)!.push(item);
        });

        // Create hierarchy root
        const root = {
            name: 'Coverage',
            children: [] as any[],
            isNamespace: true,
            coverage: 0,
            value: 0
        };

        // Add packages as children
        packageMap.forEach((classes, pkgName) => {
            // Check if we have a domain group
            const domainGroup = classes.find(c => c.isDomainGroup);

            if (domainGroup) {
                // Add domain group as-is
                root.children.push({
                    name: pkgName,
                    isNamespace: true,
                    isDomainGroup: true,
                    coverage: domainGroup.coverage,
                    value: domainGroup.linesValid || 0,
                    children: domainGroup.children?.map(cls => ({
                        name: cls.className,
                        isNamespace: false,
                        coverage: cls.coverage,
                        value: cls.linesValid || 1,
                        branchRate: cls.branchRate,
                        linesCovered: cls.linesCovered,
                        linesValid: cls.linesValid,
                        filename: cls.filename,
                        packageName: cls.packageName,
                        originalData: cls
                    })) || []
                });
            } else {
                // Calculate package metrics for regular package
                const totalLines = classes.reduce((sum, cls) => sum + (cls.linesValid || 0), 0);
                const totalCovered = classes.reduce((sum, cls) => {
                    const covered = cls.linesCovered !== undefined
                        ? cls.linesCovered
                        : (cls.linesValid * cls.coverage / 100);
                    return sum + covered;
                }, 0);

                const pkgCoverage = totalLines > 0 ? (totalCovered / totalLines) * 100 : 0;

                // Create package node
                const pkgNode = {
                    name: pkgName,
                    isNamespace: true,
                    coverage: pkgCoverage,
                    value: totalLines,
                    children: classes.map(cls => ({
                        name: cls.className,
                        isNamespace: false,
                        coverage: cls.coverage,
                        value: cls.linesValid || 1,
                        branchRate: cls.branchRate,
                        linesCovered: cls.linesCovered,
                        linesValid: cls.linesValid,
                        filename: cls.filename,
                        packageName: cls.packageName,
                        originalData: cls
                    }))
                };

                root.children.push(pkgNode);
            }
        });

        // Calculate root coverage
        const rootTotalLines = root.children.reduce((sum, pkg) => sum + pkg.value, 0);
        const rootTotalCovered = root.children.reduce((sum, pkg) => {
            return sum + (pkg.value * pkg.coverage / 100);
        }, 0);

        root.coverage = rootTotalLines > 0 ? (rootTotalCovered / rootTotalLines) * 100 : 0;

        return root;
    }

    /**
     * Handle node selection and emit the selected node
     */
    private onNodeSelectedInternal(node: any): void {
        // For D3 hierarchy nodes, access data differently
        const nodeData = node.data ? node.data : node;

        if (nodeData.originalData) {
            // The node has a reference to the original data
            this.nodeSelected.emit(nodeData.originalData);
        } else if (nodeData.isDomainGroup) {
            // It's a domain group node
            this.nodeSelected.emit({
                className: nodeData.name + ' Domain',
                packageName: nodeData.name,
                coverage: nodeData.coverage,
                linesValid: nodeData.value || 0,
                linesCovered: nodeData.linesCovered,
                isDomainGroup: true,
                children: nodeData.children?.map((c: any) => c.originalData || c)
            });
        } else if (!nodeData.isNamespace) {
            // It's a class node without originalData reference
            this.nodeSelected.emit({
                className: nodeData.name,
                packageName: nodeData.packageName || '',
                coverage: nodeData.coverage,
                linesValid: nodeData.value || 0,
                linesCovered: nodeData.linesCovered,
                branchRate: nodeData.branchRate,
                filename: nodeData.filename
            });
        }
    }


    /**
     * Handle node hover event
     */
    private onNodeHover(node: any, event: MouseEvent): void {
        // Extract node data
        const nodeData = node.data ? node.data : node;

        // Set tooltip data
        this.tooltipNode = nodeData.originalData || nodeData;

        // Position tooltip above the mouse cursor
        this.tooltipX = event.clientX;
        this.tooltipY = event.clientY - 10;
        this.showTooltip = true;
    }

    /**
     * Handle mouse leaving a node
     */
    private onNodeLeave(): void {
        this.showTooltip = false;
    }

    /**
     * Public method to allow zooming to a specific node
     */
    public zoomToNode(node: any): void {
        if (this.treemapInstance && this.treemapInstance.zoomToNode) {
            this.treemapInstance.zoomToNode(node);
        }
    }

    /**
     * Public method to reset zoom level
     */
    public resetZoom(): void {
        if (this.treemapInstance && this.treemapInstance.resetZoom) {
            this.treemapInstance.resetZoom();
        }
    }

    public refreshLayout(): void {
        if (this.containerRef && this.containerRef.nativeElement) {
            // Force a recalculation of the layout
            const container = this.containerRef.nativeElement;
            this.lastWidth = 0; // Reset to force rebuild
            this.lastHeight = 0;

            // Small delay to ensure DOM is ready
            setTimeout(() => {
                this.buildTreemap();
            }, 50);
        }
    }

    /**
     * Public method to highlight a specific node by name
     */
    public highlightNode(nodeName: string): void {
        if (this.treemapInstance && this.treemapInstance.highlightNode) {
            this.treemapInstance.highlightNode(nodeName);
        }
    }
}