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
    @Input() hierarchicalData: any = null; // Optional: Accept pre-built hierarchy

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

        // Skip if no data or container not available
        if ((!this.data?.length && !this.hierarchicalData) || !container) return;

        // Get dimensions from the container
        const width = container.clientWidth || 800;
        const height = container.clientHeight || 600;

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
            autoHideControls: false
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
            // Calculate package metrics
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
                    value: cls.linesValid || 1, // Ensure non-zero value for sizing
                    branchRate: cls.branchRate,
                    linesCovered: cls.linesCovered,
                    linesValid: cls.linesValid,
                    filename: cls.filename,
                    packageName: cls.packageName,
                    originalData: cls // Store reference to original data
                }))
            };

            root.children.push(pkgNode);
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
}