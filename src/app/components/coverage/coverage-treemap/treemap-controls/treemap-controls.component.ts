import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../services/utils/theme.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-treemap-controls',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './treemap-controls.component.html',
    styleUrls: ['./treemap-controls.component.scss']
})
export class TreemapControlsComponent implements OnInit, OnDestroy {
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
    @Input() isDarkTheme = false;

    // Actions
    @Output() clearFilters = new EventEmitter<void>();
    @Output() toggleFilters = new EventEmitter<boolean>();

    // UI state
    isExpanded = false;
    private themeSubscription: Subscription | null = null;

    // Available sort options
    sortOptions = [
        { value: 'size', label: 'Lines of Code' },
        { value: 'coverage', label: 'Coverage' },
        { value: 'name', label: 'Class Name' }
    ];

    // Available color schemes
    colorModeOptions = [
        { value: 'default', label: 'Standard Colors' },
        { value: 'colorblind', label: 'Colorblind Friendly' }
    ];

    constructor(private themeService: ThemeService) { }

    ngOnInit(): void {
        // Initialize with filters expanded if there are active filters
        this.isExpanded = this.hasActiveFilters || this.showFilters;

        // Subscribe to theme changes
        this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
            this.isDarkTheme = isDark;
        });
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    // Toggle the expanded state of filters
    toggleExpanded(): void {
        this.isExpanded = !this.isExpanded;
        this.toggleFilters.emit(this.isExpanded);
    }

    // Specific handlers for different types of controls
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