import { Injectable, inject } from "@angular/core";
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { AuthService } from "../auth/services/auth.service";

@Injectable({
    providedIn: 'root'
})
export class UnauthenticatedGuard implements CanActivate {
    private router = inject(Router);
    private authService = inject(AuthService);

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        // If trying to access auth callback, always allow
        if (state.url.includes('auth/callback')) {
            return true;
        }

        // If user is already logged in, redirect to dashboard
        if (this.authService.isLoggedIn()) {
            console.log('User is already authenticated, redirecting to dashboard');
            this.router.navigate(['/dashboard']);
            return false;
        }

        // Not logged in, allow access to public pages
        return true;
    }
}