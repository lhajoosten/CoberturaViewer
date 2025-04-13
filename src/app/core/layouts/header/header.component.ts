import { Component, Output, EventEmitter, OnInit, HostListener, ViewChild, TemplateRef, inject, Inject } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThemeStoreService } from '../../services/store/theme-store.service';
import { ModalRef, ModalService } from '../../services/utils/modal.service';
import { ExportService } from '../../services/utils/export.service';
import { CoverageStoreService } from '../../services/store/coverage-store.service';
import { FileUploaderComponent } from '../../../features/file-upload/components/file-uploader/file-uploader.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';
import { User } from '../../auth/models/user.interface';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../../services/utils/toast.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, FileUploaderComponent],
  standalone: true
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  @Output() searchEvent = new EventEmitter<string>();

  @ViewChild('fileUploaderTemplate') fileUploaderTemplate!: TemplateRef<any>;
  @ViewChild('exportOptionsTemplate') exportOptionsTemplate!: TemplateRef<any>;
  @ViewChild('settingsTemplate') settingsTemplate!: TemplateRef<any>; // Add this
  @ViewChild('keyboardShortcutsTemplate') keyboardShortcutsTemplate!: TemplateRef<any>; // Add this
  @ViewChild('helpTemplate') helpTemplate!: TemplateRef<any>; // Add this

  isDarkTheme = false;
  isMobileView = false;
  isSearchActive = false;
  isUserMenuOpen = false;
  hasActiveReport = false;

  searchControl = new FormControl('');

  // For export options
  exportFileName = 'coverage-report';
  selectedExportFormat = 'png';
  exportFormats = [
    {
      value: 'png',
      label: 'PNG Image',
      icon: 'fa-file-image',
      description: 'Best for sharing and presentations'
    },
    {
      value: 'svg',
      label: 'SVG Vector',
      icon: 'fa-bezier-curve',
      description: 'Scalable vector format for editing'
    },
    {
      value: 'pdf',
      label: 'PDF Document',
      icon: 'fa-file-pdf',
      description: 'Document format for printing'
    },
    {
      value: 'csv',
      label: 'CSV Data',
      icon: 'fa-file-csv',
      description: 'Raw data for spreadsheets and analysis'
    }
  ];

  currentUser: User | null = null;
  protected exportModalRef: ModalRef | null = null;

  constructor(
    private themeStore: ThemeStoreService,
    public modalService: ModalService,
    private exportService: ExportService,
    private coverageStore: CoverageStoreService,
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    @Inject(DOCUMENT) private document: Document
  ) { }

  ngOnInit(): void {
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });

    this.searchControl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.searchEvent.emit(value || '');
    });

    this.checkScreenSize();

    // Check if coverage data exists to enable export button
    this.coverageStore.getCoverageData().subscribe(data => {
      this.hasActiveReport = !!data;
    });

    // Subscribe to auth changes
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    // Close menus when clicking outside
    const userMenuElement = document.querySelector('.user-profile');

    if (!userMenuElement?.contains(event.target as Node)) {
      this.isUserMenuOpen = false;
    }
  }

  get exportIcon(): string {
    switch (this.selectedExportFormat) {
      case 'png': return 'fa-file-image';
      case 'svg': return 'fa-bezier-curve';
      case 'pdf': return 'fa-file-pdf';
      case 'csv': return 'fa-file-csv';
      default: return 'fa-download';
    }
  }

  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }

  toggleTheme(): void {
    this.themeStore.toggleTheme();
  }

  checkScreenSize(): void {
    this.isMobileView = window.innerWidth < 768;
  }

  onSearchFocus(): void {
    if (this.isMobileView) {
      this.isSearchActive = true;
    }
  }

  onSearchBlur(): void {
    if (this.isMobileView && !this.searchControl.value) {
      this.isSearchActive = false;
    }
  }

  closeSearch(): void {
    this.isSearchActive = false;
    this.searchControl.setValue('');
  }

  toggleUserMenu(): void {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return 'Guest User';

    return this.currentUser.name ||
      (this.currentUser.login ? `@${this.currentUser.login}` : 'GitHub User');
  }

  // Add a method to get the user's avatar
  getUserAvatar(): string {
    if (!this.currentUser || !this.currentUser.avatar) {
      return 'assets/images/default-avatar.png';
    }
    return this.currentUser.avatar;
  }

  /**
   * Open file upload modal instead of navigating to route
   */
  onImportFile(): void {
    this.modalService.openTemplate(this.fileUploaderTemplate, {}, {
      title: 'Import Coverage Report',
      width: '750px',
      height: 'auto',
      cssClass: 'file-uploader-modal',
      closeOnOutsideClick: false
    });
  }

  /**
   * Open export options modal
   */
  onExportReport(): void {
    if (this.hasActiveReport) {
      // Store the reference when opening the modal
      this.exportModalRef = this.modalService.openTemplate(this.exportOptionsTemplate, {}, {
        title: 'Export Report',
        width: '500px',
        cssClass: 'export-modal'
      });
    }
  }

  /**
 * Export report in selected format
 */
  exportReport(): void {
    // First try to find the visualization container component's active chart
    let chartElement: HTMLElement | null = this.findVisualizationChartElement();

    // If not found, try the legacy selector
    if (!chartElement) {
      chartElement = this.document.querySelector('.coverage-chart-container') as HTMLElement;
    }

    if (!chartElement) {
      this.toastService.showError('Error', 'No chart found to export.');
      if (this.exportModalRef) {
        this.exportModalRef.close();
      }
      return;
    }

    // Set exporting state
    const exportingIndicator = this.document.createElement('div');
    exportingIndicator.className = 'exporting-indicator';
    exportingIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
    this.document.body.appendChild(exportingIndicator);

    try {
      let exportPromise: Promise<void>;

      switch (this.selectedExportFormat) {
        case 'png':
          exportPromise = this.exportService.exportChartAsPng(chartElement, this.exportFileName);
          break;
        case 'svg':
          exportPromise = this.exportService.exportChartAsSvg(chartElement, this.exportFileName);
          break;
        case 'pdf':
          exportPromise = this.exportService.exportChartAsPdf(chartElement, this.exportFileName);
          break;
        case 'csv':
          const csvData = this.getExportData() || this.prepareCsvData(this.coverageStore.getCurrentCoverageData());
          exportPromise = this.exportService.exportDataAsCsv(csvData, this.exportFileName);
          break;
        default:
          this.toastService.showError('Error', 'Unknown export format selected.');
          throw new Error('Unknown export format');
      }

      // Handle promise completion
      exportPromise
        .then(() => {
          // Success - handled in the export service
        })
        .catch(error => {
          console.error('Export failed:', error);
        })
        .finally(() => {
          // Remove exporting indicator
          if (exportingIndicator.parentNode) {
            exportingIndicator.parentNode.removeChild(exportingIndicator);
          }

          // Close modal
          if (this.exportModalRef) {
            this.exportModalRef.close();
          }
        });

    } catch (error) {
      this.toastService.showError('Error', `Failed to export the report. ${error}`);
      // Remove exporting indicator and close modal on error
      if (exportingIndicator.parentNode) {
        exportingIndicator.parentNode.removeChild(exportingIndicator);
      }
      if (this.exportModalRef) {
        this.exportModalRef.close();
      }
    }
  }

  /**
   * Find the current active chart element in the visualization container
   */
  private findVisualizationChartElement(): HTMLElement | null {
    try {
      // Try to find visualization container
      const visualizationContainer = this.document.querySelector('app-visualization-container');
      if (!visualizationContainer) {
        return null;
      }

      // Look for google-chart element first (most common)
      const googleChart = visualizationContainer.querySelector('google-chart');
      if (googleChart) {
        return googleChart as HTMLElement;
      }

      // Find active chart container based on common CSS class patterns
      const chartContainers = [
        '.chart-container .active', // If using active class for current view
        '.treemap-container',
        '.sunburst-container',
        '.heatmap-container',
        '.pie-container',
        '.coverage-table-container'
      ];

      // Try each potential selector
      for (const selector of chartContainers) {
        const element = visualizationContainer.querySelector(selector);
        if (element) {
          return element as HTMLElement;
        }
      }

      // Last resort: try to find any chart-related container
      const anyChartContainer = visualizationContainer.querySelector('[class*="-container"]');
      if (anyChartContainer) {
        return anyChartContainer as HTMLElement;
      }

      return null;
    } catch (error) {
      console.error('Error finding chart element:', error);
      return null;
    }
  }

  /**
   * Get export data from visualization container if possible
   */
  private getExportData(): any[][] | null {
    // Try to access the active chart data from the visualization container
    const visualizationContainer = this.document.querySelector('app-visualization-container') as any;
    if (visualizationContainer && visualizationContainer.getExportData) {
      try {
        return visualizationContainer.getExportData();
      } catch (e) {
        console.error('Error getting export data from visualization container:', e);
      }
    }

    return null;
  }

  /**
   * Prepare coverage data for CSV export
   */
  private prepareCsvData(coverageData: any): any[][] {
    // Headers
    const csvData: any[][] = [
      ['Package', 'Class', 'Line Coverage', 'Branch Coverage', 'Method Coverage']
    ];

    // Add data rows
    if (coverageData.packages) {
      coverageData.packages.forEach((pkg: any) => {
        pkg.classes.forEach((cls: any) => {
          csvData.push([
            pkg.name,
            cls.name,
            cls.lineCoverage.toFixed(2) + '%',
            cls.branchCoverage.toFixed(2) + '%',
            cls.methodCoverage.toFixed(2) + '%'
          ]);
        });
      });
    }

    return csvData;
  }

  /**
    * Opens the settings modal using the predefined template
    */
  openSettings(): void {
    this.isUserMenuOpen = false;
    this.modalService.openSettingsModal();
  }

  /**
   * Opens the keyboard shortcuts modal using the predefined template
   */
  openKeyboardShortcuts(): void {
    this.isUserMenuOpen = false;
    this.modalService.openKeyboardShortcutsModal();
  }

  /**
   * Opens the help modal using the predefined template
   */
  openHelp(): void {
    this.isUserMenuOpen = false;
    this.modalService.openHelpModal();
  }

  /**
   * Login functionality
   */
  login(): void {
    this.isUserMenuOpen = false;
    this.router.navigate(['/login']);
  }

  /**
   * Logout functionality
   */
  logout(): void {
    this.isUserMenuOpen = false;
    this.authService.logout();
  }

  /**
   * User profile functionality
   */
  goToProfile(): void {
    this.isUserMenuOpen = false;
    this.router.navigate(['/user/profile']);
  }
}