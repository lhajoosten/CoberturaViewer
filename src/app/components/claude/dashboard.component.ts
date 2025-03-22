import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import { trigger, style, transition, animate } from '@angular/animations';
import { CoverageInsightsComponent } from '../coverage/coverage-insights/coverage-insights.component';
import { CoverageSunburstComponent } from '../coverage/coverage-sunburst/coverage-sunburst.component';
import { CoverageTrendsComponent } from '../coverage/coverage-trends/coverage-trends.component';
import { Subscription } from 'rxjs';
import { CoverageTreemapComponent } from '../coverage/coverage-treemap/treemap/treemap.component';
import { ThemeService } from '../../services/utils/theme.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        FileUploaderComponent,
        CoverageTreemapComponent,
        CoverageSunburstComponent,
        CoverageTrendsComponent,
        CoverageInsightsComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('300ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('300ms ease-in', style({ opacity: 0 }))
            ])
        ])
    ]
})
export class DashboardComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    hasCoverageData = false;
    isLoading = false;
    activeTab = 'treemap';
    snapshots: any[] = [];
    themeDark = false;

    tabs = [
        { id: 'treemap', label: 'Treemap', icon: 'fas fa-th-large' },
        { id: 'sunburst', label: 'Hierarchy', icon: 'fas fa-bullseye' },
        { id: 'history', label: 'Trends', icon: 'fas fa-chart-line' },
        { id: 'insights', label: 'Insights', icon: 'fas fa-lightbulb' },
    ];

    constructor(
        private coverageStore: CoverageStoreService,
        private themeService: ThemeService
    ) { }

    ngOnInit(): void {
        // Subscribe to coverage data changes first
        this.coverageStore.getCoverageData().subscribe(data => {
            this.hasCoverageData = !!data;

            if (data) {
                // Save coverage snapshot for history
                this.saveCoverageSnapshot(data);
            }
        });

        // Then load existing history
        this.loadCoverageHistory();

        // Subscribe to theme changes
        this.themeSubscription = this.themeService.darkTheme$.subscribe((isDark: boolean) => {
            this.isDarkTheme = isDark;
        });
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    setActiveTab(tabId: string): void {
        this.activeTab = tabId;
    }

    loadCoverageHistory(): void {
        try {
            const history = JSON.parse(localStorage.getItem('coverage-history') || '[]');

            // Convert date strings to Date objects
            this.snapshots = history.map((snapshot: any) => ({
                ...snapshot,
                date: new Date(snapshot.date)
            }));
        } catch (error) {
            console.error('Error loading coverage history:', error);
            this.snapshots = [];
        }
    }

    saveCoverageSnapshot(data: any): void {
        if (!data.summary) return;

        const timestamp = new Date().toISOString();
        const snapshot = {
            timestamp,
            date: new Date(),
            lineRate: data.summary.lineRate,
            branchRate: data.summary.branchRate,
            linesCovered: data.summary.linesCovered,
            linesValid: data.summary.linesValid
        };

        // Get existing history from localStorage
        const history = JSON.parse(localStorage.getItem('coverage-history') || '[]');

        // Add new snapshot (if it's different from the last one)
        const lastSnapshot = history.length > 0 ? history[history.length - 1] : null;
        if (!lastSnapshot ||
            lastSnapshot.lineRate !== snapshot.lineRate ||
            lastSnapshot.branchRate !== snapshot.branchRate) {
            history.push(snapshot);

            // Keep only the last 30 snapshots
            if (history.length > 30) {
                history.shift();
            }

            // Save updated history
            localStorage.setItem('coverage-history', JSON.stringify(history));

            // Update current snapshots
            this.loadCoverageHistory();
        }
    }
}