import { Routes } from '@angular/router';

export const insightRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./components/coverage-insights/coverage-insights.component')
            .then(m => m.CoverageInsightsComponent)
    },
    {
        path: 'packages',
        loadComponent: () => import('./components/package-insights/package-insights.component')
            .then(m => m.PackageInsightsComponent)
    },
    {
        path: 'classes',
        loadComponent: () => import('./components/class-insights/class-insights.component')
            .then(m => m.ClassInsightsComponent)
    },
    {
        path: 'details/:className',
        loadComponent: () => import('./components/class-insights/class-details/class-details.component')
            .then(m => m.ClassDetailsComponent)
    }
];