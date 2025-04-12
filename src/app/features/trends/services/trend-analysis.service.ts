import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CoverageData, CoverageSnapshot } from '../../../core/models/coverage.model';

@Injectable({
  providedIn: 'root'
})
export class TrendAnalysisService {
  private snapshots = new BehaviorSubject<CoverageSnapshot[]>([]);

  constructor() {
    // Load saved snapshots from localStorage
    this.loadSavedSnapshots();
  }

  /**
   * Get all coverage snapshots
   */
  getSnapshots(): Observable<CoverageSnapshot[]> {
    return this.snapshots.asObservable();
  }

  /**
   * Add a new snapshot from coverage data
   */
  addSnapshot(coverageData: CoverageData): void {
    if (!coverageData) return;

    const existingSnapshots = this.snapshots.getValue();

    // Create new snapshot
    const newSnapshot: CoverageSnapshot = {
      timestamp: coverageData.summary.timestamp,
      date: new Date(),
      lineCoverage: coverageData.summary.lineCoverage,
      branchCoverage: coverageData.summary.branchCoverage || 0,
      linesCovered: coverageData.summary.linesCovered,
      linesValid: coverageData.summary.linesValid
    };

    // Add to snapshots array
    const updatedSnapshots = [...existingSnapshots, newSnapshot];

    // Sort by date (newest first)
    updatedSnapshots.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Keep only last 30 snapshots
    if (updatedSnapshots.length > 30) {
      updatedSnapshots.splice(30);
    }

    // Update state and save
    this.snapshots.next(updatedSnapshots);
    this.saveSnapshots(updatedSnapshots);
  }

  /**
   * Clear all snapshots
   */
  clearSnapshots(): void {
    this.snapshots.next([]);
    localStorage.removeItem('coverage-snapshots');
  }

  /**
   * Get trend statistics
   */
  getTrendStatistics(timeframe: number = 30): any {
    const snapshots = this.snapshots.getValue();
    if (snapshots.length < 2) {
      return {
        change: 0,
        direction: 'neutral',
        isPositive: false,
        isNegative: false
      };
    }

    // Filter by timeframe
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframe);

    const filteredSnapshots = snapshots.filter(s => s.date >= cutoffDate);
    if (filteredSnapshots.length < 2) {
      return {
        change: 0,
        direction: 'neutral',
        isPositive: false,
        isNegative: false
      };
    }

    // Calculate trend
    const newest = filteredSnapshots[0];
    const oldest = filteredSnapshots[filteredSnapshots.length - 1];

    const change = newest.lineCoverage - oldest.lineCoverage;
    const direction = change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'neutral';

    return {
      change,
      direction,
      isPositive: change > 0,
      isNegative: change < 0,
      oldest,
      newest,
      snapshots: filteredSnapshots
    };
  }

  /**
   * Generate mock data for demonstrating trends
   */
  generateMockTrends(): void {
    const mockSnapshots: CoverageSnapshot[] = [];
    const today = new Date();

    // Generate 30 days of mock data
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Start at 60% coverage and end at 85% with some randomness
      const progress = (29 - i) / 29; // 0 to 1
      const baseCoverage = 60 + (25 * progress); // 60% to 85%
      const randomVariation = (Math.random() - 0.5) * 5; // -2.5% to +2.5%

      const lineCoverage = Math.min(Math.max(baseCoverage + randomVariation, 0), 100);
      const branchCoverage = Math.min(Math.max(lineCoverage - (Math.random() * 10), 0), 100);

      mockSnapshots.push({
        timestamp: date.toISOString(),
        date,
        lineCoverage,
        branchCoverage,
        linesCovered: Math.floor(100 + (900 * progress)),
        linesValid: 1000
      });
    }

    // Update state and save
    this.snapshots.next(mockSnapshots);
    this.saveSnapshots(mockSnapshots);
  }

  private loadSavedSnapshots(): void {
    try {
      const savedData = localStorage.getItem('coverage-snapshots');
      if (savedData) {
        const parsedData = JSON.parse(savedData);

        // Convert string dates back to Date objects
        const snapshots = parsedData.map((snap: any) => ({
          ...snap,
          date: new Date(snap.date)
        }));

        this.snapshots.next(snapshots);
      }
    } catch (error) {
      console.error('Error loading snapshots:', error);
      // If error, initialize with empty array
      this.snapshots.next([]);
    }
  }

  private saveSnapshots(snapshots: CoverageSnapshot[]): void {
    try {
      localStorage.setItem('coverage-snapshots', JSON.stringify(snapshots));
    } catch (error) {
      console.error('Error saving snapshots:', error);
    }
  }
}