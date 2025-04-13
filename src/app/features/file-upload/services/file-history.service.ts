import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HistoricalFile } from '../models/historical-file.inteface';
import { ToastService } from '../../../core/services/utils/toast.service';

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
   * Get file content by ID
   */
  getFileContent(fileId: string): string | null {
    try {
      const files = this.files.getValue();
      const file = files.find(f => f.id === fileId);

      if (!file) {
        console.error(`File with ID ${fileId} not found`);
        return null;
      }

      const content = localStorage.getItem(`file-content:${file.name}`);
      return content;
    } catch (error) {
      console.error('Error getting file content:', error);
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

      // Check if file already exists
      const existingIndex = currentFiles.findIndex(f => f.name === file.name);
      if (existingIndex !== -1) {
        // Update existing file
        currentFiles.splice(existingIndex, 1);
      }

      // Ensure file has current date
      file.date = new Date();

      // Extract summary information for XML files
      if (file.type === 'xml' && !file.summary) {
        file.summary = this.extractCoverageSummary(content);
      }

      // Add to the beginning of the array
      const updatedFiles = [file, ...currentFiles];

      // Keep only last 30 files
      if (updatedFiles.length > 30) {
        const removedFile = updatedFiles.pop();
        if (removedFile) {
          localStorage.removeItem(`file-content:${removedFile.name}`);
          localStorage.removeItem(`file-metadata:${removedFile.name}`);
        }
      }

      // Save file content and metadata
      localStorage.setItem(`file-content:${file.name}`, content);
      localStorage.setItem(`file-metadata:${file.name}`, JSON.stringify({
        date: file.date.toISOString(),
        size: file.size,
        type: file.type,
        summary: file.summary
      }));

      // Save file list
      this.saveFiles(updatedFiles);

      // Update state
      this.files.next(updatedFiles);
      console.log('File added to history:', file);
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
      const fileIndex = currentFiles.findIndex(f => f.id === fileId);

      if (fileIndex === -1) {
        console.warn(`File with ID ${fileId} not found`);
        return;
      }

      const file = currentFiles[fileIndex];

      // Remove from localStorage
      localStorage.removeItem(`file-content:${file.name}`);
      localStorage.removeItem(`file-metadata:${file.name}`);

      // Remove from array
      currentFiles.splice(fileIndex, 1);

      // Save updated file list
      this.saveFiles(currentFiles);

      // Update state
      this.files.next([...currentFiles]);
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
      // Clear all files from localStorage
      const currentFiles = this.files.getValue();

      for (const file of currentFiles) {
        localStorage.removeItem(`file-content:${file.name}`);
        localStorage.removeItem(`file-metadata:${file.name}`);
      }

      // Clear file list
      localStorage.removeItem('recent-files');

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
    const fileNames = files.map(f => f.name);
    localStorage.setItem('recent-files', JSON.stringify(fileNames));
  }

  /**
   * Private: Load recent files from localStorage
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
          // Get file content
          const fileContent = localStorage.getItem(`file-content:${fileName}`);

          // Get file metadata
          const metadataJson = localStorage.getItem(`file-metadata:${fileName}`);
          let fileDate = new Date();
          let fileSize: number | undefined = undefined;
          let fileType: 'xml' | 'json' | 'sample' = 'xml';
          let fileSummary = undefined;

          // Parse metadata if available
          if (metadataJson) {
            try {
              const metadata = JSON.parse(metadataJson);
              if (metadata.date) {
                fileDate = new Date(metadata.date);
              }
              if (metadata.size) {
                fileSize = metadata.size;
              }
              if (metadata.type) {
                fileType = metadata.type;
              }
              if (metadata.summary) {
                fileSummary = metadata.summary;
              }
            } catch (e) {
              console.error('Error parsing file metadata:', e);
            }
          }

          // If no summary in metadata but we have content, try to extract it
          if (!fileSummary && fileContent && fileType === 'xml') {
            fileSummary = this.extractCoverageSummary(fileContent);
          }

          // Generate ID if needed
          const fileId = fileName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_') + '_' + Math.random().toString(36).substring(2, 6);

          // Create historical file
          historicalFiles.push({
            id: fileId,
            name: fileName,
            date: fileDate,
            size: fileSize,
            type: fileType,
            summary: fileSummary
          });
        } catch (error) {
          console.error(`Error processing file ${fileName}:`, error);
        }
      }

      // Sort by date (newest first)
      historicalFiles.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Update state
      this.files.next(historicalFiles);
      console.log('Loaded file history:', historicalFiles);
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