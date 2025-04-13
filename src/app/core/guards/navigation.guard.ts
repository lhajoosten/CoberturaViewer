import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class NavigationGuardService {
    private navigatingTo: { [route: string]: boolean } = {};
    private navigationTimers: { [route: string]: any } = {};

    constructor() {
        // Clean up any stale navigation flags on service initialization
        window.addEventListener('beforeunload', () => this.clearAllNavigations());
    }

    /**
     * Check if we're currently navigating to a specific route
     */
    isNavigatingTo(route: string): boolean {
        return this.navigatingTo[route] === true;
    }

    /**
     * Start navigation to a route
     */
    startNavigation(route: string, timeoutMs: number = 2000): void {
        console.log(`Starting navigation to ${route}`);
        this.navigatingTo[route] = true;

        // Clear existing timer if any
        if (this.navigationTimers[route]) {
            clearTimeout(this.navigationTimers[route]);
        }

        // Auto-clear after timeout
        this.navigationTimers[route] = setTimeout(() => {
            console.log(`Navigation timeout for ${route}`);
            this.endNavigation(route);
        }, timeoutMs);
    }

    /**
     * End navigation to a route
     */
    endNavigation(route: string): void {
        console.log(`Ending navigation to ${route}`);
        this.navigatingTo[route] = false;

        if (this.navigationTimers[route]) {
            clearTimeout(this.navigationTimers[route]);
            this.navigationTimers[route] = null;
        }
    }

    /**
     * Clear all navigations
     */
    clearAllNavigations(): void {
        console.log('Clearing all navigations');
        Object.keys(this.navigationTimers).forEach(route => {
            if (this.navigationTimers[route]) {
                clearTimeout(this.navigationTimers[route]);
                this.navigationTimers[route] = null;
            }
        });

        this.navigatingTo = {};
    }
}