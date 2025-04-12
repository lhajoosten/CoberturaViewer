import { Component, Input, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportService } from '../../../core/services/utils/export.service';

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

    constructor(
        private exportService: ExportService,
        private elementRef: ElementRef
    ) { }

    toggleDropdown(): void {
        this.showDropdown = !this.showDropdown;
    }

    closeDropdown(): void {
        this.showDropdown = false;
    }

    exportAsPng(): void {
        if (this.targetElement) {
            this.exportService.exportChartAsPng(this.targetElement, this.filename);
        }
        this.closeDropdown();
    }

    exportAsSvg(): void {
        if (this.targetElement) {
            this.exportService.exportChartAsSvg(this.targetElement, this.filename);
        }
        this.closeDropdown();
    }

    exportAsPdf(): void {
        if (this.targetElement) {
            this.exportService.exportChartAsPdf(this.targetElement, this.filename);
        }
        this.closeDropdown();
    }

    exportAsCsv(): void {
        if (this.chartData) {
            this.exportService.exportDataAsCsv(this.chartData, this.filename);
        }
        this.closeDropdown();
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