import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ReportComparisonComponent } from './components/report-comparison/report-comparison.component';


export const routes: Routes = [
    { path: '', component: DashboardComponent },
    { path: 'compare', component: ReportComparisonComponent },
    { path: '**', redirectTo: '' }
];