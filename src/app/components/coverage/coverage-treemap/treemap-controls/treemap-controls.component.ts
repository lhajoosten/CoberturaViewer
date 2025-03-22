import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-treemap-controls',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './treemap-controls.component.html',
    styleUrls: ['./treemap-controls.component.scss']
})
export class TreemapControlsComponent implements OnInit {
    // Filter inputs and outputs
    @Input() minCoverage = 0;
    @Output() minCoverageChange = new EventEmitter<number>();

    @Input() selectedPackage = '';
    @Output() selectedPackageChange = new EventEmitter<string>();

    @Input() groupSmallNodes = false;
    @Output() groupSmallNodesChange = new EventEmitter<boolean>();

    @Input() searchTerm = '';
    @Output() searchTermChange = new EventEmitter<string>();

    @Input() showLabels = true;
    @Output() showLabelsChange = new EventEmitter<boolean>();

    @Input() colorMode = 'default';
    @Output() colorModeChange = new EventEmitter<string>();

    @Input() minLines = 0;
    @Output() minLinesChange = new EventEmitter<number>();

    @Input() sortBy = 'size';
    @Output() sortByChange = new EventEmitter<string>();

    // Data inputs
    @Input() packageList: string[] = [];
    @Input() hasActiveFilters = false;
    @Input() showFilters = false;

    // Actions
    @Output() clearFilters = new EventEmitter<void>();
    @Output() toggleFilters = new EventEmitter<boolean>();

    // UI state
    isExpanded = false;

    // Available sort options
    sortOptions = [
        { value: 'size', label: 'Size (Lines of Code)' },
        { value: 'coverage', label: 'Coverage Percentage' },
        { value: 'name', label: 'Class Name' }
    ];

    // Available color schemes
    colorModeOptions = [
        { value: 'default', label: 'Standard Colors' },
        { value: 'colorblind', label: 'Colorblind Friendly' }
    ];

    ngOnInit(): void {
        // Initialize with filters expanded if there are active filters
        this.isExpanded = this.hasActiveFilters;
    }

    // Toggle the expanded state of filters
    toggleExpanded(): void {
        this.isExpanded = !this.isExpanded;
        this.toggleFilters.emit(this.isExpanded);
    }

    // Helper method to update and emit a new value
    updateValue(value: any, emitter: EventEmitter<any>): void {
        emitter.emit(value);
    }

    // Specific handlers for certain types of controls
    onMinCoverageChange(event: Event): void {
        const value = +(event.target as HTMLInputElement).value;
        this.minCoverageChange.emit(value);
    }

    onSearchTermChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchTermChange.emit(value);
    }

    onSelectedPackageChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.selectedPackageChange.emit(value);
    }

    onMinLinesChange(event: Event): void {
        const value = +(event.target as HTMLInputElement).value;
        this.minLinesChange.emit(value);
    }

    onSortByChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.sortByChange.emit(value);
    }

    onColorModeChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.colorModeChange.emit(value);
    }

    onToggleGrouping(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.groupSmallNodesChange.emit(checked);
    }

    onToggleLabels(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.showLabelsChange.emit(checked);
    }

    onClearFilters(): void {
        this.clearFilters.emit();
    }
}