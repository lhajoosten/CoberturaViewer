import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStoreService } from './core/services/store/theme-store.service';
import { LayoutModule } from './core/layouts/layout.module';
import { GoogleChartsModule } from 'angular-google-charts';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LayoutModule, GoogleChartsModule],
  template: `<app-main-layout></app-main-layout>`,
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