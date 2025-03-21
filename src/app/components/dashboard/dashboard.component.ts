import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import { CoverageSummaryComponent } from '../coverage-summary/coverage-summary.component';
import { PackageListComponent } from '../package-list/package-list.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        FileUploaderComponent,
        CoverageSummaryComponent,
        PackageListComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    hasCoverageData = false;

    constructor(private coverageStore: CoverageStoreService) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe(data => {
            this.hasCoverageData = !!data;
        });
    }
}