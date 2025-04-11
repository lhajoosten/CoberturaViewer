import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClassRisk } from '../../../../common/models/coverage.model';
import { ClassNameOnlyPipe } from '../../../../common/pipes/class-name-only.pipe';

@Component({
  selector: 'app-risks-view',
  standalone: true,
  imports: [CommonModule, FormsModule, ClassNameOnlyPipe],
  templateUrl: './risks-view.component.html',
  styleUrls: ['./risks-view.component.scss']
})
export class RisksViewComponent implements OnChanges {
  @Input() highRiskClasses: ClassRisk[] = [];
  @Input() thresholds!: { excellent: number; good: number; average: number; };
  @Input() isDarkTheme = false;

  // Search and filtering
  searchTerm = '';
  sortBy: 'name' | 'coverage' | 'lines' | 'riskScore' = 'riskScore';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Selected item
  selectedRiskClass: ClassRisk | null = null;

  // Computed properties
  sortedRiskClasses: ClassRisk[] = [];
  filteredCount = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['highRiskClasses']) {
      this.sortRiskClasses();
    }
  }

  sortRiskClasses(field?: 'name' | 'coverage' | 'lines' | 'riskScore'): void {
    if (field) {
      if (this.sortBy === field) {
        // Toggle direction if same field
        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        this.sortBy = field;
        // Default directions based on field
        this.sortDirection = field === 'name' ? 'asc' : 'desc';
      }
    }

    this.sortedRiskClasses = [...this.filterRiskClasses()]
      .sort((a, b) => {
        let compareA: any;
        let compareB: any;

        switch (this.sortBy) {
          case 'name':
            compareA = a.name;
            compareB = b.name;
            break;
          case 'coverage':
            compareA = a.coverage;
            compareB = b.coverage;
            break;
          case 'lines':
            compareA = a.linesValid;
            compareB = b.linesValid;
            break;
          case 'riskScore':
          default:
            compareA = a.riskScore;
            compareB = b.riskScore;
            break;
        }

        const result = compareA > compareB ? 1 : compareA < compareB ? -1 : 0;
        return this.sortDirection === 'asc' ? result : -result;
      });
  }

  filterRiskClasses(): ClassRisk[] {
    if (!this.searchTerm.trim()) {
      this.filteredCount = this.highRiskClasses.length;
      return this.highRiskClasses;
    }

    const filtered = this.highRiskClasses.filter(item =>
      item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
    this.filteredCount = filtered.length;
    return filtered;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.sortRiskClasses();
  }

  selectRiskClass(cls: ClassRisk): void {
    this.selectedRiskClass = cls;
  }

  closeRiskClassDetails(): void {
    this.selectedRiskClass = null;
  }

  getSortIconClass(field: string): string {
    if (this.sortBy !== field) return 'fa-sort';
    return this.sortDirection === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  getCoverageClass(coverage: number): string {
    if (coverage >= this.thresholds.excellent) return 'excellent';
    if (coverage >= this.thresholds.good) return 'good';
    if (coverage >= this.thresholds.average) return 'average';
    return 'poor';
  }

  getRiskLevel(value: number, lowThreshold: number, highThreshold: number): 'low' | 'medium' | 'high' {
    if (value < lowThreshold) return 'low';
    if (value < highThreshold) return 'medium';
    return 'high';
  }

  getRiskLevelText(value: number, lowThreshold: number, highThreshold: number): string {
    if (value < lowThreshold) return 'Low';
    if (value < highThreshold) return 'Medium';
    return 'High';
  }
}