import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageInsight } from '../../../../common/models/coverage.model';

@Component({
  selector: 'app-insights-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './insights-view.component.html',
  styleUrls: ['./insights-view.component.scss']
})
export class InsightsViewComponent {
  @Input() insights: CoverageInsight[] = [];
  @Input() thresholds!: { excellent: number; good: number; average: number; };
  @Input() isDarkTheme = false;

  toggleInsight(insight: CoverageInsight): void {
    insight.expanded = !insight.expanded;
  }
}