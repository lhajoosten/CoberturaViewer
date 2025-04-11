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

interface CoverageSnapshot {
    timestamp: string;
    date: Date;
    lineCoverage: number;
    branchCoverage: number;
    linesCovered: number;
    linesValid: number;
}

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

    // Modal states
    showAbout = false;
    showHelp = false;
    showUpload = false;

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
        'i': 'insights',
        'u': 'upload',
        '?': 'help'
    };

    constructor(
        private coverageStore: CoverageStoreService,
        private themeService: ThemeService,
        private notificationService: NotificationService,
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
     * Handle keyboard shortcuts
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

            switch (action) {
                case 'treemap':
                case 'sunburst':
                case 'history':
                case 'insights':
                    this.setActiveTab(action);
                    break;
                case 'upload':
                    this.uploadNewData();
                    break;
                case 'help':
                    this.showHelpModal();
                    break;
            }

            event.preventDefault();
        }
    }

    /**
     * Toggle dark theme
     */
    toggleTheme(): void {
        this.themeService.toggleTheme();
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
        // Look up the full coverage data for this snapshot from history
        try {
            const history = JSON.parse(localStorage.getItem('coverage-history') || '[]');
            const fullData = history.find((item: any) => item.timestamp === snapshot.timestamp);

            if (fullData && fullData.data) {
                this.coverageStore.setCoverageData(fullData.data);
                this.hasCoverageData = true;
                this.lastUpdatedTime = new Date(snapshot.date);
                this.notificationService.showSuccess('Data Loaded', 'Historical coverage data loaded successfully');
            } else {
                this.notificationService.showError('Data Error', 'Could not find full data for this snapshot');
            }
        } catch (error) {
            console.error('Error loading snapshot:', error);
            this.notificationService.showError('Load Error', 'Failed to load snapshot data');
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
        // Each visualization component should implement its own export functionality
        // This method can trigger that functionality based on the active tab

        // Just show a notification for now
        this.notificationService.showInfo('Export', 'Export functionality is handled by individual visualization components');
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
            }, 500);
        } else {
            this.isLoading = false;
            this.notificationService.showWarning('No Data', 'No coverage data available to reload');
        }
    }

    /**
     * Show upload modal for new data
     */
    uploadNewData(): void {
        this.showUpload = true;
    }

    /**
     * Handle upload completion
     */
    onUploadComplete(): void {
        this.closeModal();
        this.notificationService.showSuccess('Upload Complete', 'New coverage data has been loaded');
    }

    /**
     * Show about modal
     */
    showAboutModal(): void {
        this.showAbout = true;
    }

    /**
     * Show help modal
     */
    showHelpModal(): void {
        this.showHelp = true;
    }

    /**
     * Close all modals
     */
    closeModal(): void {
        this.showAbout = false;
        this.showHelp = false;
        this.showUpload = false;
    }

    /**
     * Check if history is available
     */
    get hasHistory(): boolean {
        return this.snapshots.length > 0;
    }
}