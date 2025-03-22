import { Component, HostListener, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoberturaParserService } from '../../services/cobertura-parser.service';
import { CoverageStoreService } from '../../services/coverage-store.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../services/utils/notification.service';
import { ThemeService } from '../../services/utils/theme.service';
@Component({
    selector: 'app-file-uploader',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss']
})
export class FileUploaderComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    private themeSubscription: Subscription | null = null;

    isLoading = false;
    errorMessage = '';
    isDragOver = false;
    previousFiles: string[] = [];

    constructor(
        private parserService: CoberturaParserService,
        private coverageStore: CoverageStoreService,
        private notificationService: NotificationService,
        private themeService: ThemeService
    ) {
        // Load previously used files from localStorage
        this.loadPreviousFiles();
    }

    ngOnInit(): void {
        this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
            this.isDarkTheme = isDark;
        });
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }
    }

    @HostListener('dragover', ['$event'])
    onDragOver(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = true;
    }

    @HostListener('dragleave', ['$event'])
    onDragLeave(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;
    }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.isDragOver = false;

        if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
            this.processFile(event.dataTransfer.files[0]);
        }
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            return;
        }

        this.processFile(input.files[0]);
    }

    processFile(file: File): void {
        // Check file type
        if (!file.name.endsWith('.xml')) {
            this.errorMessage = 'Please select an XML file';
            this.notificationService.showError('Invalid file type', 'Please select a Cobertura XML file');
            return;
        }

        // Check file size (limit to 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.errorMessage = 'File size exceeds 10MB limit';
            this.notificationService.showError('File too large', 'The maximum file size is 10MB');
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            try {
                const content = e.target?.result as string;

                if (!content) {
                    throw new Error('Failed to read the file content');
                }

                // Save file to history
                this.addToRecentFiles(file.name, content);

                // Validate that it's a Cobertura XML file
                if (!content.includes('<coverage') || !content.includes('line-rate')) {
                    throw new Error('Not a valid Cobertura XML file');
                }

                const coverageData = this.parserService.parseCoberturaXml(content);
                if (coverageData) {
                    // Update coverage data
                    this.coverageStore.setCoverageData(coverageData);

                    // Show success notification
                    this.notificationService.showSuccess(
                        'File Loaded Successfully',
                        `Loaded coverage data with ${coverageData.summary.lineRate.toFixed(1)}% line coverage`
                    );
                } else {
                    this.errorMessage = 'Failed to parse the Cobertura XML file';
                    this.notificationService.showError('Parse Error', 'Could not parse the coverage data');
                }
            } catch (error: any) {
                this.errorMessage = error.message || 'An error occurred while processing the file';
                this.notificationService.showError('Error', this.errorMessage);
                console.error(error);
            } finally {
                this.isLoading = false;
            }
        };

        reader.onerror = () => {
            this.errorMessage = 'Failed to read the file';
            this.notificationService.showError('File Error', 'Could not read the file');
            this.isLoading = false;
        };

        reader.readAsText(file);
    }

    loadSampleData(): void {
        this.isLoading = true;
        this.errorMessage = '';

        // Simulate loading with timeout
        setTimeout(() => {
            try {
                const sampleData = this.generateSampleCoverageData();
                this.coverageStore.setCoverageData(sampleData);
                this.notificationService.showSuccess('Sample Data Loaded', 'Sample coverage data has been loaded for demonstration');
            } catch (error) {
                this.errorMessage = 'Failed to load sample data';
                this.notificationService.showError('Error', 'Failed to load sample data');
            } finally {
                this.isLoading = false;
            }
        }, 1000);
    }

    loadFromHistory(fileName: string): void {
        // Get the saved file content from localStorage
        try {
            const fileContent = localStorage.getItem(`file-content:${fileName}`);
            if (!fileContent) {
                this.notificationService.showError('File Not Found', 'Could not find the saved file content');
                return;
            }

            // Parse the saved content
            const coverageData = this.parserService.parseCoberturaXml(fileContent);
            if (coverageData) {
                this.coverageStore.setCoverageData(coverageData);
                this.notificationService.showSuccess('Historical File Loaded', `Loaded ${fileName} with ${coverageData.summary.lineRate.toFixed(1)}% coverage`);
            }
        } catch (error) {
            console.error('Error loading from history:', error);
            this.notificationService.showError('Error', 'Failed to load historical file');
        }
    }

    private loadPreviousFiles(): void {
        try {
            const files = localStorage.getItem('recent-files');
            if (files) {
                this.previousFiles = JSON.parse(files);
            }
        } catch (error) {
            console.error('Error loading previous files:', error);
            this.previousFiles = [];
        }
    }

    private addToRecentFiles(fileName: string, content: string): void {
        // Add to beginning of array
        this.previousFiles.unshift(fileName);

        // Remove duplicates
        this.previousFiles = [...new Set(this.previousFiles)];

        // Keep only the last 5 files
        if (this.previousFiles.length > 5) {
            this.previousFiles = this.previousFiles.slice(0, 5);
        }

        // Save to localStorage
        localStorage.setItem('recent-files', JSON.stringify(this.previousFiles));

        // Save file content if provided
        if (content) {
            localStorage.setItem(`file-content:${fileName}`, content);
        }
    }

    private generateSampleCoverageData() {
        return {
            summary: {
                lineRate: 78.5,
                branchRate: 65.3,
                methodRate: 72.8,
                classRate: 70.2,
                complexity: 34,
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