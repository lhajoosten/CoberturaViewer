import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { CoverageSummary } from '../../models/coverage.model';

@Component({
    selector: 'app-coverage-summary',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './coverage-summary.component.html',
    styleUrls: ['./coverage-summary.component.scss']
})
export class CoverageSummaryComponent implements OnInit {
    summary: CoverageSummary | null = null;

    constructor(private coverageStore: CoverageStoreService) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe(data => {
            this.summary = data?.summary || null;
        });
    }

    getColorClass(rate: number): string {
        if (rate >= 90) return 'excellent';
        if (rate >= 75) return 'good';
        if (rate >= 50) return 'average';
        return 'poor';
    }
}