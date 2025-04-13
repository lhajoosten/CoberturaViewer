import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../core/services/store/coverage-store.service';
import { Router, RouterModule } from '@angular/router';
import { FileHistoryService } from '../file-upload/services/file-history.service';
import { Observable, Subscription } from 'rxjs';
import { HistoricalFile } from '../file-upload/models/historical-file.inteface';
import { ToastService } from '../../core/services/utils/toast.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, RouterModule],
  standalone: true,
})
export class DashboardComponent implements OnInit, OnDestroy {
  hasData = false;
  recentFiles: HistoricalFile[] = [];
  private subscription = new Subscription();

  constructor(
    private coverageStore: CoverageStoreService,
    private router: Router,
    private fileHistoryService: FileHistoryService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Check if there's data in the store
    this.subscription.add(
      this.coverageStore.getCoverageData().subscribe(data => {
        this.hasData = !!data;
      })
    );

    // Subscribe to recent files
    this.subscription.add(
      this.fileHistoryService.getFiles().subscribe(files => {
        this.recentFiles = files.slice(0, 5); // Get only the 5 most recent files
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  navigateToUpload(): void {
    this.router.navigate(['/upload']);
  }

  loadFile(file: HistoricalFile): void {
    console.log(`Loading file: ${file.name}`);

    // Get the file content
    const content = this.fileHistoryService.getFileContent(file.name);

    if (!content) {
      this.toastService.showError('Error', 'Could not load file content');
      return;
    }

    // Parse and load the file into the coverage store
    try {
      if (file.type === 'xml') {
        this.coverageStore.loadXmlData(file.name, content);
        this.toastService.showSuccess('Success', `Loaded coverage data from ${file.name}`);
        this.router.navigate(['/visualization']);
      } else {
        this.toastService.showError('Unsupported Format', 'Only XML files are supported at this time');
      }
    } catch (error) {
      console.error('Error loading file:', error);
      this.toastService.showError('Error', 'Failed to load coverage data');
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  }
}