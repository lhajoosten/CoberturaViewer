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
    },
    { path: '**', redirectTo: '' }
];