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
        // Skip authentication check for the auth-callback route
        if (state.url.includes('auth/callback')) {
            return true;
        }

        // Regular auth check for other routes
        if (this.authService.isLoggedIn()) {

            // Check for required roles
            const requiredRoles = route.data['roles'] as string[];
            if (requiredRoles) {
                const hasRequiredRole = requiredRoles.some(role =>
                    this.authService.hasRole(role)
                );

                if (!hasRequiredRole) {
                    this.toastService.showError('Access Denied', 'You do not have permission to access this page.');
                    this.router.navigate(['/dashboard']);
                    return false;
                }
            }

            // Logged in and has required roles (if any)
            return true;
        }

        // Store the attempted URL for redirecting after login
        // Skip storing login/auth URLs to prevent loops
        if (!state.url.includes('/login') && !state.url.includes('/auth')) {
            localStorage.setItem('auth_redirect_url', state.url);
        }

        // Redirect to login page with a toast message
        this.toastService.showWarning('Authentication Required', 'Please sign in to access this page.');
        this.router.navigate(['/login']);
        return false;
    }
}