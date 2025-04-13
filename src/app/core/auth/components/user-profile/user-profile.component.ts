import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { User, UserPreferences } from '../../models/user.interface';
import { AuthService } from '../../services/auth.service';
import { SessionService } from '../../services/session.service';
import { ToastService } from '../../../services/utils/toast.service';
import { Subscription } from 'rxjs';
import { formatDistance } from 'date-fns';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;

  // Session information
  appLoginDate = '';
  appLoginTime = '';
  appLoginTimezone = '';
  sessionLastUpdated = '';
  sessionDuration = '';
  private sessionInterval: any;

  loading = false;
  editingProfile = false;
  accountAge = '';

  userLocation: string = '';
  browserInfo: string = '';

  // Track changes to preferences
  originalPreferences: UserPreferences | null = null;
  hasUnsavedChanges = false;

  preferences: UserPreferences = {
    emailNotifications: true,
    autoSaveReports: true,
    darkMode: false,
    language: 'en',
    dashboardLayout: 'comfortable',
    sessionTimeout: 'never'
  };

  languages = [
    { code: 'en', name: 'English' }
  ];

  layouts = [
    { value: 'compact', label: 'Compact' },
    { value: 'comfortable', label: 'Comfortable' },
    { value: 'spacious', label: 'Spacious' }
  ];

  private subscriptions: Subscription = new Subscription();

  constructor(
    private authService: AuthService,
    private sessionService: SessionService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // Load user profile
    this.user = this.authService.getCurrentUser();

    if (this.user?.createdAt) {
      this.calculateAccountAge();
    }

    // Load session information
    this.initializeSessionInfo();

    // Load user preferences
    this.loadUserPreferences();

    // Update session duration every minute
    this.sessionInterval = setInterval(() => {
      this.updateSessionDuration();
    }, 60000);

    // Monitor preferences for changes
    this.originalPreferences = { ...this.preferences };

    this.getUserLocation();
    this.detectBrowser();
  }

  ngOnDestroy(): void {
    // Clear interval to prevent memory leaks
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
    }

    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();
  }

  refreshGitHubData(): void {
    this.loading = true;

    this.subscriptions.add(
      this.authService.refreshGitHubData().subscribe({
        next: (user) => {
          this.user = user;
          this.calculateAccountAge();
          this.toastService.showSuccess('Profile Updated', 'Your GitHub profile data has been refreshed');
          this.loading = false;
        },
        error: (error) => {
          this.toastService.showError('Update Failed', error.message || 'Failed to refresh GitHub data');
          this.loading = false;
        }
      })
    );
  }

  logout(): void {
    this.authService.logout();
  }

  savePreferences(): void {
    this.loading = true;

    // In a real application, you would save to a backend
    setTimeout(() => {
      localStorage.setItem('user_preferences', JSON.stringify(this.preferences));
      this.originalPreferences = { ...this.preferences };
      this.hasUnsavedChanges = false;
      this.toastService.showSuccess('Preferences Saved', 'Your preferences have been updated');
      this.loading = false;

      // Apply theme change immediately if changed
      if (this.preferences.darkMode) {
        document.documentElement.classList.add('dark-theme');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
      }
    }, 800);
  }

  // Helper methods
  private initializeSessionInfo(): void {
    const sessionStart = this.sessionService.getSessionStartTime();

    if (sessionStart) {
      // Format the date parts
      this.appLoginDate = sessionStart.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      this.appLoginTime = sessionStart.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      // Use Intl.DateTimeFormat for more reliable timezone info
      this.appLoginTimezone = new Intl.DateTimeFormat(undefined, {
        timeZoneName: 'short'
      }).formatToParts(sessionStart)
        .find(part => part.type === 'timeZoneName')?.value || '';

      // Set initial session duration
      this.updateSessionDuration();

      // Track when session info was last updated
      this.sessionLastUpdated = new Date().toLocaleTimeString();
    }
  }

  protected updateSessionDuration(): void {
    const sessionStart = this.sessionService.getSessionStartTime();
    const now = new Date();

    if (sessionStart) {
      // Calculate duration using date-fns for better formatting
      this.sessionDuration = formatDistance(
        now,
        sessionStart,
        { addSuffix: false }
      );

      // Update last updated timestamp
      this.sessionLastUpdated = now.toLocaleTimeString();
    }
  }

  private calculateAccountAge(): void {
    if (this.user?.createdAt) {
      const creationDate = new Date(this.user.createdAt);
      this.accountAge = formatDistance(
        new Date(),
        creationDate,
        { addSuffix: false }
      );
    }
  }

  private loadUserPreferences(): void {
    const savedPrefs = localStorage.getItem('user_preferences');
    if (savedPrefs) {
      try {
        const parsedPrefs = JSON.parse(savedPrefs);
        this.preferences = { ...this.preferences, ...parsedPrefs };

        // Keep a copy for change detection
        this.originalPreferences = { ...this.preferences };
      } catch (e) {
        console.error('Error parsing saved preferences', e);
      }
    }
  }

  // Track preference changes
  onPreferenceChanged(): void {
    if (this.originalPreferences) {
      this.hasUnsavedChanges = !this.arePreferencesEqual(this.preferences, this.originalPreferences);
    }
  }

  private arePreferencesEqual(a: UserPreferences, b: UserPreferences): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }

  private getUserLocation(): void {
    // Use a browser API to get approximate location without permissions
    fetch('https://ipapi.co/json/')
      .then(response => response.json())
      .then(data => {
        if (data.city && data.country_name) {
          this.userLocation = `${data.city}, ${data.country_name}`;
        } else if (data.country_name) {
          this.userLocation = data.country_name;
        }
      })
      .catch(error => {
        console.error('Failed to get location:', error);
        this.userLocation = 'Unknown location';
      });
  }

  private detectBrowser(): void {
    const agent = navigator.userAgent;
    const browserNames = [
      { name: 'Chrome', value: 'Chrome' },
      { name: 'Firefox', value: 'Firefox' },
      { name: 'Safari', value: 'Safari' },
      { name: 'Edge', value: 'Edg' },
      { name: 'Opera', value: 'OPR' }
    ];

    const browser = browserNames.find(b => agent.includes(b.value));
    this.browserInfo = browser ? browser.name : 'Unknown Browser';
  }

  showAccessHistory(): void {
    this.toastService.showInfo(
      'Access History',
      'Full access history will be available in a future update.'
    );
  }

  setupTwoFactor(): void {
    this.toastService.showInfo(
      'Two-Factor Authentication',
      'This feature will be available in a future update.'
    );
  }
}