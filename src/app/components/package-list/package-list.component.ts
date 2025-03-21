import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { PackageInfo } from '../../models/coverage.model';

@Component({
    selector: 'app-package-list',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './package-list.component.html',
    styleUrls: ['./package-list.component.scss']
})
export class PackageListComponent implements OnInit {
    packages: PackageInfo[] = [];
    expandedPackages: Set<string> = new Set();

    constructor(private coverageStore: CoverageStoreService) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe(data => {
            this.packages = data?.packages || [];
            // Reset expanded state when data changes
            this.expandedPackages.clear();
        });
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
}
