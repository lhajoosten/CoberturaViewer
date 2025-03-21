import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { FileUploaderComponent } from '../file-uploader/file-uploader.component';
import { CoverageSummaryComponent } from '../coverage-summary/coverage-summary.component';
import { PackageListComponent } from '../package-list/package-list.component';
import { CoverageInsightsComponent } from '../coverage-insights/coverage-insights.component';
import { CoverageTreemapComponent } from '../coverage-treemap/coverage-treemap.component';
import { CoverageTrendsComponent } from '../coverage-trends/coverage-trends.component';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface TabItem {
    id: string;
    label: string;
    icon: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        CommonModule,
        FileUploaderComponent,
        CoverageSummaryComponent,
        PackageListComponent,
        CoverageTreemapComponent,
        CoverageTrendsComponent,
        CoverageInsightsComponent
    ],
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    hasCoverageData = false;
    activeTab = 'packages';

    tabs: TabItem[] = [
        { id: 'packages', label: 'Packages & Classes', icon: 'fas fa-folder' },
        { id: 'treemap', label: 'Coverage Treemap', icon: 'fas fa-th-large' },
        { id: 'trends', label: 'Coverage Trends', icon: 'fas fa-chart-line' },
        { id: 'insights', label: 'Insights', icon: 'fas fa-lightbulb' }
    ];

    constructor(private coverageStore: CoverageStoreService) { }

    ngOnInit(): void {
        this.coverageStore.getCoverageData().subscribe(data => {
            this.hasCoverageData = !!data;
        });
    }

    setActiveTab(tabId: string): void {
        this.activeTab = tabId;
    }

    resetData(): void {
        this.coverageStore.clearData();
    }

    async downloadReportPDF(): Promise<void> {
        const element = document.querySelector('.coverage-data') as HTMLElement;
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                logging: false,
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('coverage-report.pdf');
        } catch (error) {
            console.error('Error generating PDF:', error);
        }
    }
}