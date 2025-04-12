import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { CoverageStoreService } from '../../../../core/services/store/coverage-store.service';
import { CoverageData } from '../../../../core/models/coverage.model';
import { HeatmapComponent } from "../heatmap/heatmap.component";
import { TreemapComponent } from '../treemap/treemap.component';
import { AdvancedPieComponent } from '../advanced-pie-chart/advanced-pie.component';
import { SunburstComponent } from '../sunburst/sunburst.component';
import { CoverageTableComponent } from '../coverage-table/coverage-table.component';
import { GoogleChartsModule } from 'angular-google-charts';
import { LineChartComponent } from '../line-chart/line-chart.component';
import { CoverageSummaryComponent } from '../coverage-summary/coverage-summary.component';
import { ExportButtonComponent } from '../../../../shared/components/export-button/export-button.component';

@Component({
  selector: 'app-visualization-container',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SunburstComponent,
    TreemapComponent,
    CoverageTableComponent,
    GoogleChartsModule,
    HeatmapComponent,
    LineChartComponent,
    AdvancedPieComponent,
    CoverageSummaryComponent,
    ExportButtonComponent
  ],
  templateUrl: './visualization-container.component.html',
  styleUrls: ['./visualization-container.component.scss']
})
export class VisualizationContainerComponent implements OnInit {
  @ViewChild('chartContainer') chartContainer: ElementRef | null = null;
  activeChartData: any[][] = [];

  coverageData: CoverageData | null = null;
  hasData = false;
  activeView = 'treemap';

  constructor(private coverageStore: CoverageStoreService) { }

  ngOnInit(): void {
    this.coverageStore.getCoverageData().subscribe(data => {
      this.coverageData = data;
      this.hasData = !!data;
    });
  }

  switchView(view: string): void {
    this.activeView = view;
  }

  setActiveChartData(data: any[][]): void {
    this.activeChartData = data;
  }
}