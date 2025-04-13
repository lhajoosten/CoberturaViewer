import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterEvent } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { CoberturaParserService } from '../../../../core/services/parsers/cobertura-parser.service';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { ToastService } from '../../../../core/services/utils/toast.service';
import { HistoricalFile } from '../../models/historical-file.inteface';
import { FileHistoryService } from '../../services/file-history.service';
import { NavigationGuardService } from '../../../../core/guards/navigation.guard';
import { take } from 'rxjs';

@Component({
  selector: 'app-file-uploader',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './file-uploader.component.html',
  styleUrls: ['./file-uploader.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class FileUploaderComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isDarkTheme = false;
  isLoading = false;
  errorMessage = '';
  isDragOver = false;
  previousFiles: string[] = [];
  navigating = false;
  private routerSubscription: any;

  constructor(
    private parserService: CoberturaParserService,
    private coverageStore: CoverageStoreService,
    private ToastService: ToastService,
    private themeStore: ThemeStoreService,
    private router: Router,
    private fileHistoryService: FileHistoryService,
    private navigationGuard: NavigationGuardService

  ) {
    this.loadPreviousFiles();

    this.routerSubscription = this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationStart) {
        console.log('Navigation started to:', event.url);
        this.navigating = true;
      } else if (event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError) {
        console.log('Navigation ended or canceled');
        this.navigating = false;
      }
    });
  }

  ngOnInit(): void {
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });

    this.navigating = false;
  }

  ngOnDestroy(): void {
    // Clean up subscription
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.processFile(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    this.processFile(input.files[0]);
    // Reset the input so the same file can be selected again
    input.value = '';
  }

  processFile(file: File): void {
    if (this.isLoading || this.navigating || this.navigationGuard.isNavigatingTo('/visualization')) {
      console.log('Preventing duplicate file processing');
      return;
    }

    // Check file type
    if (!file.name.endsWith('.xml')) {
      this.errorMessage = 'Please select an XML file with Cobertura coverage data';
      this.ToastService.showError('Invalid file type', 'Please select a Cobertura XML file');
      return;
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      this.errorMessage = 'File size exceeds 10MB limit';
      this.ToastService.showError('File too large', 'The maximum file size is 10MB');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const content = e.target?.result as string;

        if (!content) {
          throw new Error('Failed to read the file content');
        }

        // Validate that it's a Cobertura XML file
        if (!content.includes('<coverage') || !content.includes('line-rate')) {
          throw new Error('Not a valid Cobertura XML file. The file must contain coverage and line-rate attributes.');
        }

        const coverageData = this.parserService.parseCoberturaXml(content);
        if (coverageData) {
          // Update coverage data
          this.coverageStore.setCoverageData(coverageData);

          // Add to file history using the service
          const historicalFile: HistoricalFile = {
            id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            name: file.name,
            date: new Date(),
            size: file.size,
            type: 'xml',
            // Include summary directly from coverageData
            summary: {
              lineCoverage: coverageData.summary.lineCoverage,
              branchCoverage: coverageData.summary.branchCoverage,
              timestamp: coverageData.summary.timestamp || new Date().toISOString()
            }
          };

          // Use the FileHistoryService to add the file
          this.fileHistoryService.addFile(historicalFile, content);

          // Update local previousFiles array for UI
          this.loadPreviousFiles();

          // Show success notification
          this.ToastService.showSuccess(
            'File Loaded Successfully',
            `Loaded coverage data with ${coverageData.summary.lineCoverage.toFixed(1)}% line coverage`
          );

          // Navigate to dashboard or visualization
          this.navigationGuard.startNavigation('/visualization');
          this.router.navigate(['/visualization'], { replaceUrl: true });

        } else {
          this.errorMessage = 'Failed to parse the Cobertura XML file';
        }
      } catch (error: any) {
        this.errorMessage = error.message || 'An error occurred while processing the file';
        this.ToastService.showError('Error', this.errorMessage);
        console.error(error);
      } finally {
        this.isLoading = false;
      }
    };

    reader.onerror = () => {
      this.errorMessage = 'Failed to read the file';
      this.ToastService.showError('File Error', 'Could not read the file');
      this.isLoading = false;
    };

    reader.readAsText(file);
  }

  loadFromHistory(fileName: string): void {
    // Debug logging
    console.log('Load file request:', {
      file: fileName,
      isLoading: this.isLoading,
      isNavigating: this.navigating || this.navigationGuard.isNavigatingTo('/visualization')
    });

    // Combine all checks
    if (this.isLoading ||
      this.navigating ||
      this.navigationGuard.isNavigatingTo('/visualization')) {
      console.log('Preventing duplicate load - navigation in progress');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Define the processFile function first before using it
    const processFile = (historyFile: HistoricalFile, content: string) => {
      try {
        // Parse XML
        const coverageData = this.parserService.parseCoberturaXml(content);
        if (!coverageData) {
          throw new Error('Failed to parse saved coverage data');
        }

        this.coverageStore.setCoverageData(coverageData);

        // Update the file timestamp
        const updatedHistoryFile = {
          ...historyFile,
          date: new Date()
        };

        // Re-add to move it to the top of the list
        this.fileHistoryService.addFile(updatedHistoryFile, content);

        this.ToastService.showSuccess(
          'Historical File Loaded',
          `Loaded ${historyFile.name} successfully`
        );

        // Set a flag in sessionStorage to track this navigation
        sessionStorage.setItem('navigating_to_visualization', 'true');

        // Navigate to visualization and prevent multiple navigations
        this.navigationGuard.startNavigation('/visualization');

        // Use setTimeout to break potential stack
        setTimeout(() => {
          this.router.navigate(['/visualization'], { replaceUrl: true });
        }, 10);
      } catch (error) {
        console.error('Error loading from history:', error);
        this.ToastService.showError('Error', 'Failed to load historical file');
      } finally {
        this.isLoading = false;
      }
    };

    // Find the file in our history - Use take(1) to automatically complete the subscription
    this.fileHistoryService.getFiles()
      .pipe(take(1)) // <-- This is important! It ensures the subscription completes after first emission
      .subscribe({
        next: (files) => {
          console.log('Files received:', files);
          const historyFile = files.find(f => f.name === fileName);

          if (!historyFile) {
            console.error(`File "${fileName}" not found in history:`, files);
            this.ToastService.showError('File Not Found', 'Could not find the saved file');
            this.isLoading = false;
            return;
          }

          console.log('Found file in history:', historyFile);

          // Get content
          const content = this.fileHistoryService.getFileContent(historyFile.id);
          if (!content) {
            console.error(`Content not found for file ID: ${historyFile.id}`);
            this.ToastService.showError('File Not Found', 'Could not find the saved file content');
            this.isLoading = false;
            return;
          }

          processFile(historyFile, content);
        },
        error: (err) => {
          console.error('Error getting files:', err);
          this.ToastService.showError('Error', 'Failed to retrieve file history');
          this.isLoading = false;
        }
      });
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearRecentFiles(): void {
    if (confirm('Are you sure you want to clear your recent files history?')) {
      // Use the service to clear history
      this.fileHistoryService.clearHistory();

      // Update local state
      this.previousFiles = [];

      this.ToastService.showInfo('History Cleared', 'Your recent files history has been cleared');
    }
  }

  truncateFilename(filename: string): string {
    const maxLength = 20;
    if (filename.length <= maxLength) {
      return filename;
    }

    const extension = filename.split('.').pop() || '';
    const name = filename.substring(0, filename.length - extension.length - 1);

    // Keep the extension and truncate the name
    const truncatedName = name.substring(0, maxLength - extension.length - 3) + '...';
    return truncatedName + '.' + extension;
  }

  private loadPreviousFiles(): void {
    this.fileHistoryService.getFiles().subscribe(files => {
      // Get just the filenames for the recent files list in the UI
      this.previousFiles = files.slice(0, 5).map(file => file.name);
    });
  }
}