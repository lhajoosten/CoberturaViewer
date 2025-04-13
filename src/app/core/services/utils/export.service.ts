import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { ToastService } from './toast.service';

@Injectable({
    providedIn: 'root'
})
export class ExportService {
    constructor(private toastService: ToastService) { }

    /**
     * Export chart as PNG image
     */
    exportChartAsPng(chartElement: HTMLElement, filename: string = 'chart'): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!chartElement) {
                this.toastService.showError('Export Error', 'No chart element found to export');
                reject(new Error('No chart element'));
                return;
            }

            try {
                // Handle Google Charts - find the iframe if it exists
                const googleChartIframe = chartElement.querySelector('iframe');
                const elementToCapture = googleChartIframe ? googleChartIframe : chartElement;

                // Use html2canvas with improved options
                html2canvas(elementToCapture, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: true // Enable logging for debugging
                }).then(canvas => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${filename}.png`;
                            link.click();
                            URL.revokeObjectURL(url);
                            this.toastService.showSuccess('Export Complete', 'Chart exported as PNG');
                            resolve();
                        } else {
                            reject(new Error('Failed to create blob'));
                        }
                    }, 'image/png', 1.0);
                }).catch(e => {
                    console.error('html2canvas error:', e);
                    reject(e);
                });
            } catch (error) {
                console.error('Error exporting chart:', error);
                this.toastService.showError('Export Failed', 'Could not export the chart as PNG');
                reject(error);
            }
        });
    }

    /**
     * Export chart as SVG
     */
    exportChartAsSvg(chartElement: HTMLElement, filename: string = 'chart'): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!chartElement) {
                this.toastService.showError('Export Error', 'No chart element found to export');
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

                // Make sure dimensions are set
                const bounds = svg.getBoundingClientRect();
                svgClone.setAttribute('width', bounds.width.toString());
                svgClone.setAttribute('height', bounds.height.toString());

                // Inline all CSS styles for the SVG elements
                this.inlineStyles(svgClone);

                // Convert to string
                const svgString = new XMLSerializer().serializeToString(svgClone);

                // Add XML declaration
                const completesvgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgString;

                // Create Blob and download link
                const blob = new Blob([completesvgString], { type: 'image/svg+xml' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.svg`;
                link.click();

                // Clean up
                URL.revokeObjectURL(url);
                this.toastService.showSuccess('Export Complete', 'Chart exported as SVG');
            } catch (error) {
                console.error('Error exporting SVG:', error);
                this.toastService.showError('Export Failed', `Could not export the chart as SVG: ${error}`);
            }
        });
    }

    /**
     * Export chart as PDF
     */
    exportChartAsPdf(chartElement: HTMLElement, filename: string = 'chart'): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!chartElement) {
                this.toastService.showError('Export Error', 'No chart element found to export');
                return;
            }

            try {
                html2canvas(chartElement, {
                    // Add these options for better quality and to ensure styles are captured
                    scale: 2, // Higher scale for better quality
                    useCORS: true, // Handle cross-origin images
                    allowTaint: true,
                    backgroundColor: '#ffffff' // Ensure white background
                }).then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    // Create PDF with proper constructor
                    const pdf = new jsPDF({
                        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                        unit: 'mm'
                    });

                    // Calculate dimensions to fit the image on the page
                    const pageWidth = pdf.internal.pageSize.getWidth();
                    const pageHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = pageWidth - 20; // Leave some margin
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    // Center the image
                    const x = 10;
                    const y = 10;

                    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
                    pdf.save(`${filename}.pdf`);

                    this.toastService.showSuccess('Export Complete', 'Chart exported as PDF');
                });
            } catch (error) {
                console.error('Error exporting PDF:', error);
                this.toastService.showError('Export Failed', 'Could not export the chart as PDF');
            }
        });
    }

    /**
     * Export chart data as CSV
     */
    exportDataAsCsv(data: any[][], filename: string = 'chart-data'): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                if (!data || data.length === 0) {
                    throw new Error('No data to export');
                }

                // Convert data array to CSV string
                let csvContent = '';

                data.forEach(row => {
                    // Handle different data types safely
                    const csvRow = row.map(cell => {
                        if (cell === null || cell === undefined) {
                            return ''; // Handle null/undefined values
                        }

                        // Handle different data types
                        if (typeof cell === 'string') {
                            // Escape quotes and wrap in quotes
                            return `"${cell.replace(/"/g, '""')}"`;
                        } else if (cell instanceof Date) {
                            return `"${cell.toISOString()}"`;
                        } else if (typeof cell === 'object') {
                            try {
                                // Convert objects to JSON strings
                                return `"${JSON.stringify(cell).replace(/"/g, '""')}"`;
                            } catch (e) {
                                return '""'; // If JSON conversion fails
                            }
                        }
                        // Numbers and booleans can be directly converted
                        return cell.toString();
                    }).join(',');

                    csvContent += csvRow + '\n';
                });

                // Create Blob and download link with BOM for Excel compatibility
                const BOM = '\uFEFF'; // UTF-8 BOM
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.csv`;
                link.click();

                // Clean up
                URL.revokeObjectURL(url);
                this.toastService.showSuccess('Export Complete', 'Data exported as CSV');
            } catch (error) {
                console.error('Error exporting CSV:', error);
                this.toastService.showError('Export Failed', 'Could not export the data as CSV');
            }
        });
    }

    /**
     * Special export function for Google Charts
     */
    exportGoogleChartAsPng(chartElement: HTMLElement, filename: string = 'chart'): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            try {
                if (!chartElement) {
                    throw new Error('No chart element found');
                }

                // Use the extractGoogleChart method here
                const canvas = await this.extractGoogleChart(chartElement);

                if (!canvas) {
                    throw new Error('Failed to extract chart as canvas');
                }

                // Use the canvas to create a downloadable PNG
                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.download = `${filename}.png`;
                link.href = pngUrl;
                link.click();

                this.toastService.showSuccess('Export Complete', 'Chart exported as PNG');
                resolve();

            } catch (error) {
                console.error('Error exporting Google chart:', error);
                this.toastService.showError('Export Failed', 'Could not export the Google chart');
                reject(error);
            }
        });
    }

    // Helper methods
    private inlineStyles(svg: SVGElement): void {
        // Get computed styles from document
        const styleSheets = document.styleSheets;
        const rules: string[] = [];

        // Extract relevant styles
        for (let i = 0; i < styleSheets.length; i++) {
            try {
                const cssRules = styleSheets[i].cssRules || styleSheets[i].rules;
                if (cssRules) {
                    for (let j = 0; j < cssRules.length; j++) {
                        const rule = cssRules[j];
                        // Only consider rules that might apply to SVG elements
                        if (rule.cssText && (
                            rule.cssText.includes('svg') ||
                            rule.cssText.includes('path') ||
                            rule.cssText.includes('circle') ||
                            rule.cssText.includes('rect') ||
                            rule.cssText.includes('text') ||
                            rule.cssText.includes('line') ||
                            rule.cssText.includes('g[class')
                        )) {
                            rules.push(rule.cssText);
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not access stylesheet rules', e);
            }
        }

        // Create a style element and add it to the SVG
        if (rules.length > 0) {
            const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            style.setAttribute('type', 'text/css');
            style.textContent = rules.join('\n');
            svg.insertBefore(style, svg.firstChild);
        }

        // Also apply computed styles directly to elements
        this.applyComputedStyles(svg);
    }

    private applyComputedStyles(element: Element): void {
        const computedStyle = getComputedStyle(element);
        const svgElement = element as SVGElement;

        // Important styles to carry over
        const stylesToApply = [
            'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
            'opacity', 'font-family', 'font-size', 'text-anchor',
            'dominant-baseline', 'font-weight'
        ];

        stylesToApply.forEach(style => {
            const value = computedStyle.getPropertyValue(style);
            if (value && value !== '') {
                svgElement.style.setProperty(style, value);
            }
        });

        // Process children recursively
        Array.from(element.children).forEach(child => {
            this.applyComputedStyles(child);
        });
    }

    private extractGoogleChart(container: HTMLElement): Promise<HTMLCanvasElement | null> {
        return new Promise<HTMLCanvasElement | null>((outerResolve, outerReject) => {
            try {
                // Try to find the SVG directly first
                let svgElement = container.querySelector('svg');

                // If no direct SVG, try finding it in an iframe
                if (!svgElement) {
                    const iframe = container.querySelector('iframe');
                    if (iframe && iframe.contentDocument) {
                        svgElement = iframe.contentDocument.querySelector('svg');
                    }
                }

                // If no SVG found, resolve with null
                if (!svgElement) {
                    outerResolve(null);
                    return;
                }

                const canvas = document.createElement('canvas');
                const bounds = svgElement.getBoundingClientRect();

                // Set canvas dimensions
                canvas.width = bounds.width;
                canvas.height = bounds.height;

                // Get canvas context
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('Could not get canvas context');
                }

                // Set white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Convert SVG to data URL
                const svgData = new XMLSerializer().serializeToString(svgElement);
                const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                // Create image from SVG
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    URL.revokeObjectURL(url);
                    outerResolve(canvas);  // Resolve the outer promise with the canvas
                };
                img.onerror = (e) => {
                    console.error('Error loading SVG image:', e);
                    URL.revokeObjectURL(url);
                    outerReject(new Error('Failed to load SVG image'));
                };
                img.src = url;

            } catch (error) {
                console.error('Error extracting Google Chart:', error);
                outerResolve(null);
            }
        });
    }
}