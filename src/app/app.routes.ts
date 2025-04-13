import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './core/layouts/main-layout/main-layout.component';
import { AuthLayoutComponent } from './core/layouts/auth-layout/auth-layout.component';
import { inject } from '@angular/core';
import { AuthService } from './core/auth/services/auth.service';
import { UnauthenticatedGuard } from './core/guards/unauthenticated.guard';

export const routes: Routes = [

    // Auth callback - needs special handling
    {
        path: 'auth/callback',
        loadComponent: () => import('./core/auth/components/auth-callback.component')
            .then(m => m.AuthCallbackComponent)
    },

    // Public routes - no auth required
    {
        path: '',
        component: AuthLayoutComponent,
        canActivate: [UnauthenticatedGuard],
        children: [
            {
                path: '',
                loadComponent: () => import('./core/auth/components/welcome/welcome.component')
                    .then(m => m.WelcomeComponent)
            },
            {
                path: 'login',
                loadChildren: () => import('./core/auth/auth.module')
                    .then(m => m.AuthModule)
            },
        ]
    },

    // Protected routes - requiring authentication
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [AuthGuard],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component')
                    .then(m => m.DashboardComponent)
            },
            {
                path: 'profile',
                loadChildren: () => import('./core/auth/auth.module').then(m => m.AuthModule)
            },
            {
                path: 'upload',
                loadChildren: () => import('./features/file-upload/file-upload.routes')
                    .then(m => m.fileRoutes)
            },
            {
                path: 'visualization',
                loadChildren: () => import('./features/visualization/visualization.routes')
                    .then(m => m.visualizationRoutes)
            },
            {
                path: 'trends',
                loadChildren: () => import('./features/trends/trends.routes')
                    .then(m => m.trendRoutes)
            },
            {
                path: 'insights',
                loadChildren: () => import('./features/insights/insights.routes')
                    .then(m => m.insightRoutes)
            },
            {
                path: 'comparison',
                loadComponent: () => import('./features/comparison/components/report-comparison/report-comparison.component')
                    .then(m => m.ReportComparisonComponent)
            }
        ]
    },

    // Fallback route
    {
        path: '**',
        redirectTo: ''
    }
];