import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../../core/services/utils/notification.service';
import { CoberturaParserService } from '../../../../core/services/parsers/cobertura-parser.service';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';

interface RecentFile {
  name: string;
  date: Date;
  size?: number;
  summary?: {
    lineCoverage: number;
    branchCoverage?: number;
    timestamp: string;
  };
}

@Component({
  selector: 'app-recent-files',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recent-files.component.html',
  styleUrls: ['./recent-files.component.scss']
})
export class RecentFilesComponent implements OnInit {
  recentFiles: RecentFile[] = [];
  isLoading = false;
  sortBy = 'date'; // 'date', 'name', 'coverage'
  sortOrder = 'desc'; // 'asc', 'desc'

  constructor(
    private notificationService: NotificationService,
    private parserService: CoberturaParserService,
    private coverageStore: CoverageStoreService
  ) { }

  ngOnInit(): void {
    this.loadRecentFiles();
  }

  loadRecentFiles(): void {
    try {
      // Load file names from localStorage
      const fileNames = localStorage.getItem('recent-files');
      if (!fileNames) {
        this.recentFiles = [];
        return;
      }

      const parsedNames = JSON.parse(fileNames) as string[];

      // Load file details
      this.recentFiles = parsedNames.map(name => {
        try {
          const fileContent = localStorage.getItem(`file-content:${name}`);
          let summary;
          let size;

          if (fileContent) {
            size = fileContent.length;

            // Try to parse summary info
            if (fileContent.trim().startsWith('{')) {
              // JSON (sample data)
              const data = JSON.parse(fileContent);
              summary = data.summary;
            } else {
              // XML - just get the coverage attributes
              const coverageMatch = fileContent.match(/<coverage[^>]*/);
              if (coverageMatch) {
                const lineRateMatch = coverageMatch[0].match(/line-rate="([^"]*)"/);
                const branchRateMatch = coverageMatch[0].match(/branch-rate="([^"]*)"/);

                if (lineRateMatch) {
                  summary = {
                    lineCoverage: parseFloat(lineRateMatch[1]) * 100,
                    branchCoverage: 0,
                    timestamp: new Date().toISOString()
                  };

                  if (branchRateMatch) {
                    summary.branchCoverage = parseFloat(branchRateMatch[1]) * 100;
                  }
                }
              }
            }
          }

          return {
            name,
            date: new Date(),
            size,
            summary
          };
        } catch (error) {
          console.error(`Error loading file ${name}:`, error);
          return {
            name,
            date: new Date()
          };
        }
      });

      // Apply sorting
      this.sortFiles();

    } catch (error) {
      console.error('Error loading recent files:', error);
      this.recentFiles = [];
    }
  }

  loadFile(file: RecentFile): void {
    if (this.isLoading) return;

    this.isLoading = true;

    setTimeout(() => {
      try {
        const fileContent = localStorage.getItem(`file-content:${file.name}`);
        if (!fileContent) {
          this.notificationService.showError('File Not Found', 'Could not find the saved file content');
          this.isLoading = false;
          return;
        }

        // Check if it's JSON or XML
        if (fileContent.trim().startsWith('{')) {
          // It's JSON (sample data)
          const data = JSON.parse(fileContent);
          this.coverageStore.setCoverageData(data);
        } else {
          // It's XML
          const data = this.parserService.parseCoberturaXml(fileContent);
          if (!data) {
            throw new Error('Failed to parse coverage data');
          }
          this.coverageStore.setCoverageData(data);
        }

        this.notificationService.showSuccess('File Loaded', `Loaded ${file.name} successfully`);
      } catch (error) {
        console.error('Error loading file:', error);
        this.notificationService.showError('Error', 'Failed to load the file');
      } finally {
        this.isLoading = false;
      }
    }, 300);
  }

  deleteFile(file: RecentFile, event: Event): void {
    event.stopPropagation();

    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      try {
        // Remove from localStorage
        localStorage.removeItem(`file-content:${file.name}`);

        // Update recent files list
        const index = this.recentFiles.findIndex(f => f.name === file.name);
        if (index !== -1) {
          this.recentFiles.splice(index, 1);
        }

        // Update localStorage
        localStorage.setItem('recent-files', JSON.stringify(this.recentFiles.map(f => f.name)));

        this.notificationService.showSuccess('File Deleted', `${file.name} has been deleted`);
      } catch (error) {
        console.error('Error deleting file:', error);
        this.notificationService.showError('Error', 'Failed to delete the file');
      }
    }
  }

  clearAllFiles(): void {
    if (confirm('Are you sure you want to delete all recent files?')) {
      try {
        // Remove all files from localStorage
        this.recentFiles.forEach(file => {
          localStorage.removeItem(`file-content:${file.name}`);
        });

        // Clear the list
        this.recentFiles = [];
        localStorage.removeItem('recent-files');

        this.notificationService.showSuccess('Files Cleared', 'All recent files have been deleted');
      } catch (error) {
        console.error('Error clearing files:', error);
        this.notificationService.showError('Error', 'Failed to clear files');
      }
    }
  }

  updateSorting(field: string): void {
    if (this.sortBy === field) {
      // Toggle order
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      // Change field
      this.sortBy = field;
      // Default order for each field
      this.sortOrder = field === 'date' ? 'desc' : 'asc';
    }

    this.sortFiles();
  }

  sortFiles(): void {
    this.recentFiles.sort((a, b) => {
      if (this.sortBy === 'date') {
        return this.sortOrder === 'asc'
          ? a.date.getTime() - b.date.getTime()
          : b.date.getTime() - a.date.getTime();
      } else if (this.sortBy === 'name') {
        return this.sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (this.sortBy === 'coverage') {
        const aCoverage = a.summary?.lineCoverage ?? 0;
        const bCoverage = b.summary?.lineCoverage ?? 0;
        return this.sortOrder === 'asc'
          ? aCoverage - bCoverage
          : bCoverage - aCoverage;
      }
      return 0;
    });
  }

  formatFileSize(bytes?: number): string {
    if (!bytes) return 'Unknown';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getCoverageClass(coverage?: number): string {
    if (coverage === undefined) return '';
    if (coverage >= 80) return 'high-coverage';
    if (coverage >= 60) return 'medium-coverage';
    return 'low-coverage';
  }
}