import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoberturaParserService } from '../../services/cobertura-parser.service';
import { CoverageStoreService } from '../../services/coverage-store.service';

@Component({
    selector: 'app-file-uploader',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss']
})
export class FileUploaderComponent {
    isLoading = false;
    errorMessage = '';
    isDragOver = false;

    constructor(
        private parserService: CoberturaParserService,
        private coverageStore: CoverageStoreService
    ) { }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            return;
        }

        this.processFile(input.files[0]);
    }

    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = true;
    }

    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;
    }

    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;

        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            this.processFile(event.dataTransfer.files[0]);
        }
    }

    processFile(file: File): void {
        if (!file.name.endsWith('.xml')) {
            this.errorMessage = 'Please select an XML file';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const content = e.target?.result as string;
                const coverageData = this.parserService.parseCoberturaXml(content);
                if (coverageData) {
                    this.coverageStore.setCoverageData(coverageData);
                } else {
                    this.errorMessage = 'Failed to parse the Cobertura XML file';
                }
            } catch (error) {
                this.errorMessage = 'An error occurred while processing the file';
                console.error(error);
            } finally {
                this.isLoading = false;
            }
        };

        reader.onerror = () => {
            this.errorMessage = 'Failed to read the file';
            this.isLoading = false;
        };

        reader.readAsText(file);
    }

    loadSampleData(): void {
        this.isLoading = true;
        this.errorMessage = '';

        // Simulate loading
        setTimeout(() => {
            const sampleData = this.generateSampleCoverageData();
            this.coverageStore.setCoverageData(sampleData);
            this.isLoading = false;
        }, 1000);
    }

    private generateSampleCoverageData() {
        return {
            summary: {
                lineRate: 78.5,
                branchRate: 65.3,
                linesValid: 1250,
                linesCovered: 981,
                timestamp: new Date().toISOString()
            },
            packages: [
                {
                    name: 'com.example.model',
                    lineRate: 92.7,
                    branchRate: 85.0,
                    classes: Array(5).fill(0).map((_, i) => ({
                        name: `Model${i + 1}`,
                        filename: `Model${i + 1}.java`,
                        lineRate: 90 + Math.random() * 10,
                        branchRate: 85 + Math.random() * 15,
                        lines: Array(Math.floor(50 + Math.random() * 50)).fill(0).map((_, j) => ({
                            number: j + 1,
                            hits: Math.random() > 0.1 ? 1 : 0,
                            branch: Math.random() > 0.7
                        }))
                    }))
                },
                {
                    name: 'com.example.service',
                    lineRate: 75.2,
                    branchRate: 62.8,
                    classes: Array(8).fill(0).map((_, i) => ({
                        name: `Service${i + 1}`,
                        filename: `Service${i + 1}.java`,
                        lineRate: 65 + Math.random() * 25,
                        branchRate: 55 + Math.random() * 25,
                        lines: Array(Math.floor(30 + Math.random() * 100)).fill(0).map((_, j) => ({
                            number: j + 1,
                            hits: Math.random() > 0.3 ? 1 : 0,
                            branch: Math.random() > 0.6
                        }))
                    }))
                },
                {
                    name: 'com.example.controller',
                    lineRate: 65.8,
                    branchRate: 48.5,
                    classes: Array(4).fill(0).map((_, i) => ({
                        name: `Controller${i + 1}`,
                        filename: `Controller${i + 1}.java`,
                        lineRate: 55 + Math.random() * 25,
                        branchRate: 40 + Math.random() * 25,
                        lines: Array(Math.floor(40 + Math.random() * 60)).fill(0).map((_, j) => ({
                            number: j + 1,
                            hits: Math.random() > 0.45 ? 1 : 0,
                            branch: Math.random() > 0.5
                        }))
                    }))
                }
            ]
        };
    }
}