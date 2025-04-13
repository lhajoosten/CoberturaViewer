import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../core/services/utils/loading.service';
import { LoadingSpinnerComponent } from '../components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-global-spinner',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner 
      *ngIf="showSpinner" 
      [overlay]="true" 
      [text]="message">
    </app-loading-spinner>
  `,
  styles: []
})
export class GlobalSpinnerComponent implements OnInit {
  showSpinner = false;
  message = 'Loading...';

  constructor(private loadingService: LoadingService) { }

  ngOnInit(): void {
    this.loadingService.loading$.subscribe(state => {
      this.showSpinner = state.show;
      this.message = state.message || 'Loading...';
    });
  }
}