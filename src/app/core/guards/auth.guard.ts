import { Injectable } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "../../core/auth/services/auth.service";
import { ToastService } from "../services/utils/toast.service";

@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {

    constructor(
        private router: Router,
        private authService: AuthService,
        private toastService: ToastService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        console.log('Auth guard checking route:', state.url);

        // Check localStorage directly
        const storedUser = localStorage.getItem('current_user');
        console.log('User in localStorage:', storedUser ? 'YES' : 'NO');

        // Check token in localStorage
        const storedToken = localStorage.getItem('access_token');
        console.log('Token in localStorage:', storedToken ? 'YES' : 'NO');

        // Check the service state
        console.log('User in service:', this.authService.getCurrentUser() ? 'YES' : 'NO');

        // Skip authentication check for the auth-callback route
        if (state.url.includes('auth/callback')) {
            console.log('Bypassing auth check for auth-callback route');
            return true;
        }

        // Regular auth check for other routes
        if (this.authService.isLoggedIn()) {
            console.log('User is authenticated');

            // Check for required roles
            const requiredRoles = route.data['roles'] as string[];
            if (requiredRoles) {
                const hasRequiredRole = requiredRoles.some(role =>
                    this.authService.hasRole(role)
                );

                if (!hasRequiredRole) {
                    console.log('User missing required roles:', requiredRoles);
                    this.toastService.showError('Access Denied', 'You do not have permission to access this page.');
                    this.router.navigate(['/dashboard']);
                    return false;
                }
            }

            // Logged in and has required roles (if any)
            return true;
        }

        console.log('User is not authenticated, redirecting to login');

        // Store the attempted URL for redirecting after login
        // Skip storing login/auth URLs to prevent loops
        if (!state.url.includes('/login') && !state.url.includes('/auth')) {
            localStorage.setItem('auth_redirect_url', state.url);
            console.log('Stored redirect URL:', state.url);
        }

        // Redirect to login page with a toast message
        this.toastService.showWarning('Authentication Required', 'Please sign in to access this page.');
        this.router.navigate(['/login']);
        return false;
    }
}