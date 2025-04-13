import { Routes } from '@angular/router';

export const visualizationRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./components/visualization-container/visualization-container.component')
            .then(m => m.VisualizationContainerComponent)
    },
    {
        path: 'treemap',
        loadComponent: () => import('./components/treemap/treemap.component')
            .then(m => m.TreemapComponent)
    },
    {
        path: 'sunburst',
        loadComponent: () => import('./components/sunburst/sunburst.component')
            .then(m => m.SunburstComponent)
    }
];