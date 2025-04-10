import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CoverageData } from '../models/coverage.model';

@Injectable({
    providedIn: 'root'
})
export class CoverageStoreService {
    private coverageData = new BehaviorSubject<CoverageData | null>(null);

    constructor() { }

    setCoverageData(data: CoverageData | null): void {
        this.coverageData.next(data);
    }

    getCoverageData(): Observable<CoverageData | null> {
        return this.coverageData.asObservable();
    }

    // New method to get the current value directly
    getCurrentCoverageData(): CoverageData | null {
        return this.coverageData.getValue();
    }

    clearData(): void {
        this.coverageData.next(null);
    }
}
