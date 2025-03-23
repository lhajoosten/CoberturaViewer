import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../../services/utils/theme.service';
import { Subscription } from 'rxjs';
import { ExclusionPattern } from '../../../../models/treemap-config.model';

@Component({
    selector: 'app-treemap-controls',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './treemap-controls.component.html',
    styleUrls: ['./treemap-controls.component.scss']
})
export class TreemapControlsComponent implements OnInit, OnDestroy {
    @Input() minCoverage = 0;
    @Input() selectedPackage = '';
    @Input() groupSmallNodes = false;
    @Input() searchTerm = '';
    @Input() showFilters = false;
    @Input() showLabels = true;
    @Input() colorMode: 'default' | 'colorblind' = 'default';
    @Input() minLines = 0;
    @Input() sortBy = 'size';
    @Input() hasActiveFilters = false;
    @Input() packageList: string[] = [];
    @Input() exclusionPatterns: ExclusionPattern[] = [];
    @Input() enableDomainGrouping = true;
    @Input() enableDomainGroupingOption = true;

    @Output() minCoverageChange = new EventEmitter<number>();
    @Output() selectedPackageChange = new EventEmitter<string>();
    @Output() groupSmallNodesChange = new EventEmitter<boolean>();
    @Output() searchTermChange = new EventEmitter<string>();
    @Output() showLabelsChange = new EventEmitter<boolean>();
    @Output() colorModeChange = new EventEmitter<string>();
    @Output() minLinesChange = new EventEmitter<number>();
    @Output() sortByChange = new EventEmitter<string>();
    @Output() clearFilters = new EventEmitter<void>();
    @Output() toggleFilters = new EventEmitter<boolean>();
    @Output() toggleExclusionsPanel = new EventEmitter<void>();
    @Output() enableDomainGroupingChange = new EventEmitter<boolean>();

    // UI state
    isExpanded = false;
    isDarkTheme = false;
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

    get activeExclusionsCount(): number {
        if (!this.exclusionPatterns) return 0;
        return this.exclusionPatterns.filter(p => p.enabled).length;
    }

    constructor(private themeService: ThemeService) { }

    ngOnInit(): void {
        // Initialize with filters expanded if there are active filters
        //this.isExpanded = this.hasActiveFilters || this.showFilters;

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

    toggleExpanded(): void {
        this.isExpanded = !this.isExpanded;
        this.toggleFilters.emit(this.isExpanded);
    }

    onClearFilters(): void {
        this.clearFilters.emit();
    }

    onMinCoverageChange(event: Event): void {
        const value = +(event.target as HTMLInputElement).value;
        this.minCoverage = value;
        this.minCoverageChange.emit(value);
    }

    onSelectedPackageChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.selectedPackage = value;
        this.selectedPackageChange.emit(value);
    }

    onToggleGrouping(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.groupSmallNodes = checked;
        this.groupSmallNodesChange.emit(checked);
    }

    onSearchTermChange(event: Event): void {
        const value = (event.target as HTMLInputElement).value;
        this.searchTerm = value;
        this.searchTermChange.emit(value);
    }

    onToggleLabels(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.showLabels = checked;
        this.showLabelsChange.emit(checked);
    }

    onToggleDomainGrouping(event: Event): void {
        const checked = (event.target as HTMLInputElement).checked;
        this.enableDomainGrouping = checked;
        this.enableDomainGroupingChange.emit(checked);
    }

    onColorModeChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.colorMode = value as 'default' | 'colorblind';
        this.colorModeChange.emit(value);
    }

    onMinLinesChange(event: Event): void {
        const value = +(event.target as HTMLInputElement).value;
        this.minLines = value;
        this.minLinesChange.emit(value);
    }

    onSortByChange(event: Event): void {
        const value = (event.target as HTMLSelectElement).value;
        this.sortBy = value;
        this.sortByChange.emit(value);
    }

    onToggleExclusionsPanel(): void {
        this.toggleExclusionsPanel.emit();
    }
}