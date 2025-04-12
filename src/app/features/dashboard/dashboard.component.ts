import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../core/services/store/coverage-store.service';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  imports: [CommonModule, RouterModule],
  standalone: true,
})
export class DashboardComponent implements OnInit {
  hasData = false;
  recentFiles: { name: string, date: Date, coverage: number }[] = [];

  // Mock data for initial view - these would come from a service in a real implementation
  mockRecentFiles = [
    { name: 'frontend-coverage.xml', date: new Date(2025, 3, 10), coverage: 78.5 },
    { name: 'api-service-coverage.xml', date: new Date(2025, 3, 5), coverage: 65.2 },
    { name: 'utility-lib-coverage.xml', date: new Date(2025, 2, 28), coverage: 92.1 }
  ];

  constructor(private coverageStore: CoverageStoreService, private router: Router) { }

  ngOnInit(): void {
    // Check if there's data in the store
    this.coverageStore.getCoverageData().subscribe(data => {
      this.hasData = !!data;
    });

    // In a real app, we'd get this from a service
    this.recentFiles = this.mockRecentFiles;
  }

  navigateToUpload(): void {
    this.router.navigate(['/upload']);
  }

  loadFile(fileName: string): void {
    console.log(`Loading file: ${fileName}`);
    // This would typically load the file into the store
  }
}