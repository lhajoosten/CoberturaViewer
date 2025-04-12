import { Component, Output, EventEmitter, OnInit, HostListener, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ThemeStoreService } from '../../services/store/theme-store.service';
import { ModalService } from '../../services/utils/modal.service';
import { ExportService } from '../../services/utils/export.service';
import { CoverageStoreService } from '../../services/store/coverage-store.service';
import { FileUploaderComponent } from '../../../features/file-upload/components/file-uploader/file-uploader.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DynamicSettingsComponent } from '../../../shared/ui/dynamic-settings.component';

interface Notification {
  id: string;
  title: string;
  message: string;
  time: Date;
  read: boolean;
  icon: string;
}

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
  showNotifications = false;
  hasActiveReport = false;

  searchControl = new FormControl('');

  // For export options
  exportFileName = 'coverage-report';
  selectedExportFormat = 'png';
  exportFormats = [
    { value: 'png', label: 'PNG Image', icon: 'fa-file-image' },
    { value: 'svg', label: 'SVG Vector', icon: 'fa-bezier-curve' },
    { value: 'pdf', label: 'PDF Document', icon: 'fa-file-pdf' },
    { value: 'csv', label: 'CSV Data', icon: 'fa-file-csv' }
  ];

  // Sample notifications
  notifications: Notification[] = [
    {
      id: '1',
      title: 'Coverage report ready',
      message: 'Your latest coverage report has been processed and is ready to view.',
      time: new Date(),
      read: false,
      icon: 'fas fa-chart-pie'
    },
    {
      id: '2',
      title: 'New version available',
      message: 'Coverage Explorer v2.0.0 has been released with new features.',
      time: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: true,
      icon: 'fas fa-sync'
    }
  ];

  get notificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  constructor(
    private themeStore: ThemeStoreService,
    public modalService: ModalService,
    private exportService: ExportService,
    private coverageStore: CoverageStoreService
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
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkScreenSize();
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent): void {
    // Close menus when clicking outside
    const userMenuElement = document.querySelector('.user-profile');
    const notificationsElement = document.querySelector('.notification-container');
    const notificationsPanelElement = document.querySelector('.notifications-panel');

    if (!userMenuElement?.contains(event.target as Node)) {
      this.isUserMenuOpen = false;
    }

    if (!notificationsElement?.contains(event.target as Node) &&
      !notificationsPanelElement?.contains(event.target as Node)) {
      this.showNotifications = false;
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
    this.showNotifications = false;
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
      this.modalService.openTemplate(this.exportOptionsTemplate, {}, {
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
    // Get the main chart element
    const chartElement = document.querySelector('.coverage-chart-container') as HTMLElement;

    if (!chartElement) {
      console.error('Chart element not found for export');
      return;
    }

    // Export based on selected format
    switch (this.selectedExportFormat) {
      case 'png':
        this.exportService.exportChartAsPng(chartElement, this.exportFileName);
        break;
      case 'svg':
        this.exportService.exportChartAsSvg(chartElement, this.exportFileName);
        break;
      case 'pdf':
        this.exportService.exportChartAsPdf(chartElement, this.exportFileName);
        break;
      case 'csv':
        // For CSV export we need to prepare data in the right format
        // Get the data from the coverage store
        const coverageData = this.coverageStore.getCurrentCoverageData();
        if (coverageData) {
          // Transform data to 2D array for CSV export
          const csvData = this.prepareCsvData(coverageData);
          this.exportService.exportDataAsCsv(csvData, this.exportFileName);
        }
        break;
    }

    // Close the modal
    const modals = document.querySelectorAll('.export-modal');
    if (modals.length > 0) {
      this.modalService.close((modals[0] as any).id);
    }
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
   * Placeholder for login functionality
   */
  login(): void {
    this.isUserMenuOpen = false;
    alert('Authentication will be implemented in a future version');
  }
}