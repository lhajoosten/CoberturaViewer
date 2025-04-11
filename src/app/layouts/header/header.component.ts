import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ThemeService } from '../../services/utils/theme.service'; // Adjust path as needed
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {
  isDarkTheme = false;
  private themeSubscription: Subscription | null = null;

  isScrolled = false;
  reportsLoaded = 0;
  isMobileMenuOpen = false;

  constructor(
    private themeService: ThemeService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });

    // Listen for scroll events to add scrolled class
    window.addEventListener('scroll', this.checkScroll.bind(this));
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    window.removeEventListener('scroll', this.checkScroll.bind(this));
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  startComparison(): void {
    this.router.navigate(['/compare']);
  }

  checkScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  openSettings() {
    // Implement settings dialog open logic
    console.log('Opening settings');
  }
}