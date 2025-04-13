import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../../../env/env.develop';
import { ToastService } from '../../services/utils/toast.service';
import { User } from '../models/user.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
    private toastService: ToastService
  ) {
    // Initialize from localStorage on service creation
    this.loadUserFromStorage();
  }

  /**
   * Initialize GitHub OAuth flow
   */
  loginWithGitHub(): void {
    console.log('AuthService: initiating GitHub OAuth flow');

    // Clear any existing state
    localStorage.removeItem('github_auth_state');

    const githubAuthUrl = 'https://github.com/login/oauth/authorize';
    const clientId = environment.github.clientId;
    const redirectUri = encodeURIComponent(environment.github.redirectUri);
    const scope = environment.github.scope;
    const state = this.generateRandomState();

    // Store state for CSRF protection
    localStorage.setItem('github_auth_state', state);

    const authUrl = `${githubAuthUrl}?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;

    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
  }

  /**
   * Handle the OAuth callback from GitHub
   */
  handleAuthCallback(code: string, state: string): Observable<User> {
    console.log('Handling auth callback with code', code.substring(0, 5) + '...');

    // Verify state to prevent CSRF attacks
    const savedState = localStorage.getItem('github_auth_state');
    console.log('Saved state:', savedState, 'Received state:', state);

    if (!savedState) {
      console.error('No state found in localStorage');
      return throwError(() => new Error('Security verification failed. No state found.'));
    }

    if (savedState !== state) {
      console.error('State mismatch: Expected', savedState, 'Got', state);
      return throwError(() => new Error('Security verification failed. Invalid state parameter.'));
    }

    console.log('State verification successful!');

    // Clear stored state
    localStorage.removeItem('github_auth_state');

    this.toastService.showInfo('Authenticating', 'Completing your sign-in...');

    // Call the backend to exchange code for token and get user data
    return this.http.get<{ user: any, token: string }>(`${environment.apiBaseUrl}/auth/github/callback?code=${code}`).pipe(
      tap(response => console.log('Got response from backend:', response)),
      switchMap(response => {
        const { user, token } = response;

        if (!user || !token) {
          console.error('Invalid response from server');
          return throwError(() => new Error('Invalid authentication response'));
        }

        // Store token
        localStorage.setItem('access_token', token);
        console.log('Token stored in localStorage');

        // Map GitHub user to our User model
        const githubUser: User = {
          id: user.id.toString(),
          login: user.login,
          name: user.name || user.login,
          email: user.email || `${user.login}@users.noreply.github.com`,
          avatar: user.avatar_url,
          provider: 'github',
          roles: ['user'],
          accessToken: token,
          bio: user.bio,
          location: user.location,
          company: user.company,
          profileUrl: user.html_url,
          createdAt: user.created_at,
          followers: user.followers,
          following: user.following,
          publicRepos: user.public_repos,
          publicGists: user.public_gists
        };

        // Store user and return
        this.currentUserSubject.next(githubUser);
        localStorage.setItem('current_user', JSON.stringify(githubUser));

        return of(githubUser);
      }),
      catchError(error => {
        console.error('Error in auth callback:', error);
        this.toastService.showError('Authentication Failed', 'Unable to complete GitHub authentication');
        return throwError(() => error);
      })
    );
  }

  /**
   * Refresh GitHub user data
   */
  refreshGitHubData(): Observable<User> {
    const token = this.getAccessToken();

    if (!token) {
      this.toastService.showError('Authentication Error', 'No valid token found. Please log in again.');
      return throwError(() => new Error('No valid token found'));
    }

    return this.http.get<{ user: any }>(`${environment.apiBaseUrl}/auth/github/refresh`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }).pipe(
      map(response => {
        const user = response.user;

        // Map GitHub user to our User model
        const githubUser: User = {
          id: user.id.toString(),
          login: user.login,
          name: user.name || user.login,
          email: user.email || `${user.login}@users.noreply.github.com`,
          avatar: user.avatar_url,
          provider: 'github',
          roles: this.getCurrentUser()?.roles || ['user'], // Preserve current roles
          accessToken: token,
          bio: user.bio,
          location: user.location,
          company: user.company,
          profileUrl: user.html_url,
          createdAt: user.created_at,
          followers: user.followers,
          following: user.following,
          publicRepos: user.public_repos,
          publicGists: user.public_gists
        };

        // Update stored user data
        this.currentUserSubject.next(githubUser);
        localStorage.setItem('current_user', JSON.stringify(githubUser));

        return githubUser;
      }),
      catchError(error => {
        console.error('Error refreshing GitHub data:', error);

        // If token is expired/invalid, prompt for login
        if (error.status === 401) {
          this.toastService.showError('Session Expired', 'Your session has expired. Please log in again.');
          this.logout();
        } else {
          this.toastService.showError('Refresh Failed', 'Could not refresh GitHub data. Please try again later.');
        }

        return throwError(() => error);
      })
    );
  }

  /**
   * Load user from local storage on app initialization
   */
  private loadUserFromStorage(): void {
    const storedUser = localStorage.getItem('current_user');
    console.log('Loading user from storage:', storedUser);
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        console.log('Loaded user from storage:', user);
      } catch (e) {
        console.error('Error loading user from storage:', e);
        localStorage.removeItem('current_user');
      }
    }
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    const hasUser = this.currentUserSubject.value !== null;
    console.log('isLoggedIn() check:', hasUser, 'user:', this.currentUserSubject.value);
    return hasUser;
  }

  /**
   * Check if current user has a specific role
   */
  hasRole(role: string): boolean {
    const user = this.currentUserSubject.value;
    return user !== null && user.roles.includes(role);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    const user = this.currentUserSubject.value;
    return user?.accessToken || localStorage.getItem('access_token');
  }

  /**
   * Log out the current user
   */
  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('current_user');
    localStorage.removeItem('access_token');
    this.toastService.showInfo('Logged Out', 'You have been successfully logged out.');
    this.router.navigate(['/']);
  }

  /**
   * Generate a random state string for CSRF protection
   */
  private generateRandomState(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}