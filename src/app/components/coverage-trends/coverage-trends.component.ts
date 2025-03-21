import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { CoverageData } from '../../models/coverage.model';

interface HistoryEntry {
    date: Date;
    data: CoverageData;
}

@Component({
    selector: 'app-coverage-trends',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './coverage-trends.component.html',
    styleUrls: ['./coverage-trends.component.scss']
})
export class CoverageTrendsComponent implements OnInit {
    history: HistoryEntry[] = [];
    filteredHistory: HistoryEntry[] = [];
    hasHistory = false;
    timeRange = '30';
    showLineRate = true;
    showBranchRate = true;

    constructor(private coverageStore: CoverageStoreService) { }

    ngOnInit(): void {
        // Try to load history from localStorage
        const savedHistory = localStorage.getItem('coverageHistory');
        if (savedHistory) {
            try {
                // Parse the saved history data, converting date strings back to Date objects
                const parsed = JSON.parse(savedHistory);
                this.history = parsed.map((entry: any) => ({
                    ...entry,
                    date: new Date(entry.date)
                }));
                this.hasHistory = this.history.length > 0;
                this.updateFilteredHistory();
            } catch (e) {
                console.error('Failed to parse saved history:', e);
            }
        }

        // Subscribe to current coverage data changes
        this.coverageStore.getCoverageData().subscribe(data => {
            if (data) {
                // Check if we should add this to history
                this.addCurrentToHistory(data);
            }
        });
    }

    loadDemoData(): void {
        // Generate some sample history data
        const today = new Date();
        const demoHistory: HistoryEntry[] = [];

        // Create 10 entries over the last 90 days
        for (let i = 0; i < 10; i++) {
            const daysAgo = Math.floor(Math.random() * 90);
            const date = new Date(today);
            date.setDate(date.getDate() - daysAgo);

            // Start with a base coverage and vary it slightly
            const baseLine = 65 + Math.floor(Math.random() * 15);
            const baseBranch = 55 + Math.floor(Math.random() * 15);

            // Create a demo coverage data object
            const data: CoverageData = {
                summary: {
                    lineRate: baseLine,
                    branchRate: baseBranch,
                    linesValid: 1000,
                    linesCovered: Math.floor(1000 * (baseLine / 100)),
                    timestamp: date.toISOString()
                },
                packages: [{
                    name: 'com.example',
                    lineRate: baseLine,
                    branchRate: baseBranch,
                    classes: [{
                        name: 'ExampleClass',
                        filename: 'ExampleClass.java',
                        lineRate: baseLine,
                        branchRate: baseBranch,
                        lines: []
                    }]
                }]
            };

            demoHistory.push({ date, data });
        }

        // Sort by date, newest first
        this.history = demoHistory.sort((a, b) => b.date.getTime() - a.date.getTime());
        this.hasHistory = true;
        this.updateFilteredHistory();
        this.saveHistoryToLocalStorage();
        this.updateChart();
    }

    addCurrentToHistory(data: CoverageData): void {
        const now = new Date();
        this.history.unshift({ date: now, data });
        this.hasHistory = true;
        this.updateFilteredHistory();
        this.saveHistoryToLocalStorage();
        this.updateChart();
    }

    loadHistoryEntry(entry: HistoryEntry): void {
        this.coverageStore.setCoverageData(entry.data);
    }

    removeHistoryEntry(entry: HistoryEntry): void {
        const index = this.history.indexOf(entry);
        if (index !== -1) {
            this.history.splice(index, 1);
            this.hasHistory = this.history.length > 0;
            this.updateFilteredHistory();
            this.saveHistoryToLocalStorage();
            this.updateChart();
        }
    }

    updateFilteredHistory(): void {
        if (this.timeRange === '0') {
            // Show all history
            this.filteredHistory = [...this.history];
            return;
        }

        const days = parseInt(this.timeRange, 10);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        this.filteredHistory = this.history.filter(entry => entry.date >= cutoffDate);
    }

    updateChart(): void {
        this.updateFilteredHistory();
        // Implement D3 chart update logic here
        // For brevity, we're not including the full D3 charting code
    }

    saveHistoryToLocalStorage(): void {
        try {
            localStorage.setItem('coverageHistory', JSON.stringify(this.history));
        } catch (e) {
            console.error('Failed to save history to localStorage:', e);
        }
    }

    getCoverageClass(rate: number): string {
        if (rate >= 90) return 'excellent';
        if (rate >= 75) return 'good';
        if (rate >= 50) return 'average';
        return 'poor';
    }
}