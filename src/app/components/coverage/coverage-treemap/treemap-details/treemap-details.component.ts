import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Coverage } from '../../../../models/coverage.model';

@Component({
    selector: 'app-treemap-details',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './treemap-details.component.html',
    styleUrls: ['./treemap-details.component.scss']
})
export class TreemapDetailsComponent {
    @Input() selectedNode: Coverage | null = null;
    @Input() similarClasses: Coverage[] = [];

    @Output() closeDetails = new EventEmitter<void>();
    @Output() selectSimilarNode = new EventEmitter<Coverage>();

    constructor() { }

    onClose(): void {
        this.closeDetails.emit();
    }

    onSelectNode(node: Coverage): void {
        this.selectSimilarNode.emit(node);
    }

    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'moderate';
        if (coverage >= 25) return 'poor';
        return 'critical';
    }
}