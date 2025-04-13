import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { User, UserPreferences } from '../../models/user.interface';
import { ToastService } from '../../../../core/services/utils/toast.service';
import { ThemeStoreService } from '../../../../core/services/store/theme-store.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  appLoginDate = new Date();
  loading = false;
  editingProfile = false;
  accountAge = '';

  preferences: UserPreferences = {
    emailNotifications: true,
    autoSaveReports: true,
    darkMode: false,
    language: 'en',
    dashboardLayout: 'comfortable'
  };

  languages = [
    { code: 'en', name: 'English' },
    // { code: 'es', name: 'Español' },
    // { code: 'fr', name: 'Français' },
    // { code: 'de', name: 'Deutsch' }
  ];

  layouts = [
    { value: 'compact', label: 'Compact' },
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService,
    private themeService: ThemeStoreService
  ) { }

  ngOnInit(): void {
    // Check if user is logged in
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = this.authService.getCurrentUser();

    // Load preferences from localStorage
    this.loadPreferences();

    // Set dark mode from preferences
    this.themeService.isDarkTheme$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isDark => {
      this.preferences.darkMode = isDark;
    });

    // Calculate account age if we have createdAt
    if (this.user?.createdAt) {
      this.calculateAccountAge();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  calculateAccountAge(): void {
    if (!this.user?.createdAt) return;

    const createDate = new Date(this.user.createdAt);
    const now = new Date();
    const years = now.getFullYear() - createDate.getFullYear();
    const months = now.getMonth() - createDate.getMonth();

    if (years > 0) {
      this.accountAge = years === 1 ? '1 year' : `${years} years`;
    } else if (months > 0) {
      this.accountAge = months === 1 ? '1 month' : `${months} months`;
    } else {
      const days = Math.floor((now.getTime() - createDate.getTime()) / (1000 * 60 * 60 * 24));
      this.accountAge = days === 1 ? '1 day' : `${days} days`;
    }
  }

  loadPreferences(): void {
    const savedPreferences = localStorage.getItem('user_preferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        this.preferences = { ...this.preferences, ...parsed };
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }
  }

  savePreferences(): void {
    this.loading = true;

    // Apply dark mode preference
    this.themeService.setTheme(this.preferences.darkMode);

    // Save to localStorage
    localStorage.setItem('user_preferences', JSON.stringify(this.preferences));

    // Simulate API call
    setTimeout(() => {
      this.loading = false;
      this.toastService.showSuccess('Preferences Saved', 'Your preferences have been updated successfully.');
    }, 800);
  }

  toggleEditProfile(): void {
    this.editingProfile = !this.editingProfile;
  }

  refreshGitHubData(): void {
    this.loading = true;

    this.authService.refreshGitHubData().subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.calculateAccountAge(); // Recalculate account age with fresh data
        this.loading = false;
        this.toastService.showSuccess('Profile Updated', 'Your GitHub profile data has been refreshed.');
      },
      error: () => {
        // Error handling is done in the service
        this.loading = false;
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}