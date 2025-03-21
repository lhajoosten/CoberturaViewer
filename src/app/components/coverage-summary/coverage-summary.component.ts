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

    getGaugePath(rate: number): string {
        // Convert percentage to angle (0% = -180°, 100% = 0°)
        const startAngle = -180;
        const endAngle = startAngle + (rate / 100) * 180;

        // Calculate start and end points
        const x1 = 100 + 90 * Math.cos(startAngle * Math.PI / 180);
        const y1 = 100 + 90 * Math.sin(startAngle * Math.PI / 180);
        const x2 = 100 + 90 * Math.cos(endAngle * Math.PI / 180);
        const y2 = 100 + 90 * Math.sin(endAngle * Math.PI / 180);

        // Use a large arc flag (1) for angles > 180°
        const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;

        // Create the SVG arc path
        return `M ${x1},${y1} A 90,90 0 ${largeArcFlag},1 ${x2},${y2}`;
    }

    getGaugeColor(rate: number): string {
        if (rate >= 90) return '#0cce6b'; // Excellent
        if (rate >= 75) return '#4cd964'; // Good
        if (rate >= 50) return '#ffb400'; // Average
        return '#ff4757'; // Poor
    }

    getTimeFromTimestamp(timestamp: string): Date {
        if (!timestamp) return new Date();

        // Check if timestamp is Unix timestamp (number of seconds since epoch)
        if (/^\d+$/.test(timestamp)) {
            return new Date(parseInt(timestamp) * 1000);
        }

        // Otherwise, try to parse as ISO date string
        return new Date(timestamp);
    }
}