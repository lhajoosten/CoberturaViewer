import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ToastService } from '../../../core/services/utils/toast.service';
import { HistoricalFile } from '../models/historical-file.inteface';

@Injectable({
  providedIn: 'root'
})
export class FileHistoryService {
  private files = new BehaviorSubject<HistoricalFile[]>([]);

  constructor(private ToastService: ToastService) {
    this.loadRecentFiles();
  }

  /**
   * Get all historical files
   */
  getFiles(): Observable<HistoricalFile[]> {
    return this.files.asObservable();
  }

  /**
   * Add file to history
   */
  addFile(file: HistoricalFile, content: string): void {
    try {
      // Load current files
      const currentFiles = this.files.getValue();

      // Check if file already exists
      const existingIndex = currentFiles.findIndex(f => f.name === file.name);
      if (existingIndex !== -1) {
        // Update existing file
        currentFiles.splice(existingIndex, 1);
      }

      // Add to the beginning of the array
      const updatedFiles = [file, ...currentFiles];

      // Keep only last 30 files
      if (updatedFiles.length > 30) {
        const removedFile = updatedFiles.pop();
        if (removedFile) {
          localStorage.removeItem(`file-content:${removedFile.name}`);
        }
      }

      // Save file content
      localStorage.setItem(`file-content:${file.name}`, content);

      // Save file list
      this.saveFiles(updatedFiles);

      // Update state
      this.files.next(updatedFiles);
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
      const fileToRemove = currentFiles.find(f => f.id === fileId);

      if (fileToRemove) {
        // Remove file content
        localStorage.removeItem(`file-content:${fileToRemove.name}`);

        // Remove from list
        const updatedFiles = currentFiles.filter(f => f.id !== fileId);
        this.saveFiles(updatedFiles);

        // Update state
        this.files.next(updatedFiles);
      }
    } catch (error) {
      console.error('Error removing file from history:', error);
      this.ToastService.showError('File History Error', 'Could not remove file from history');
    }
  }

  /**
   * Clear all files from history
   */
  clearHistory(): void {
    try {
      const currentFiles = this.files.getValue();

      // Remove all file contents
      currentFiles.forEach(file => {
        localStorage.removeItem(`file-content:${file.name}`);
      });

      // Clear list
      localStorage.removeItem('recent-files');

      // Update state
      this.files.next([]);
    } catch (error) {
      console.error('Error clearing file history:', error);
      this.ToastService.showError('File History Error', 'Could not clear file history');
    }
  }

  /**
   * Get file content by id
   */
  getFileContent(fileName: string): string | null {
    try {
      return localStorage.getItem(`file-content:${fileName}`);
    } catch (error) {
      console.error('Error getting file content:', error);
      return null;
    }
  }

  /**
   * Load files from localStorage
   */
  private loadRecentFiles(): void {
    try {
      // Get file list
      const fileListJson = localStorage.getItem('recent-files');
      if (!fileListJson) {
        this.files.next([]);
        return;
      }

      // Parse file list
      const fileList = JSON.parse(fileListJson);

      // Convert to historical files
      const historicalFiles: HistoricalFile[] = [];

      for (const fileName of fileList) {
        try {
          const fileContent = localStorage.getItem(`file-content:${fileName}`);
          let summary;
          let size;
          let type: 'xml' | 'json' | 'sample' = 'xml';

          if (fileContent) {
            size = fileContent.length;

            // Determine file type and extract summary
            if (fileContent.trim().startsWith('{')) {
              // JSON (sample data)
              type = 'json';
              const data = JSON.parse(fileContent);
              summary = data.summary;

              // Check if it's a sample file
              if (fileName.includes('sample-')) {
                type = 'sample';
              }
            } else {
              // XML
              type = 'xml';
              const coverageMatch = fileContent.match(/<coverage[^>]*/);
              if (coverageMatch) {
                const lineRateMatch = coverageMatch[0].match(/line-rate="([^"]*)"/);
                const branchRateMatch = coverageMatch[0].match(/branch-rate="([^"]*)"/);

                if (lineRateMatch) {
                  summary = {
                    lineCoverage: parseFloat(lineRateMatch[1]) * 100,
                    timestamp: new Date().toISOString(),
                    branchCoverage: 0 // Default value
                  };

                  if (branchRateMatch) {
                    summary.branchCoverage = parseFloat(branchRateMatch[1]) * 100;
                  }
                }
              }
            }
          }

          // Create historical file
          historicalFiles.push({
            id: Math.random().toString(36).substring(2, 9),
            name: fileName,
            date: new Date(),
            size,
            summary,
            type
          });
        } catch (error) {
          console.error(`Error processing file ${fileName}:`, error);
        }
      }

      // Update state
      this.files.next(historicalFiles);
    } catch (error) {
      console.error('Error loading file history:', error);
      this.files.next([]);
    }
  }

  /**
   * Save files to localStorage
   */
  private saveFiles(files: HistoricalFile[]): void {
    try {
      // Extract file names
      const fileNames = files.map(file => file.name);

      // Save to localStorage
      localStorage.setItem('recent-files', JSON.stringify(fileNames));
    } catch (error) {
      console.error('Error saving file history:', error);
    }
  }
}