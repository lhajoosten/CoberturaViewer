import { Component, OnInit } from '@angular/core';
import { ThemeStoreService } from '../../services/store/theme-store.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../side-bar/side-bar.component';
import { FooterComponent } from '../footer/footer.component';

@Component({
  selector: 'app-main-layout',
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.scss'],
  imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, FooterComponent],
  standalone: true
})
export class MainLayoutComponent implements OnInit {
  isDarkTheme = false;
  isSidebarCollapsed = false;

  constructor(private themeStore: ThemeStoreService) { }

  ngOnInit(): void {
    this.themeStore.isDarkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
}