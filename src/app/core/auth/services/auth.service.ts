import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, delay, switchMap, tap } from 'rxjs/operators';
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

    // Log that we're going to get a token
    console.log('About to get GitHub token for code:', code.substring(0, 5) + '...');

    // For demo purposes, we'll use a mock implementation
    return this.getGitHubToken(code).pipe(
      switchMap(token => {
        console.log('Token obtained:', token ? 'YES (length: ' + token.length + ')' : 'NO');

        if (!token) {
          console.error('Failed to get access token');
          return throwError(() => new Error('Failed to get access token'));
        }

        // Store token
        localStorage.setItem('access_token', token);
        console.log('Token stored in localStorage');

        // Get user details
        return this.getGitHubUserDetails(token);
      }),
      tap(user => {
        console.log('User details obtained:', user);
        console.log('Setting user in service and localStorage');
        this.currentUserSubject.next(user);
        localStorage.setItem('current_user', JSON.stringify(user));

        // Check if user is now properly stored
        const storedUser = localStorage.getItem('current_user');
        console.log('Verified user in localStorage:', storedUser ? 'YES' : 'NO');
      }),
      catchError(error => {
        console.error('Error in auth callback:', error);
        return throwError(() => error);
      })
    );
  }

  /**
 * Exchange code for access token
 * Note: In a production app, this would be done server-side for security
 */
  private getGitHubToken(code: string): Observable<string> {
    console.log('Getting GitHub token for code', code.substring(0, 5) + '...');

    // For demo purposes, we'll simulate a successful token response
    // In production, this would be a call to your backend API
    return of(`github_mock_token_${Math.random().toString(36).substring(2)}`).pipe(
      delay(800)  // Simulate network delay
    );
  }


  /**
 * Get GitHub user details using access token
 */
  private getGitHubUserDetails(token: string): Observable<User> {
    console.log('Getting GitHub user details with token', token.substring(0, 10) + '...');

    // For demo purposes, create a mock GitHub user
    // In production, this would call the GitHub API
    const mockUser: User = {
      id: `gh_${Math.random().toString(36).substring(2, 10)}`,
      login: 'github_user',
      name: 'GitHub User',
      email: 'github_user@example.com',
      avatar: 'https://avatars.githubusercontent.com/u/9919?s=200&v=4', // GitHub logo
      provider: 'github' as const,
      roles: ['user'],
      accessToken: token
    };

    return of(mockUser).pipe(
      delay(500)  // Simulate network delay
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