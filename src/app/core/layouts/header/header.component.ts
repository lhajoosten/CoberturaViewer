import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { ThemeStoreService } from '../../services/store/theme-store.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  imports: [CommonModule],
  standalone: true
})
export class HeaderComponent implements OnInit {
  @Output() toggleSidebarEvent = new EventEmitter<void>();
  isDarkTheme = false;

  constructor(private themeStore: ThemeStoreService) { }

  ngOnInit(): void {
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
  }

  toggleSidebar(): void {
    this.toggleSidebarEvent.emit();
  }

  toggleTheme(): void {
    this.themeStore.toggleTheme();
  }
}