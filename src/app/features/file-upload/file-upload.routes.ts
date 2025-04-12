import { Routes } from '@angular/router';

export const fileRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./components/file-uploader/file-uploader.component')
            .then(m => m.FileUploaderComponent)
    },
    {
        path: 'recent',
        loadComponent: () => import('./components/recent-files/recent-files.component')
            .then(m => m.RecentFilesComponent)
    }
];