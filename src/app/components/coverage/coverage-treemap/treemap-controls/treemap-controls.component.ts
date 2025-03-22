import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { trigger, style, transition, animate } from '@angular/animations';

@Component({
    selector: 'app-treemap-controls',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './treemap-controls.component.html',
    styleUrls: ['./treemap-controls.component.scss'],
    animations: [
        trigger('slideDown', [
            transition(':enter', [
                style({ maxHeight: '0', opacity: 0, overflow: 'hidden' }),
                animate('300ms ease-out', style({ maxHeight: '1000px', opacity: 1 }))
            ]),
            transition(':leave', [
                style({ maxHeight: '1000px', opacity: 1, overflow: 'hidden' }),
                animate('300ms ease-in', style({ maxHeight: '0', opacity: 0 }))
            ])
        ])
    ]
})
export class TreemapControlsComponent {
    // Filter inputs
    @Input() minCoverage = 0;
    @Input() selectedPackage = '';
    @Input() packageList: string[] = [];
    @Input() groupSmallNodes = true;
    @Input() searchTerm = '';
    @Input() showFilters = false;
    @Input() showLabels = true;
    @Input() colorMode: 'default' | 'colorblind' = 'default';
    @Input() minLines = 0;
    @Input() sortBy = 'size';

    // Filter outputs
    @Output() minCoverageChange = new EventEmitter<number>();
    @Output() selectedPackageChange = new EventEmitter<string>();
    @Output() groupSmallNodesChange = new EventEmitter<boolean>();
    @Output() searchTermChange = new EventEmitter<string>();
    @Output() showFiltersChange = new EventEmitter<boolean>();
    @Output() showLabelsChange = new EventEmitter<boolean>();
    @Output() colorModeChange = new EventEmitter<'default' | 'colorblind'>();
    @Output() minLinesChange = new EventEmitter<number>();
    @Output() sortByChange = new EventEmitter<string>();
    @Output() clearFilters = new EventEmitter<void>();
    @Output() searchReset = new EventEmitter<void>();

    // Check if any filters are active
    get hasActiveFilters(): boolean {
        return this.minCoverage > 0 ||
            this.selectedPackage !== '' ||
            this.minLines > 0 ||
            this.searchTerm !== '';
    }

    // Change handlers
    onMinCoverageChange(value: number): void {
        this.minCoverage = value;
        this.minCoverageChange.emit(value);
    }

    onSelectedPackageChange(value: string): void {
        this.selectedPackage = value;
        this.selectedPackageChange.emit(value);
    }

    onGroupSmallNodesChange(value: boolean): void {
        this.groupSmallNodes = value;
        this.groupSmallNodesChange.emit(value);
    }

    onSearchTermChange(value: string): void {
        this.searchTerm = value;
        this.searchTermChange.emit(value);
    }

    onToggleFilters(): void {
        this.showFilters = !this.showFilters;
        this.showFiltersChange.emit(this.showFilters);
    }

    onShowLabelsChange(value: boolean): void {
        this.showLabels = value;
        this.showLabelsChange.emit(value);
    }

    onColorModeChange(value: 'default' | 'colorblind'): void {
        this.colorMode = value;
        this.colorModeChange.emit(value);
    }

    onMinLinesChange(value: number): void {
        this.minLines = value;
        this.minLinesChange.emit(value);
    }

    onSortByChange(value: string): void {
        this.sortBy = value;
        this.sortByChange.emit(value);
    }

    onClearFilters(): void {
        this.clearFilters.emit();
    }

    onResetSearch(): void {
        this.searchTerm = '';
        this.searchReset.emit();
    }
}