import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { CoberturaParserService } from '../../../../core/services/parsers/cobertura-parser.service';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { ToastService } from '../../../../core/services/utils/toast.service';

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
export class FileUploaderComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  isDarkTheme = false;
  isLoading = false;
  errorMessage = '';
  isDragOver = false;
  previousFiles: string[] = [];

  constructor(
    private parserService: CoberturaParserService,
    private coverageStore: CoverageStoreService,
    private ToastService: ToastService,
    private themeStore: ThemeStoreService,
    private router: Router
  ) {
    this.loadPreviousFiles();
  }

  ngOnInit(): void {
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
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

        // Save file to history
        this.addToRecentFiles(file.name, content);

        // Validate that it's a Cobertura XML file
        if (!content.includes('<coverage') || !content.includes('line-rate')) {
          throw new Error('Not a valid Cobertura XML file. The file must contain coverage and line-rate attributes.');
        }

        const coverageData = this.parserService.parseCoberturaXml(content);
        if (coverageData) {
          // Update coverage data
          this.coverageStore.setCoverageData(coverageData);

          // Show success notification
          this.ToastService.showSuccess(
            'File Loaded Successfully',
            `Loaded coverage data with ${coverageData.summary.lineCoverage.toFixed(1)}% line coverage`
          );

          // Navigate to dashboard or visualization
          this.router.navigate(['/visualization']);
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
    this.isLoading = true;
    this.errorMessage = '';

    // Get the saved file content from localStorage
    setTimeout(() => {
      try {
        const fileContent = localStorage.getItem(`file-content:${fileName}`);
        if (!fileContent) {
          this.ToastService.showError('File Not Found', 'Could not find the saved file content');
          this.isLoading = false;
          return;
        }

        // It's XML
        const coverageData = this.parserService.parseCoberturaXml(fileContent);
        if (!coverageData) {
          throw new Error('Failed to parse saved coverage data');
        }
        this.coverageStore.setCoverageData(coverageData);

        this.ToastService.showSuccess(
          'Historical File Loaded',
          `Loaded ${fileName} successfully`
        );

        // Move this file to the top of recent files
        this.addToRecentFiles(fileName);

        // Navigate to visualization
        this.router.navigate(['/visualization']);
      } catch (error) {
        console.error('Error loading from history:', error);
        this.ToastService.showError('Error', 'Failed to load historical file');
      } finally {
        this.isLoading = false;
      }
    }, 600);
  }

  clearError(): void {
    this.errorMessage = '';
  }

  clearRecentFiles(): void {
    if (confirm('Are you sure you want to clear your recent files history?')) {
      // Clear files from localStorage
      this.previousFiles.forEach(file => {
        localStorage.removeItem(`file-content:${file}`);
      });

      localStorage.removeItem('recent-files');
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
    try {
      const files = localStorage.getItem('recent-files');
      if (files) {
        this.previousFiles = JSON.parse(files);
      }
    } catch (error) {
      console.error('Error loading previous files:', error);
      this.previousFiles = [];
    }
  }

  private addToRecentFiles(fileName: string, content?: string): void {
    // Remove the file if it already exists to avoid duplicates
    const existingIndex = this.previousFiles.indexOf(fileName);
    if (existingIndex !== -1) {
      this.previousFiles.splice(existingIndex, 1);
    }

    // Add to beginning of array
    this.previousFiles.unshift(fileName);

    // Keep only the last 5 files
    if (this.previousFiles.length > 5) {
      // Remove the last file content from localStorage
      const removedFile = this.previousFiles.pop();
      if (removedFile) {
        localStorage.removeItem(`file-content:${removedFile}`);
      }
    }

    // Save to localStorage
    localStorage.setItem('recent-files', JSON.stringify(this.previousFiles));

    // Save file content if provided
    if (content) {
      localStorage.setItem(`file-content:${fileName}`, content);
    }
  }
}