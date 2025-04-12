import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { ThemeStoreService } from "../../core/services/store/theme-store.service";

@Component({
    selector: 'app-dynamic-settings',
    template: `
    <div class="settings-content">
      <h2>Application Settings</h2>
      
      <div class="settings-group">
        <h3>Display Settings</h3>
        <div class="setting-item">
          <label>
            <input type="checkbox" [checked]="isDarkTheme" (change)="toggleTheme()">
            Dark Mode
          </label>
        </div>
      </div>
      
      <div class="settings-group">
        <h3>Report Settings</h3>
        <p class="settings-message">More settings will be available in future updates.</p>
      </div>
    </div>
  `,
    styles: [`
    .settings-content {
      padding: 1rem;
    }
    .settings-group {
      margin-bottom: 1.5rem;
    }
    .setting-item {
      margin: 0.75rem 0;
    }
    .settings-message {
      color: var(--color-text-secondary);
      font-style: italic;
      font-size: 0.9rem;
    }
  `],
    standalone: true,
    imports: [CommonModule]
})
export class DynamicSettingsComponent {
    isDarkTheme = false;

    constructor(private themeStore: ThemeStoreService) {
        this.themeStore.isDarkTheme$.subscribe(isDark => {
            this.isDarkTheme = isDark;
        });
    }

    toggleTheme(): void {
        this.themeStore.toggleTheme();
    }
}