import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter, Router, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { GoogleChartsModule } from 'angular-google-charts';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { LayoutService } from './core/layouts/layout.service';
import { AuthService } from './core/auth/services/auth.service';
import { HashLocationStrategy, LocationStrategy, PathLocationStrategy } from '@angular/common';

function initializeApp(
  authService: AuthService,
  layoutService: LayoutService,
  router: Router
) {
  return () => {
    // Check if user is authenticated from localStorage directly
    const storedUser = localStorage.getItem('current_user');
    const isAuthenticated = !!storedUser;

    // Set appropriate layout
    layoutService.setLayout(isAuthenticated ? 'main' : 'auth');

    // If authenticated and on auth pages, redirect to dashboard
    if (isAuthenticated) {
      const currentPath = window.location.pathname;
      if (currentPath === '/' || currentPath === '/login') {
        router.navigate(['/dashboard']);
      }
    }

    return Promise.resolve();
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    {
      provide: LocationStrategy,
      useClass: PathLocationStrategy
    },
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService, LayoutService, Router],
      multi: true
    },
    provideAnimations(),
    {
      provide: GoogleChartsModule,
      useValue: { version: 'current' }
    },
  ]
};