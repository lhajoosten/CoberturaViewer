import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../services/utils/modal.service';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../services/utils/theme.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit, OnDestroy {
  isDarkTheme = false;
  private themeSubscription: Subscription | null = null;

  @Input() statusMessage: string | null = null;
  @Input() statusType: 'success' | 'warning' | 'error' | 'info' = 'info';

  version = 'v1.2.0';
  lastUpdated: Date | null = null;

  constructor(
    private modalService: ModalService,
    private themeService: ThemeService
  ) { }

  get statusIcon(): string {
    switch (this.statusType) {
      case 'success': return 'fa-check-circle';
      case 'warning': return 'fa-exclamation-triangle';
      case 'error': return 'fa-times-circle';
      default: return 'fa-info-circle';
    }
  }

  ngOnInit() {
    this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });

    this.lastUpdated = new Date();
  }

  ngOnDestroy() {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  showAboutModal() {
    this.modalService.openAboutModal();
  }

  showHelpModal() {
    this.modalService.openHelpModal();
  }

  showKeyboardShortcuts() {
    this.modalService.openKeyboardShortcutsModal();
  }
}