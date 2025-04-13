import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CoverageData } from '../../models/coverage.model';
import { CoberturaParserService } from '../parsers/cobertura-parser.service';

/**
 * Service for storing and retrieving coverage data
 * Acts as the central data store for the application
 */
@Injectable({
    providedIn: 'root'
})
export class CoverageStoreService {
    private coverageData = new BehaviorSubject<CoverageData | null>(null);

    constructor(private parser: CoberturaParserService) { }

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

    /**
     * Parses and sets the coverage data from a file
     * @param file The file to parse
     */
    loadXmlData(fileName: string, fileContent: string): void {
        console.log('Loading XML data from file:', fileName);
        const coverageData = this.parser.parseCoberturaXml(fileContent);
        this.setCoverageData(coverageData);
    }
}