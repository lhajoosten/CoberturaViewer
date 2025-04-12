import { Injectable } from '@angular/core';
import { NotificationService } from './notification.service';
import html2canvas from 'html2canvas';
import * as jspdf from 'jspdf';

@Injectable({
    providedIn: 'root'
})
export class ExportService {
    constructor(private notificationService: NotificationService) { }

    /**
     * Export chart as PNG image
     */
    exportChartAsPng(chartElement: HTMLElement, filename: string = 'chart'): void {
        if (!chartElement) {
            this.notificationService.showError('Export Error', 'No chart element found to export');
            return;
        }

        try {
            // Use html2canvas library if available
            if (typeof html2canvas !== 'undefined') {
                this.exportWithHtml2Canvas(chartElement, filename);
            } else {
                // Fallback to SVG export if the chart contains an SVG
                const svg = chartElement.querySelector('svg');
                if (svg) {
                    this.exportSvgAsPng(svg, filename);
                } else {
                    throw new Error('Chart does not contain an SVG element and html2canvas is not available');
                }
            }
        } catch (error) {
            console.error('Error exporting chart:', error);
            this.notificationService.showError('Export Failed', 'Could not export the chart as PNG');
        }
    }

    /**
     * Export chart as SVG
     */
    exportChartAsSvg(chartElement: HTMLElement, filename: string = 'chart'): void {
        if (!chartElement) {
            this.notificationService.showError('Export Error', 'No chart element found to export');
            return;
        }

        try {
            const svg = chartElement.querySelector('svg');
            if (!svg) {
                throw new Error('No SVG element found in the chart');
            }

            // Clone the SVG to avoid modifying the original
            const svgClone = svg.cloneNode(true) as SVGElement;

            // Add namespaces for compatibility
            svgClone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            svgClone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

            // Convert to string
            const svgString = new XMLSerializer().serializeToString(svgClone);

            // Create Blob and download link
            const blob = new Blob([svgString], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.svg`;
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            this.notificationService.showSuccess('Export Complete', 'Chart exported as SVG');
        } catch (error) {
            console.error('Error exporting SVG:', error);
            this.notificationService.showError('Export Failed', 'Could not export the chart as SVG');
        }
    }

    /**
     * Export chart as PDF
     */
    exportChartAsPdf(chartElement: HTMLElement, filename: string = 'chart'): void {
        if (!chartElement) {
            this.notificationService.showError('Export Error', 'No chart element found to export');
            return;
        }

        try {
            // Check if jsPDF is available
            if (typeof jspdf === 'undefined') {
                throw new Error('jsPDF library is not available');
            }

            // Use html2canvas to capture the chart
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas library is not available');
            }

            html2canvas(chartElement).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jspdf.jsPDF({
                    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                    unit: 'mm'
                });

                // Calculate dimensions to fit the image on the page
                const imgWidth = 210; // A4 width in mm
                const imgHeight = canvas.height * imgWidth / canvas.width;

                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                pdf.save(`${filename}.pdf`);

                this.notificationService.showSuccess('Export Complete', 'Chart exported as PDF');
            });
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.notificationService.showError('Export Failed', 'Could not export the chart as PDF');
        }
    }

    /**
     * Export chart data as CSV
     */
    exportDataAsCsv(data: any[][], filename: string = 'chart-data'): void {
        try {
            if (!data || data.length === 0) {
                throw new Error('No data to export');
            }

            // Convert data array to CSV string
            let csvContent = '';

            data.forEach(row => {
                const csvRow = row.map(cell => {
                    // Handle different data types
                    if (typeof cell === 'string') {
                        // Escape quotes and wrap in quotes if needed
                        return `"${cell.replace(/"/g, '""')}"`;
                    } else if (cell instanceof Date) {
                        return `"${cell.toISOString()}"`;
                    } else if (typeof cell === 'object' && cell !== null) {
                        // Convert objects to JSON strings
                        return `"${JSON.stringify(cell).replace(/"/g, '""')}"`;
                    }
                    return cell;
                }).join(',');

                csvContent += csvRow + '\n';
            });

            // Create Blob and download link
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.csv`;
            link.click();

            // Clean up
            URL.revokeObjectURL(url);
            this.notificationService.showSuccess('Export Complete', 'Data exported as CSV');
        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.notificationService.showError('Export Failed', 'Could not export the data as CSV');
        }
    }

    // Helper methods
    private exportWithHtml2Canvas(element: HTMLElement, filename: string): void {
        html2canvas(element).then(canvas => {
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.notificationService.showSuccess('Export Complete', 'Chart exported as PNG');
        });
    }

    private exportSvgAsPng(svg: SVGElement, filename: string): void {
        // Clone the SVG to avoid modifying the original
        const svgClone = svg.cloneNode(true) as SVGElement;

        // Set dimensions if not already set
        if (!svgClone.getAttribute('width') || !svgClone.getAttribute('height')) {
            const bounds = svg.getBoundingClientRect();
            svgClone.setAttribute('width', bounds.width.toString());
            svgClone.setAttribute('height', bounds.height.toString());
        }

        // Convert to string
        const svgString = new XMLSerializer().serializeToString(svgClone);

        // Create canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // Set dimensions
        const width = parseInt(svgClone.getAttribute('width') || '300');
        const height = parseInt(svgClone.getAttribute('height') || '150');

        canvas.width = width;
        canvas.height = height;

        // Create image
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);

            // Download
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();

            this.notificationService.showSuccess('Export Complete', 'Chart exported as PNG');
        };

        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    }
}