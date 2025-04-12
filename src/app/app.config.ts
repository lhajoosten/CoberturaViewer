import { ApplicationConfig } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { GoogleChartsModule } from 'angular-google-charts';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    {
      provide: GoogleChartsModule,
      useValue: { version: 'current' }
    },
    provideRouter(routes, withHashLocation()),
    provideHttpClient(),
  ]
};