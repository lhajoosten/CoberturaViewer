import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface RecommendationDetail {
  text: string;
  icon?: string;
}

export interface Recommendation {
  title: string;
  description: string;
  details?: RecommendationDetail[];
  tags?: string[];
  priority: 'high' | 'medium' | 'low';
}

@Component({
  selector: 'app-recommendations-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './recommendations-view.component.html',
  styleUrls: ['./recommendations-view.component.scss']
})
export class RecommendationsViewComponent {
  @Input() recommendations: Recommendation[] = [];
  @Input() thresholds!: { excellent: number; good: number; average: number; };
  @Input() isDarkTheme = false;
}