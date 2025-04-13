import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HistoricalFile } from '../models/historical-file.inteface';
import { ToastService } from '../../../core/services/utils/toast.service';

@Injectable({
  providedIn: 'root'
})
export class FileHistoryService {
  private files = new BehaviorSubject<HistoricalFile[]>([]);

  private readonly FILE_LIST_KEY = 'coverage-files';
  private readonly CONTENT_PREFIX = 'coverage-content-';

  constructor(private ToastService: ToastService) {
    this.loadRecentFiles();
    console.log('FileHistoryService initialized');
  }

  /**
   * Get all historical files
   */
  getFiles(): Observable<HistoricalFile[]> {
    return this.files.asObservable();
  }

  /**
   * Get file content by ID
   */
  getFileContent(fileId: string): string | null {
    try {
      // Use consistent key prefix for content
      const content = localStorage.getItem(`${this.CONTENT_PREFIX}${fileId}`);
      if (!content) {
        console.error(`No content found for file ID: ${fileId}`);
      }
      return content;
    } catch (error) {
      console.error('Error retrieving file content:', error);
      return null;
    }
  }

  /**
   * Add file to history
   */
  addFile(file: HistoricalFile, content: string): void {
    try {
      // Load current files
      const currentFiles = this.files.getValue();

      // Remove existing file with same ID or name if exists
      const updatedFiles = currentFiles.filter(f =>
        f.id !== file.id && f.name !== file.name
      );

      // Add to the beginning of the array
      updatedFiles.unshift(file);

      // Keep only last 30 files
      if (updatedFiles.length > 30) {
        const removedFile = updatedFiles.pop();
        if (removedFile) {
          localStorage.removeItem(`${this.CONTENT_PREFIX}${removedFile.id}`);
        }
      }

      // Store content by file ID
      localStorage.setItem(`${this.CONTENT_PREFIX}${file.id}`, content);

      // Save complete file objects to localStorage
      this.saveFiles(updatedFiles);

      // Update state
      this.files.next(updatedFiles);
      console.log('File added to history:', file.name);
    } catch (error) {
      console.error('Error adding file to history:', error);
      this.ToastService.showError('File History Error', 'Could not save file to history');
    }
  }

  /**
  * Remove file from history
  */
  removeFile(fileId: string): void {
    try {
      const currentFiles = this.files.getValue();
      const updatedFiles = currentFiles.filter(f => f.id !== fileId);

      if (updatedFiles.length === currentFiles.length) {
        console.warn(`File with ID ${fileId} not found`);
        return;
      }

      // Remove from localStorage
      localStorage.removeItem(`${this.CONTENT_PREFIX}${fileId}`);

      // Save updated file list
      this.saveFiles(updatedFiles);

      // Update state
      this.files.next(updatedFiles);
    } catch (error) {
      console.error('Error removing file:', error);
      this.ToastService.showError('File History Error', 'Could not remove file from history');
    }
  }

  /**
   * Clear file history
   */
  clearHistory(): void {
    try {
      // Get all current files
      const currentFiles = this.files.getValue();

      // Clear all file content from localStorage
      for (const file of currentFiles) {
        localStorage.removeItem(`${this.CONTENT_PREFIX}${file.id}`);
      }

      // Clear file list
      localStorage.removeItem(this.FILE_LIST_KEY);

      // Update state
      this.files.next([]);
    } catch (error) {
      console.error('Error clearing file history:', error);
      this.ToastService.showError('File History Error', 'Could not clear file history');
    }
  }

  /**
   * Private: Save file list to localStorage
   */
  private saveFiles(files: HistoricalFile[]): void {
    try {
      // Store full file objects, not just names
      localStorage.setItem(this.FILE_LIST_KEY, JSON.stringify(files));
    } catch (error) {
      console.error('Error saving files to localStorage:', error);
    }
  }

  /**
   * Private: Load recent files from localStorage
   */
  private loadRecentFiles(): void {
    try {
      // Get file list as complete objects
      const filesJson = localStorage.getItem(this.FILE_LIST_KEY);
      if (!filesJson) {
        console.log('No files found in localStorage');
        this.files.next([]);
        return;
      }

      // Parse file list
      let loadedFiles: HistoricalFile[] = [];
      try {
        const parsed = JSON.parse(filesJson);
        if (Array.isArray(parsed)) {
          loadedFiles = parsed;

          // Ensure dates are properly parsed as Date objects
          loadedFiles.forEach(file => {
            if (typeof file.date === 'string') {
              file.date = new Date(file.date);
            }
          });
        } else {
          throw new Error('Invalid file list format');
        }
      } catch (e) {
        console.error('Failed to parse file list:', e);
        this.files.next([]);
        return;
      }

      // Sort by date (newest first)
      loadedFiles.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
        return dateB - dateA;
      });

      console.log(`Loaded ${loadedFiles.length} files from localStorage`);

      // Update state
      this.files.next(loadedFiles);
    } catch (error) {
      console.error('Error loading file history:', error);
      this.files.next([]);
    }
  }

  /**
   * Extract coverage summary from XML content
   */
  private extractCoverageSummary(xmlContent: string): { lineCoverage: number, branchCoverage?: number, timestamp: string } | undefined {
    try {
      const coverageMatch = xmlContent.match(/<coverage[^>]*/);
      if (coverageMatch) {
        const lineRateMatch = coverageMatch[0].match(/line-rate="([^"]*)"/);
        const branchRateMatch = coverageMatch[0].match(/branch-rate="([^"]*)"/);
        const timestampMatch = coverageMatch[0].match(/timestamp="([^"]*)"/);

        if (lineRateMatch) {
          return {
            lineCoverage: parseFloat(lineRateMatch[1]) * 100,
            timestamp: timestampMatch ? timestampMatch[1] : new Date().toISOString(),
            branchCoverage: branchRateMatch ? parseFloat(branchRateMatch[1]) * 100 : undefined
          };
        }
      }
      return undefined;
    } catch (error) {
      console.error('Error extracting coverage summary:', error);
      return undefined;
    }
  }
}