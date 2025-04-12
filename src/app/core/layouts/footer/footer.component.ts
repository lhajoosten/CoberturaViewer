import { Component, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService, ModalRef } from '../../services/utils/modal.service';
import { LoadingService } from '../../services/utils/loading.service';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss'],
  imports: [CommonModule],
  standalone: true,
})
export class FooterComponent {
  @ViewChild('aboutModalTemplate') aboutModalTemplate!: TemplateRef<any>;
  @ViewChild('keyboardShortcutsTemplate') keyboardShortcutsTemplate!: TemplateRef<any>;
  @ViewChild('helpModalTemplate') helpModalTemplate!: TemplateRef<any>;
  @ViewChild('changelogTemplate') changelogTemplate!: TemplateRef<any>;

  currentYear = new Date().getFullYear();
  currentVersion = '2.0.0';
  previousVersion = '1.3.0';

  constructor(
    private modalService: ModalService,
    private loadingService: LoadingService
  ) { }

  /**
   * Opens the About modal dialog
   */
  openAboutModal(): void {
    this.modalService.openAboutModal();
  }

  /**
   * Opens the Keyboard Shortcuts modal dialog
   */
  openKeyboardShortcutsModal(): void {
    this.modalService.openKeyboardShortcutsModal();
  }

  /**
   * Opens the Help modal dialog
   */
  openHelpModal(): void {
    this.modalService.openHelpModal();
  }

  /**
   * Opens the Changelog modal dialog showing what's new in the current version
   */
  openChangelogModal(): void {
    this.modalService.openChangelogModal();
  }

  /**
   * Simulates loading documentation resources
   * This is an example of using the loading service
   */
  loadDocumentation(): void {
    this.loadingService.show('Loading documentation...');

    // Simulate API call with timeout
    setTimeout(() => {
      this.loadingService.hide();
      // After loading, show documentation
      this.openHelpModal();
    }, 1000);
  }
}