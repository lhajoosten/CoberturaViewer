import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ToastService } from '../../../../core/services/utils/toast.service';
import { CoberturaParserService } from '../../../../core/services/parsers/cobertura-parser.service';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { FileHistoryService } from '../../services/file-history.service';
import { HistoricalFile } from '../../models/historical-file.inteface';
import { Subscription } from 'rxjs';
import { NavigationGuardService } from '../../../../core/guards/navigation.guard';

@Component({
  selector: 'app-recent-files',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './recent-files.component.html',
  styleUrls: ['./recent-files.component.scss']
})
export class RecentFilesComponent implements OnInit, OnDestroy {
  recentFiles: HistoricalFile[] = [];
  isLoading = false;
  sortBy = 'date'; // 'date', 'name', 'coverage'
  sortOrder = 'desc'; // 'asc', 'desc'
  private subscription = new Subscription();

  constructor(
    private ToastService: ToastService,
    private parserService: CoberturaParserService,
    private coverageStore: CoverageStoreService,
    private fileHistoryService: FileHistoryService,
    private router: Router,
    private navigationGuard: NavigationGuardService
  ) { }

  ngOnInit(): void {
    console.log('RecentFilesComponent initializing...');
    this.loadRecentFiles();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  loadRecentFiles(): void {
    console.log('Loading recent files...');

    // Check localStorage directly for debugging
    const filesJson = localStorage.getItem('coverage-files');
    console.log('Files in localStorage:', filesJson);

    this.subscription.add(
      this.fileHistoryService.getFiles().subscribe({
        next: (files) => {
          console.log('Received files:', files);
          this.recentFiles = files;
          this.sortFiles();
        },
        error: (error) => {
          console.error('Error getting files:', error);
          this.recentFiles = [];
        }
      })
    );
  }

  loadFile(file: HistoricalFile): void {
    // Prevent multiple loads
    if (this.isLoading || this.navigationGuard.isNavigatingTo('/visualization')) {
      console.log('Preventing duplicate file load');
      return;
    }

    this.isLoading = true;

    try {
      const fileContent = this.fileHistoryService.getFileContent(file.id);
      if (!fileContent) {
        this.ToastService.showError('File Not Found', 'Could not find the saved file content');
        this.isLoading = false;
        return;
      }

      console.log(`Retrieved content for ${file.name}, length: ${fileContent.length}`);

      // Parse the XML content
      const parsedData = this.parserService.parseCoberturaXml(fileContent);

      if (!parsedData) {
        this.ToastService.showError('Error', 'Failed to parse coverage data');
        this.isLoading = false;
        return;
      }

      // Update the store
      this.coverageStore.setCoverageData(parsedData);

      // Update timestamp and move to top of list
      const updatedFile = {
        ...file,
        date: new Date()
      };

      // Add to history (will move to top)
      this.fileHistoryService.addFile(updatedFile, fileContent);

      // Show success message
      this.ToastService.showSuccess('Success', `Loaded coverage data from ${file.name}`);

      // Prevent navigation loops
      sessionStorage.setItem('navigating_to_visualization', 'true');

      // Start navigation and prevent duplications
      this.navigationGuard.startNavigation('/visualization');

      // Navigate to visualization
      setTimeout(() => {
        this.router.navigate(['/visualization'], { replaceUrl: true });
      }, 10);

    } catch (error) {
      console.error('Error loading file:', error);
      this.ToastService.showError('Error', 'Failed to load the file');
    } finally {
      this.isLoading = false;
    }
  }

  deleteFile(file: HistoricalFile, event: Event): void {
    event.stopPropagation();

    if (confirm(`Are you sure you want to delete ${file.name}?`)) {
      try {
        // Use the service to remove the file
        this.fileHistoryService.removeFile(file.id);
        this.ToastService.showSuccess('File Deleted', `${file.name} has been deleted`);
      } catch (error) {
        console.error('Error deleting file:', error);
        this.ToastService.showError('Error', 'Failed to delete the file');
      }
    }
  }

  clearAllFiles(): void {
    if (confirm('Are you sure you want to delete all recent files?')) {
      try {
        // Use the service to clear all files
        this.fileHistoryService.clearHistory();
        this.ToastService.showSuccess('Files Cleared', 'All recent files have been deleted');
      } catch (error) {
        console.error('Error clearing files:', error);
        this.ToastService.showError('Error', 'Failed to clear files');
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
        const aTime = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
        const bTime = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();

        return this.sortOrder === 'asc'
          ? aTime - bTime
          : bTime - aTime;
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