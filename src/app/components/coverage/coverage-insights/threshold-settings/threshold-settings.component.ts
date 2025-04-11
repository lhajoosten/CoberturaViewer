import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

const DEFAULT_THRESHOLDS = {
  excellent: 90,
  good: 75,
  average: 50
};

@Component({
  selector: 'app-threshold-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './threshold-settings.component.html',
  styleUrls: ['./threshold-settings.component.scss']
})
export class ThresholdSettingsComponent implements OnInit {
  @Input() thresholds = { ...DEFAULT_THRESHOLDS };
  @Input() showSettings = false;
  @Output() thresholdsUpdated = new EventEmitter<any>();
  @Output() toggleSettings = new EventEmitter<void>();

  currentThresholds = { ...DEFAULT_THRESHOLDS };
  errors = {
    excellent: false,
    good: false,
    average: false
  };

  get hasErrors(): boolean {
    return this.errors.excellent || this.errors.good || this.errors.average;
  }

  ngOnInit(): void {
    this.currentThresholds = { ...this.thresholds };
  }

  toggleSettingss(): void {
    this.showSettings = !this.showSettings;
    this.toggleSettings.emit();
  }

  validateThresholds(): void {
    // Reset errors
    this.errors = {
      excellent: false,
      good: false,
      average: false
    };

    // Validate values are between 1-100
    const { excellent, good, average } = this.currentThresholds;

    if (excellent < 1 || excellent > 100) {
      this.errors.excellent = true;
    }

    if (good < 1 || good > 100) {
      this.errors.good = true;
    }

    if (average < 1 || average > 100) {
      this.errors.average = true;
    }

    // Validate thresholds are in descending order
    if (excellent <= good) {
      this.errors.excellent = true;
      this.errors.good = true;
    }

    if (good <= average) {
      this.errors.good = true;
      this.errors.average = true;
    }
  }

  resetThresholds(): void {
    this.currentThresholds = { ...DEFAULT_THRESHOLDS };
    this.validateThresholds();
  }

  applyThresholds(): void {
    if (this.hasErrors) return;

    this.thresholdsUpdated.emit({ ...this.currentThresholds });
    this.onClose();
  }

  onClose(): void {
    this.toggleSettings.emit();
  }
}