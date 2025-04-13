// src/app/features/trends/trends.routes.ts
import { Routes } from '@angular/router';
import { CoverageTrendsComponent } from './components/coverage-trends/coverage-trends.component';

export const trendRoutes: Routes = [
    {
        path: '',
        component: CoverageTrendsComponent
    }
];