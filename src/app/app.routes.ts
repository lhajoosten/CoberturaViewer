// src/app/app.routes.ts
import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./features/dashboard/components/dashboard/dashboard.component')
            .then(m => m.DashboardComponent)
    },
    {
        path: 'upload',
        loadComponent: () => import('./features/file-upload/components/file-uploader/file-uploader.component')
            .then(m => m.FileUploaderComponent)
    },
    {
        path: 'comparison',
        loadComponent: () => import('./features/comparison/components/report-comparison/report-comparison.component')
            .then(m => m.ReportComparisonComponent)
    },
    { path: '**', redirectTo: '' }
];