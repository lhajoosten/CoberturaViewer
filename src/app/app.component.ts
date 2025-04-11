import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';
import { ThemeService } from './services/utils/theme.service';
import { Subscription } from 'rxjs';
import { NotificationService } from './services/utils/notification.service';
import { FileUploaderComponent } from './components/file-uploader/file-uploader.component';
import { HeaderComponent } from './layouts/header/header.component';
import { FooterComponent } from './layouts/footer/footer.component';
import { ModalService, ModalType } from './services/utils/modal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, FileUploaderComponent, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  isDarkTheme = false;
  activeModal: ModalType = null;
  private themeSubscription: Subscription | null = null;
  private modalSubscription: Subscription | null = null;

  // Keyboard mappings for app-level shortcuts
  keyboardShortcuts: { [key: string]: string } = {
    'u': 'upload',
    '?': 'help'
  };

  constructor(
    private themeService: ThemeService,
    private router: Router,
    private notificationService: NotificationService,
    private modalService: ModalService
  ) { }

  ngOnInit(): void {
    this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
      // Apply theme to body for global styles/modal overlays
      if (isDark) {
        document.body.classList.add('dark-theme');
      } else {
        document.body.classList.remove('dark-theme');
      }
    });

    // Subscribe to modal service changes
    this.modalSubscription = this.modalService.activeModal$.subscribe(modal => {
      this.activeModal = modal;
    });
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    if (this.modalSubscription) {
      this.modalSubscription.unsubscribe();
    }
    document.body.classList.remove('dark-theme'); // Clean up body class
  }

  /**
  * Handle keyboard shortcuts (global app shortcuts only)
  */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ignore shortcuts when inside inputs or textareas
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = event.key.toLowerCase();

    if (this.keyboardShortcuts[key]) {
      const action = this.keyboardShortcuts[key];

      switch (action) {
        case 'upload':
          this.modalService.openUploadModal();
          break;
        case 'help':
          this.modalService.openHelpModal();
          break;
      }
      // Prevent default browser behavior (e.g., '/' for search)
      if (key === '?') {
        event.preventDefault();
      }
    }
  }

  /**
   * Handle upload completion
   */
  onUploadComplete(): void {
    this.modalService.closeModal();
    this.notificationService.showSuccess('Upload Complete', 'New coverage data has been loaded');
    this.router.navigate(['/dashboard']);
  }

  /**
   * Close active modal
   */
  closeModal(): void {
    this.modalService.closeModal();
  }

  /**
   * Get keyboard shortcuts array for display
   */
  getKeyboardShortcutsArray(): { key: string, description: string }[] {
    return [
      { key: 'T', description: 'Switch to Treemap view' },
      { key: 'S', description: 'Switch to Sunburst view' },
      { key: 'H', description: 'Switch to History view' },
      { key: 'I', description: 'Switch to Insights view' },
      { key: 'U', description: 'Upload new coverage data' },
      { key: '?', description: 'Show help information' },
      { key: 'ESC', description: 'Close current modal' }
    ];
  }
}