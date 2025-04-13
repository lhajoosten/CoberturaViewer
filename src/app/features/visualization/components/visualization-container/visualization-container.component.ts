import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { ToastService } from '../../../../core/services/utils/toast.service';

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
export class VisualizationContainerComponent implements OnInit, AfterViewInit {
  // View children for each chart type
  @ViewChild(TreemapComponent) treemapComponent!: TreemapComponent;
  @ViewChild(SunburstComponent) sunburstComponent!: SunburstComponent;
  @ViewChild(AdvancedPieComponent) advancedPieComponent!: AdvancedPieComponent;
  @ViewChild(HeatmapComponent) heatmapComponent!: HeatmapComponent;
  @ViewChild(LineChartComponent) lineChartComponent!: LineChartComponent;
  @ViewChild(CoverageTableComponent) tableComponent!: CoverageTableComponent;

  // Reference to the active chart container div
  @ViewChild('chartContainer') chartContainer!: ElementRef;

  activeChartData: any[][] = [];
  coverageData: CoverageData | null = null;
  hasData = false;
  activeView = 'treemap';

  constructor(private coverageStore: CoverageStoreService, private toastService: ToastService) { }

  ngOnInit(): void {
    this.coverageStore.getCoverageData().subscribe(data => {
      this.coverageData = data;
      this.hasData = !!data;
    });
  }

  ngAfterViewInit(): void {
    // Give the charts time to render before attempting to export
    setTimeout(() => this.updateActiveChartData(), 500);
  }

  switchView(view: string): void {
    this.activeView = view;
    // Update chart data after view switch (with slight delay to let components initialize)
    setTimeout(() => this.updateActiveChartData(), 500);
  }

  public getActiveChartElementForExport(): HTMLElement | null {
    return this.getActiveChartElement();
  }

  public getExportData(): any[][] {
    return this.activeChartData;
  }

  // Get the current active chart element for export
  getActiveChartElement(): HTMLElement | null {

    try {
      switch (this.activeView) {
        case 'treemap':
          if (this.treemapComponent?.chartContainer) {
            return this.treemapComponent.chartContainer.nativeElement;
          }
          break;
        case 'sunburst':
          if (this.sunburstComponent?.chartContainer) {
            return this.sunburstComponent.chartContainer.nativeElement;
          }
          break;
        case 'advanced-pie':
          if (this.advancedPieComponent?.chartContainer) {
            return this.advancedPieComponent.chartContainer.nativeElement;
          }
          break;
        case 'heatmap':
          if (this.heatmapComponent?.chartContainer) {
            return this.heatmapComponent.chartContainer.nativeElement;
          }
          break;
        case 'line-chart':
          if (this.lineChartComponent?.chartContainer) {
            return this.lineChartComponent.chartContainer.nativeElement;
          }
          break;
        case 'table':
          if (this.tableComponent?.chartContainer) {
            return this.tableComponent.chartContainer.nativeElement;
          }
          break;
      }

      // Fallback to the chart container div if specific component not found
      if (this.chartContainer) {
        return this.chartContainer.nativeElement;
      }

      return null;
    } catch (error) {
      console.error('Error getting chart element:', error);
      return null;
    }
  }

  // Update the active chart data for export
  updateActiveChartData(): void {
    try {
      switch (this.activeView) {
        case 'treemap':
          this.activeChartData = this.treemapComponent?.chartData || [];
          break;
        case 'sunburst':
          this.activeChartData = this.sunburstComponent?.chartData || [];
          break;
        case 'advanced-pie':
          this.activeChartData = this.advancedPieComponent?.chartData || [];
          break;
        case 'heatmap':
          this.activeChartData = this.heatmapComponent?.chartData || [];
          break;
        case 'line-chart':
          this.activeChartData = this.lineChartComponent?.chartData || [];
          break;
        case 'table':
          this.activeChartData = this.tableComponent?.getExportData() || [];
          break;
        default:
          this.activeChartData = [];
      }
    } catch (error) {
      this.toastService.showError('Error', `Failed to update chart data for export: ${error}`);
      this.activeChartData = [];
    }
  }
}