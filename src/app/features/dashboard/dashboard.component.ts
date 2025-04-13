import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../core/services/store/coverage-store.service';
import { NavigationStart, Router, RouterModule } from '@angular/router';
import { FileHistoryService } from '../file-upload/services/file-history.service';
import { Observable, Subscription } from 'rxjs';
import { HistoricalFile } from '../file-upload/models/historical-file.inteface';
import { ToastService } from '../../core/services/utils/toast.service';
import { CoberturaParserService } from '../../core/services/parsers/cobertura-parser.service';
import { NavigationGuardService } from '../../core/guards/navigation.guard';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, RouterModule],
  standalone: true,
})
export class DashboardComponent implements OnInit, OnDestroy {
  hasData = false;
  isLoading = false;
  recentFiles: HistoricalFile[] = [];
  private subscription = new Subscription();
  private lastClickTime = 0;
  private readonly CLICK_DEBOUNCE_TIME = 1000;

  constructor(
    private coverageStore: CoverageStoreService,
    private router: Router,
    private fileHistoryService: FileHistoryService,
    private toastService: ToastService,
    private coberturaParser: CoberturaParserService,
    private navigationGuard: NavigationGuardService
  ) {

    // Listen for navigation events to debug
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        console.log('Navigation started to:', event.url);
      }
    });
  }

  ngOnInit(): void {
    console.log('Dashboard initializing...');

    // Check if there's data in the store
    this.subscription.add(
      this.coverageStore.getCoverageData().subscribe(data => {
        this.hasData = !!data;
      })
    );

    // Subscribe to recent files
    console.log('Subscribing to file history...');
    this.subscription.add(
      this.fileHistoryService.getFiles().subscribe(files => {
        console.log('Received recent files:', files);
        this.recentFiles = files;
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
    // Debug loading
    console.log('Load file request:', file.name, file.id);

    // Multiple checks
    if (
      this.isLoading ||
      this.navigationGuard.isNavigatingTo('/visualization') ||
      Date.now() - this.lastClickTime < this.CLICK_DEBOUNCE_TIME
    ) {
      console.log('Prevented duplicate file load');
      return;
    }

    this.lastClickTime = Date.now();
    this.isLoading = true;

    try {
      // First, check if we can get content
      const content = this.fileHistoryService.getFileContent(file.id);

      if (!content) {
        this.toastService.showError('Error', 'Could not load file content');
        this.isLoading = false;
        return;
      }

      console.log(`Retrieved content for ${file.name}, length: ${content.length}`);

      // Parse the XML content
      const parsedData = this.coberturaParser.parseCoberturaXml(content);

      if (!parsedData) {
        this.toastService.showError('Error', 'Failed to parse coverage data');
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
      this.fileHistoryService.addFile(updatedFile, content);

      // Show success message
      this.toastService.showSuccess('Success', `Loaded coverage data from ${file.name}`);

      // Start navigation and prevent duplications
      this.navigationGuard.startNavigation('/visualization');

      // Use a short timeout before navigating
      setTimeout(() => {
        this.router.navigate(['/visualization'], { replaceUrl: true });
      }, 10);

    } catch (error) {
      console.error('Error loading file:', error);
      this.toastService.showError('Error', 'Failed to load coverage data');
    } finally {
      this.isLoading = false;
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

  loadRecentFiles(): void {
    console.log('Manually loading recent files...');
    this.fileHistoryService.getFiles().subscribe(files => {
      console.log('Received recent files:', files);
      this.recentFiles = files;
    });
  }
}