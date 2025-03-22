import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, style, transition, animate } from '@angular/animations';

@Component({
    selector: 'app-treemap-details',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './treemap-details.component.html',
    styleUrls: ['./treemap-details.component.scss'],
    animations: [
        trigger('slideInOut', [
            transition(':enter', [
                style({ transform: 'translateX(100%)' }),
                animate('300ms ease-out', style({ transform: 'translateX(0)' }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ transform: 'translateX(100%)' }))
            ])
        ])
    ]
})
export class TreemapDetailsComponent {
    @Input() selectedNode: any = null;
    @Input() similarClasses: any[] = [];

    @Output() closeDetails = new EventEmitter<void>();
    @Output() selectSimilarNode = new EventEmitter<any>();

    /**
     * Get color class for CSS styling based on coverage
     */
    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }

    /**
     * Format coverage as text with percentage
     */
    getCoverageText(coverage: number): string {
        return `${coverage.toFixed(1)}%`;
    }

    /**
     * Close the details panel
     */
    onClose(): void {
        this.closeDetails.emit();
    }

    /**
     * Select a similar node
     */
    onSelectSimilarNode(node: any): void {
        this.selectSimilarNode.emit(node);
    }
}