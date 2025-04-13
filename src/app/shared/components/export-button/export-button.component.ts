import { Component, Input, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportService } from '../../../core/services/utils/export.service';
import { ToastService } from '../../../core/services/utils/toast.service';

@Component({
    selector: 'app-export-button',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './export-button.component.html',
    styleUrls: ['./export-button.component.scss']
})
export class ExportButtonComponent {
    @Input() targetElement: HTMLElement | null = null;
    @Input() chartData: any[][] | null = null;
    @Input() filename: string = 'chart';

    showDropdown = false;
    exporting = false;

    constructor(
        private exportService: ExportService,
        private elementRef: ElementRef,
        private toastService: ToastService
    ) { }

    toggleDropdown(): void {
        this.showDropdown = !this.showDropdown;
    }

    closeDropdown(): void {
        this.showDropdown = false;
    }

    exportAsPng(): void {
        if (!this.targetElement) {
            this.toastService.showError('Export Error', 'No target element found to export');
            return;
        }

        this.exporting = true;

        try {
            this.exportService.exportChartAsPng(this.targetElement, this.filename)
                .finally(() => {
                    this.exporting = false;
                    this.closeDropdown();
                });
        } catch (e) {
            this.exporting = false;
            this.closeDropdown();
        }
    }

    exportAsSvg(): void {
        if (!this.targetElement) {
            this.toastService.showError('Export Error', 'No target element found to export');
            return;
        }

        const svg = this.targetElement.querySelector('svg');
        if (!svg) {
            this.toastService.showError('Export Error', 'No SVG element found in the target element');
            return;
        }

        this.exporting = true;

        try {
            this.exportService.exportChartAsSvg(this.targetElement, this.filename)
                .finally(() => {
                    this.exporting = false;
                    this.closeDropdown();
                });
        } catch (e) {
            this.exporting = false;
            this.closeDropdown();
        }
    }

    exportAsPdf(): void {
        if (!this.targetElement) {
            this.toastService.showError('Export Error', 'No target element found to export');
            return;
        }

        this.exporting = true;

        try {
            this.exportService.exportChartAsPdf(this.targetElement, this.filename)
                .finally(() => {
                    this.exporting = false;
                    this.closeDropdown();
                });
        } catch (e) {
            this.exporting = false;
            this.closeDropdown();
        }
    }

    exportAsCsv(): void {
        if (!this.chartData) {
            this.toastService.showError('Export Error', 'No chart data available to export');
            return;
        }

        this.exporting = true;

        try {
            this.exportService.exportDataAsCsv(this.chartData, this.filename)
                .finally(() => {
                    this.exporting = false;
                    this.closeDropdown();
                });
        } catch (e) {
            this.exporting = false;
            this.closeDropdown();
        }
    }

    exportGoogleChartAsPng(): void {
        if (!this.targetElement) {
            this.toastService.showError('Export Error', 'No target element found to export');
            return;
        }

        this.exporting = true;

        try {
            this.exportService.exportGoogleChartAsPng(this.targetElement, this.filename)
                .finally(() => {
                    this.exporting = false;
                    this.closeDropdown();
                });
        } catch (e) {
            console.error('Export error:', e);
            this.exporting = false;
            this.closeDropdown();
        }
    }

    // Close dropdown when clicking outside
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const clickedInside = this.elementRef.nativeElement.contains(event.target);
        if (!clickedInside) {
            this.showDropdown = false;
        }
    }
}