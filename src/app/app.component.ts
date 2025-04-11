// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { ThemeStoreService } from './core/services/store/theme-store.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div [class.dark-theme]="isDarkTheme">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }
  `]
})
export class AppComponent implements OnInit {
  isDarkTheme = false;

  constructor(private themeStore: ThemeStoreService) { }

  ngOnInit(): void {
    this.themeStore.isDarkTheme$.subscribe((isDark) => {
      this.isDarkTheme = isDark;
    });
  }
}