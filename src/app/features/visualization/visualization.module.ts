import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GoogleChartsModule } from 'angular-google-charts';

import { VisualizationContainerComponent } from './components/visualization-container/visualization-container.component';
import { TreemapComponent } from './components/treemap/treemap.component';
import { SunburstComponent } from './components/sunburst/sunburst.component';
import { CoverageTableComponent } from './components/coverage-table/coverage-table.component';
import { HeatmapComponent } from './components/heatmap/heatmap.component';
import { LineChartComponent } from './components/line-chart/line-chart.component';
import { AdvancedPieComponent } from './components/advanced-pie-chart/advanced-pie.component';
import { visualizationRoutes } from './visualization.routes';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        RouterModule.forChild(visualizationRoutes),
        FormsModule,
        GoogleChartsModule,
        // Standalone components
        VisualizationContainerComponent,
        TreemapComponent,
        SunburstComponent,
        CoverageTableComponent,
        HeatmapComponent,
        LineChartComponent,
        AdvancedPieComponent
    ]
})
export class VisualizationModule { }