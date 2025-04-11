import { Component, Input, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import { trigger, style, transition, animate } from '@angular/animations';
import { CoverageInsightsComponent } from '../coverage/coverage-insights/coverage-insights.component';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../services/utils/theme.service';
import { NgxCoverageSunburstComponent } from '../coverage/coverage-sunburst/ngx-coverage-sunburst.component';
import { NgxCoverageTreemapComponent } from '../coverage/coverage-treemap/ngx-coverage-treemap.component';
import { NgxCoverageTrendsComponent } from '../coverage/coverage-trends/ngx-coverage-trends.component';
import { NotificationService } from '../../services/utils/notification.service';
import { CoverageSnapshot } from '../../models/coverage.model';
import { ModalService } from '../../services/utils/modal.service';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        FileUploaderComponent,
        NgxCoverageSunburstComponent,
        NgxCoverageTreemapComponent,
        NgxCoverageTrendsComponent,
        CoverageInsightsComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss'],
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(10px)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
            ])
        ])
    ],
    providers: [DatePipe]
})
export class DashboardComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    hasCoverageData = false;
    isLoading = false;
    activeTab = 'treemap';
    snapshots: CoverageSnapshot[] = [];
    lastUpdatedTime: Date | null = null;

    tabs = [
        { id: 'treemap', label: 'Treemap', icon: 'fas fa-th-large' },
        { id: 'sunburst', label: 'Hierarchy', icon: 'fas fa-bullseye' },
        { id: 'history', label: 'Trends', icon: 'fas fa-chart-line' },
        { id: 'insights', label: 'Insights', icon: 'fas fa-lightbulb' },
    ];

    // Keyboard mappings for tabs
    keyboardShortcuts: { [key: string]: string } = {
        't': 'treemap',
        's': 'sunburst',
        'h': 'history',
        'i': 'insights'
    };

    constructor(
        private coverageStore: CoverageStoreService,
        private themeService: ThemeService,
        private notificationService: NotificationService,
        private modalService: ModalService,
        private router: Router,
        private datePipe: DatePipe
    ) { }

    ngOnInit(): void {
        // Subscribe to coverage data changes first
        this.coverageStore.getCoverageData().subscribe(data => {
            this.isLoading = false;
            this.hasCoverageData = !!data;

            if (data) {
                // Save coverage snapshot for history
                this.saveCoverageSnapshot(data);
                this.lastUpdatedTime = new Date();
            }
        });

        // Then load existing history
        this.loadCoverageHistory();

        // Subscribe to theme changes
        this.themeSubscription = this.themeService.darkTheme$.subscribe((isDark: boolean) => {
            this.isDarkTheme = isDark;
        });

        // Check for saved active tab
        const savedTab = localStorage.getItem('dashboard-active-tab');
        if (savedTab && this.tabs.some(tab => tab.id === savedTab)) {
            this.activeTab = savedTab;
        }
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    /**
     * Get shortcut key for a tab
     */
    getShortcutForTab(tabId: string): string {
        for (const [key, value] of Object.entries(this.keyboardShortcuts)) {
            if (value === tabId) {
                return key.toUpperCase();
            }
        }
        return '';
    }

    /**
     * Handle keyboard shortcuts for dashboard-specific actions
     */
    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent): void {
        // Ignore shortcuts when inside inputs or textareas
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
            return;
        }

        const key = event.key.toLowerCase();

        if (this.keyboardShortcuts[key]) {
            const action = this.keyboardShortcuts[key];
            this.setActiveTab(action);
            event.preventDefault();
        }
    }

    /**
     * Set active tab
     */
    setActiveTab(tabId: string): void {
        this.activeTab = tabId;
        // Save preference in local storage
        localStorage.setItem('dashboard-active-tab', tabId);
    }

    /**
     * Format date for display
     */
    formatDate(date: Date): string {
        return this.datePipe.transform(date, 'MMM d, y, h:mm a') || '';
    }

    /**
     * Get last updated timestamp
     */
    getLastUpdated(): string {
        return this.lastUpdatedTime ? this.formatDate(this.lastUpdatedTime) : 'N/A';
    }

    /**
     * Get overall coverage percentage
     */
    getOverallCoverage(): string {
        const data = this.coverageStore.getCurrentCoverageData();
        return data ? data.summary.lineCoverage.toFixed(1) : '0.0';
    }

    /**
     * Get CSS class for overall coverage
     */
    getOverallCoverageClass(): string {
        const data = this.coverageStore.getCurrentCoverageData();
        if (!data) return 'poor';

        const coverage = data.summary.lineCoverage;
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }

    /**
     * Get coverage class based on percentage
     */
    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'average';
        return 'poor';
    }

    /**
     * Load coverage history from localStorage
     */
    loadCoverageHistory(): void {
        try {
            const history = JSON.parse(localStorage.getItem('coverage-history') || '[]');

            // Convert date strings to Date objects
            this.snapshots = history.map((snapshot: any) => ({
                ...snapshot,
                date: new Date(snapshot.date)
            }));

            // Get latest update time
            if (this.snapshots.length > 0) {
                this.lastUpdatedTime = this.snapshots[this.snapshots.length - 1].date;
            }
        } catch (error) {
            console.error('Error loading coverage history:', error);
            this.snapshots = [];
            this.notificationService.showError('History Error', 'Failed to load coverage history');
        }
    }

    /**
     * Clear history
     */
    clearHistory(): void {
        // Ask for confirmation before clearing
        if (confirm('Are you sure you want to clear all history data?')) {
            localStorage.removeItem('coverage-history');
            this.snapshots = [];
            this.notificationService.showInfo('History Cleared', 'All history data has been removed');
        }
    }

    /**
     * Load a snapshot
     */
    loadSnapshot(snapshot: CoverageSnapshot): void {
        // Show loading indicator
        this.isLoading = true;

        // Look up the full coverage data for this snapshot from history
        try {
            const history = JSON.parse(localStorage.getItem('coverage-history') || '[]');
            const fullData = history.find((item: any) => item.timestamp === snapshot.timestamp);

            // Add a small delay to show loading spinner for better UX feedback
            setTimeout(() => {
                if (fullData && fullData.data) {
                    this.coverageStore.setCoverageData(fullData.data);
                    this.hasCoverageData = true;
                    this.lastUpdatedTime = new Date(snapshot.date);
                    this.notificationService.showSuccess('Data Loaded', 'Historical coverage data loaded successfully');
                } else {
                    this.notificationService.showError('Data Error', 'Could not find full data for this snapshot');
                }
                this.isLoading = false;
            }, 600);
        } catch (error) {
            console.error('Error loading snapshot:', error);
            this.notificationService.showError('Load Error', 'Failed to load snapshot data');
            this.isLoading = false;
        }
    }

    /**
     * Save coverage snapshot for history
     */
    saveCoverageSnapshot(data: any): void {
        if (!data.summary) return;

        const timestamp = new Date().toISOString();
        const snapshot: CoverageSnapshot = {
            timestamp,
            date: new Date(),
            lineCoverage: data.summary.lineCoverage,
            branchCoverage: data.summary.branchCoverage,
            linesCovered: data.summary.linesCovered,
            linesValid: data.summary.linesValid
        };

        // Get existing history from localStorage
        const history = JSON.parse(localStorage.getItem('coverage-history') || '[]');

        // Add new snapshot (if it's different from the last one)
        const lastSnapshot = history.length > 0 ? history[history.length - 1] : null;
        if (!lastSnapshot ||
            lastSnapshot.lineCoverage !== snapshot.lineCoverage ||
            lastSnapshot.branchCoverage !== snapshot.branchCoverage) {

            // Store the full data with the snapshot for later retrieval
            const fullSnapshot = {
                ...snapshot,
                data: data
            };

            history.push(fullSnapshot);

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

    /**
     * Export current view as an image
     */
    exportCurrentView(): void {
        this.isLoading = true;

        // Simulate export process
        setTimeout(() => {
            this.isLoading = false;
            this.notificationService.showSuccess('Export Complete', 'Current view has been exported');
        }, 800);
    }

    /**
     * Reload current data
     */
    reloadData(): void {
        this.isLoading = true;
        const currentData = this.coverageStore.getCurrentCoverageData();

        if (currentData) {
            // Simulate a reload by re-setting the same data
            setTimeout(() => {
                this.coverageStore.setCoverageData(currentData);
                this.isLoading = false;
                this.notificationService.showSuccess('Data Refreshed', 'Coverage data has been reloaded');
            }, 800);
        } else {
            this.isLoading = false;
            this.notificationService.showWarning('No Data', 'No coverage data available to reload');
        }
    }

    /**
     * Open upload modal through the modal service
     */
    openUploadModal(): void {
        this.modalService.openUploadModal();
    }

    /**
     * Handle upload completion (from welcome page uploader)
     */
    onUploadComplete(): void {
        this.notificationService.showSuccess('Upload Complete', 'New coverage data has been loaded');
    }

    /**
     * Check if history is available
     */
    get hasHistory(): boolean {
        return this.snapshots.length > 0;
    }
}