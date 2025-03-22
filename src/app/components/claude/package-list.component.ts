import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { PackageInfo } from '../../models/coverage.model';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-package-list',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './package-list.component.html',
    styleUrls: ['./package-list.component.scss']
})
export class PackageListComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    packages: PackageInfo[] = [];
    filteredPackages: PackageInfo[] = [];
    expandedPackages: Set<string> = new Set();
    searchTerm = '';
    showLowCoverageOnly = false;

    constructor(private coverageStore: CoverageStoreService) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe(data => {
            this.packages = data?.packages || [];
            this.filterPackages();
        });
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    togglePackage(packageName: string): void {
        if (this.expandedPackages.has(packageName)) {
            this.expandedPackages.delete(packageName);
        } else {
            this.expandedPackages.add(packageName);
        }
    }

    isPackageExpanded(packageName: string): boolean {
        return this.expandedPackages.has(packageName);
    }

    getColorClass(rate: number): string {
        if (rate >= 90) return 'excellent';
        if (rate >= 75) return 'good';
        if (rate >= 50) return 'average';
        return 'poor';
    }

    filterPackages(): void {
        let filtered = [...this.packages];

        // Apply search filter
        if (this.searchTerm.trim()) {
            const searchLower = this.searchTerm.toLowerCase().trim();
            filtered = filtered.filter(pkg => {
                // Check if package name matches
                if (pkg.name.toLowerCase().includes(searchLower)) {
                    return true;
                }

                // Check if any class name matches
                return pkg.classes.some(cls => cls.name.toLowerCase().includes(searchLower));
            });
        }

        // Apply low coverage filter
        if (this.showLowCoverageOnly) {
            filtered = filtered.filter(pkg => pkg.lineRate < 80);
        }

        this.filteredPackages = filtered;

        // Auto-expand packages if searching
        if (this.searchTerm.trim()) {
            filtered.forEach(pkg => {
                this.expandedPackages.add(pkg.name);
            });
        }
    }

    resetFilters(): void {
        this.searchTerm = '';
        this.showLowCoverageOnly = false;
        this.filterPackages();
    }
}