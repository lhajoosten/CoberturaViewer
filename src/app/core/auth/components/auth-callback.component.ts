import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastService } from '../../services/utils/toast.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="auth-callback-container">
      <div class="auth-spinner">
        <i class="fas fa-circle-notch fa-spin"></i>
        <p>Processing authentication...</p>
      </div>
    </div>
  `,
  styles: [`
    .auth-callback-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: var(--color-bg-secondary);
    }
    
    .auth-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      background-color: var(--color-bg-primary);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    i {
      font-size: 3rem;
      color: var(--color-primary);
      margin-bottom: 1rem;
    }
    
    p {
      color: var(--color-text-secondary);
      font-size: 1rem;
    }
  `]
})
export class AuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    // First, check for query parameters directly from the route
    const routeCode = this.route.snapshot.queryParamMap.get('code');
    const routeState = this.route.snapshot.queryParamMap.get('state');

    // If we have these parameters directly, use them
    if (routeCode && routeState) {
      this.processAuth(routeCode, routeState);
      return;
    }

    // If not in route params, try other extraction methods
    // Extract all query parameters from current URL
    const queryString = window.location.search.substring(1);
    const hashQueryString = window.location.hash.includes('?') ?
      window.location.hash.substring(window.location.hash.indexOf('?') + 1) : '';

    // Try getting parameters from both query string and hash fragment
    let params = this.parseQueryString(queryString);

    // If no code in regular query string, try hash fragment
    if (!params['code'] && hashQueryString) {
      params = this.parseQueryString(hashQueryString);
    }

    const code = params['code'];
    const state = params['state'];
    const error = params['error'];

    if (code && state) {
      this.processAuth(code, state);
    } else {
      this.handleError(error);
    }
  }

  // Extract the authentication logic to a separate method
  private processAuth(code: string, state: string): void {

    // Handle the callback
    this.authService.handleAuthCallback(code, state).subscribe({
      next: (user) => {

        if (user) {
          // Success - redirect to home or stored redirect URL
          const redirectUrl = localStorage.getItem('auth_redirect_url') || '/dashboard';
          localStorage.removeItem('auth_redirect_url');

          // Display success message
          this.toastService.showSuccess(
            'Login Successful',
            `Welcome, ${user.name || user.login}!`
          );

          // Add a small delay to ensure state propagation
          setTimeout(() => {
            this.router.navigateByUrl(redirectUrl);
          }, 300);
        } else {
          this.handleError();
        }
      },
      error: (error) => {
        console.error('Auth callback error:', error);
        this.handleError(error.message);
      }
    });
  }

  // Handle error cases
  private handleError(message?: string): void {
    this.toastService.showError(
      'Authentication Failed',
      message || 'Unable to complete login. Please try again.'
    );
    this.router.navigate(['/login']);
  }

  // Utility function to parse query strings
  private parseQueryString(queryString: string): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    const pairs = queryString.split('&');
    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '));
      }
    }
    return params;
  }
}