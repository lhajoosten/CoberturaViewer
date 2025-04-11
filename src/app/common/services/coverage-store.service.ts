import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CoverageData } from '../models/coverage.model';

/**
 * Service for storing and retrieving coverage data
 * Acts as the central data store for the application
 */
@Injectable({
    providedIn: 'root'
})
export class CoverageStoreService {
    private coverageData = new BehaviorSubject<CoverageData | null>(null);

    constructor() { }

    /**
     * Sets the current coverage data
     * @param data The coverage data to store
     */
    setCoverageData(data: CoverageData | null): void {
        console.log('Setting coverage data in store:', data);
        this.coverageData.next(data);
    }

    /**
     * Gets an observable of the coverage data
     * @returns Observable that emits the current coverage data
     */
    getCoverageData(): Observable<CoverageData | null> {
        return this.coverageData.asObservable();
    }

    /**
     * Gets the current value of coverage data directly
     * @returns The current coverage data or null
     */
    getCurrentCoverageData(): CoverageData | null {
        return this.coverageData.getValue();
    }

    /**
     * Clears the stored coverage data
     */
    clearData(): void {
        this.coverageData.next(null);
    }
}