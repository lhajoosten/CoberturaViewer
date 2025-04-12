import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeStoreService } from '../../../core/services/store/theme-store.service';

@Component({
  selector: 'app-settings-template',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-content">
      <div class="settings-group">
        <h3>Display Settings</h3>
        <div class="setting-item">
          <label class="toggle-switch">
            <input type="checkbox" [checked]="isDarkTheme" (change)="toggleTheme()">
            <span class="toggle-slider"></span>
            Dark Mode
          </label>
        </div>
      </div>
      
      <div class="settings-group">
        <h3>Coverage Report Settings</h3>
        <div class="setting-item">
          <label for="threshold-high">High Coverage Threshold (%)</label>
          <input type="number" id="threshold-high" min="0" max="100" [(ngModel)]="highThreshold">
        </div>
        <div class="setting-item">
          <label for="threshold-low">Low Coverage Threshold (%)</label>
          <input type="number" id="threshold-low" min="0" max="100" [(ngModel)]="lowThreshold">
        </div>
      </div>
      
      <div class="settings-group">
        <h3>Application Preferences</h3>
        <div class="setting-item">
          <label class="toggle-switch">
            <input type="checkbox" [(ngModel)]="autoRefresh">
            <span class="toggle-slider"></span>
            Auto-refresh on file changes
          </label>
        </div>
        <div class="setting-item">
          <label class="toggle-switch">
            <input type="checkbox" [(ngModel)]="showLineNumbers">
            <span class="toggle-slider"></span>
            Show line numbers in code view
          </label>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./settings-template.component.scss']
})
export class SettingsTemplateComponent {
  isDarkTheme = false;
  highThreshold = 80;
  lowThreshold = 50;
  autoRefresh = true;
  showLineNumbers = true;

  constructor(private themeStore: ThemeStoreService) {
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
  }

  toggleTheme(): void {
    this.themeStore.toggleTheme();
  }
}