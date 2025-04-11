import { Component, HostListener, Input, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoberturaParserService } from '../../common/services/cobertura-parser.service';
import { CoverageStoreService } from '../../common/services/coverage-store.service';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../common/utils/notification.utility';
import { ThemeService } from '../../common/utils/theme.utility';
import { CoverageData } from '../../common/models/coverage.model';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
    selector: 'app-file-uploader',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss'],
    animations: [
        trigger('fadeInOut', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(-10px)' }),
                animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ]),
            transition(':leave', [
                animate('150ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)' }))
            ])
        ])
    ]
})
export class FileUploaderComponent implements OnInit, OnDestroy {
    @Input() isDarkTheme = false;
    @Output() uploadComplete = new EventEmitter<void>();

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
        // Reset the input so the same file can be selected again
        input.value = '';
    }

    processFile(file: File): void {
        // Check file type
        if (!file.name.endsWith('.xml')) {
            this.errorMessage = 'Please select an XML file with Cobertura coverage data';
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
                    throw new Error('Not a valid Cobertura XML file. The file must contain coverage and line-rate attributes.');
                }

                const coverageData = this.parserService.parseCoberturaXml(content);
                if (coverageData) {
                    // Update coverage data
                    this.coverageStore.setCoverageData(coverageData);

                    // Show success notification
                    this.notificationService.showSuccess(
                        'File Loaded Successfully',
                        `Loaded coverage data with ${coverageData.summary.lineCoverage.toFixed(1)}% line coverage`
                    );

                    // Emit upload complete event
                    this.uploadComplete.emit();
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

    loadSampleData(type: 'basic' | 'complex' = 'basic'): void {
        this.isLoading = true;
        this.errorMessage = '';

        // Simulate loading with timeout
        setTimeout(() => {
            try {
                const sampleData = type === 'complex'
                    ? this.generateComplexSampleData()
                    : this.generateBasicSampleData();

                this.coverageStore.setCoverageData(sampleData);

                this.notificationService.showSuccess(
                    'Sample Data Loaded',
                    `Loaded ${type} sample data with ${sampleData.summary.lineCoverage.toFixed(1)}% coverage`
                );

                // Add to recent files
                this.addToRecentFiles(`sample-${type}-data.xml`, JSON.stringify(sampleData));

                // Emit upload complete event
                this.uploadComplete.emit();
            } catch (error) {
                this.errorMessage = 'Failed to load sample data';
                this.notificationService.showError('Error', 'Failed to load sample data');
            } finally {
                this.isLoading = false;
            }
        }, 800);
    }

    loadFromHistory(fileName: string): void {
        this.isLoading = true;
        this.errorMessage = '';

        // Get the saved file content from localStorage
        setTimeout(() => {
            try {
                const fileContent = localStorage.getItem(`file-content:${fileName}`);
                if (!fileContent) {
                    this.notificationService.showError('File Not Found', 'Could not find the saved file content');
                    this.isLoading = false;
                    return;
                }

                // Check if it's a JSON string (sample data) or XML
                if (fileContent.trim().startsWith('{')) {
                    // It's JSON (sample data)
                    const coverageData = JSON.parse(fileContent);
                    this.coverageStore.setCoverageData(coverageData);
                } else {
                    // It's XML
                    const coverageData = this.parserService.parseCoberturaXml(fileContent);
                    if (!coverageData) {
                        throw new Error('Failed to parse saved coverage data');
                    }
                    this.coverageStore.setCoverageData(coverageData);
                }

                this.notificationService.showSuccess(
                    'Historical File Loaded',
                    `Loaded ${fileName} successfully`
                );

                // Move this file to the top of recent files
                this.addToRecentFiles(fileName);

                // Emit upload complete event
                this.uploadComplete.emit();
            } catch (error) {
                console.error('Error loading from history:', error);
                this.notificationService.showError('Error', 'Failed to load historical file');
            } finally {
                this.isLoading = false;
            }
        }, 600);
    }

    clearError(): void {
        this.errorMessage = '';
    }

    clearRecentFiles(): void {
        if (confirm('Are you sure you want to clear your recent files history?')) {
            // Clear files from localStorage
            this.previousFiles.forEach(file => {
                localStorage.removeItem(`file-content:${file}`);
            });

            localStorage.removeItem('recent-files');
            this.previousFiles = [];

            this.notificationService.showInfo('History Cleared', 'Your recent files history has been cleared');
        }
    }

    truncateFilename(filename: string): string {
        const maxLength = 20;
        if (filename.length <= maxLength) {
            return filename;
        }

        const extension = filename.split('.').pop() || '';
        const name = filename.substring(0, filename.length - extension.length - 1);

        // Keep the extension and truncate the name
        const truncatedName = name.substring(0, maxLength - extension.length - 3) + '...';
        return truncatedName + '.' + extension;
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

    private addToRecentFiles(fileName: string, content?: string): void {
        // Remove the file if it already exists to avoid duplicates
        const existingIndex = this.previousFiles.indexOf(fileName);
        if (existingIndex !== -1) {
            this.previousFiles.splice(existingIndex, 1);
        }

        // Add to beginning of array
        this.previousFiles.unshift(fileName);

        // Keep only the last 5 files
        if (this.previousFiles.length > 5) {
            // Remove the last file content from localStorage
            const removedFile = this.previousFiles.pop();
            if (removedFile) {
                localStorage.removeItem(`file-content:${removedFile}`);
            }
        }

        // Save to localStorage
        localStorage.setItem('recent-files', JSON.stringify(this.previousFiles));

        // Save file content if provided
        if (content) {
            localStorage.setItem(`file-content:${fileName}`, content);
        }
    }

    private generateBasicSampleData(): CoverageData {
        const packages = [
            {
                name: 'com.example.model',
                lineCoverage: 92.7,
                branchCoverage: 85.0,
                classes: Array(3).fill(0).map((_, i) => {
                    const generatedLines = Array(Math.floor(20 + Math.random() * 30)).fill(0).map((_, j) => ({
                        number: j + 1,
                        hits: Math.random() > 0.1 ? 1 : 0,
                        branch: Math.random() > 0.7
                    }));
                    return {
                        name: `Model${i + 1}`,
                        filename: `Model${i + 1}.java`,
                        lineCoverage: 90 + Math.random() * 10,
                        branchCoverage: 85 + Math.random() * 15,
                        lines: generatedLines,
                        linesValid: generatedLines.length,
                        linesCovered: generatedLines.filter(line => line.hits > 0).length
                    };
                })
            },
            {
                name: 'com.example.service',
                lineCoverage: 78.5,
                branchCoverage: 65.2,
                classes: Array(4).fill(0).map((_, i) => {
                    const generatedLines = Array(Math.floor(30 + Math.random() * 40)).fill(0).map((_, j) => ({
                        number: j + 1,
                        hits: Math.random() > 0.25 ? 1 : 0,
                        branch: Math.random() > 0.6
                    }));
                    return {
                        name: `Service${i + 1}`,
                        filename: `Service${i + 1}.java`,
                        lineCoverage: 70 + Math.random() * 20,
                        branchCoverage: 60 + Math.random() * 20,
                        lines: generatedLines,
                        linesValid: generatedLines.length,
                        linesCovered: generatedLines.filter(line => line.hits > 0).length
                    };
                })
            }
        ];

        // Compute package-level linesValid and linesCovered from classes' lines
        const computedPackages = packages.map(pkg => {
            const linesValid = pkg.classes.reduce((acc, cls) => acc + cls.lines.length, 0);
            const linesCovered = pkg.classes.reduce((acc, cls) => acc + cls.lines.filter(line => line.hits > 0).length, 0);
            return { ...pkg, linesValid, linesCovered };
        });

        return {
            summary: {
                lineCoverage: 84.7,
                branchCoverage: 76.3,
                methodCoverage: 80.5,
                classCoverage: 85.2,
                complexity: 24,
                linesValid: 450,
                linesCovered: 381,
                timestamp: new Date().toISOString()
            },
            packages: computedPackages
        };
    }

    private generateComplexSampleData(): CoverageData {
        const packages = [
            {
                name: 'com.example.model',
                lineCoverage: 92.7,
                branchCoverage: 85.0,
                classes: Array(5).fill(0).map((_, i) => {
                    const generatedLines = Array(Math.floor(50 + Math.random() * 50)).fill(0).map((_, j) => ({
                        number: j + 1,
                        hits: Math.random() > 0.1 ? 1 : 0,
                        branch: Math.random() > 0.7
                    }));
                    return {
                        name: `Model${i + 1}`,
                        filename: `Model${i + 1}.java`,
                        lineCoverage: 90 + Math.random() * 10,
                        branchCoverage: 85 + Math.random() * 15,
                        lines: generatedLines,
                        linesValid: generatedLines.length,
                        linesCovered: generatedLines.filter(line => line.hits > 0).length
                    };
                })
            },
            {
                name: 'com.example.service',
                lineCoverage: 75.2,
                branchCoverage: 62.8,
                classes: Array(8).fill(0).map((_, i) => {
                    const generatedLines = Array(Math.floor(30 + Math.random() * 100)).fill(0).map((_, j) => ({
                        number: j + 1,
                        hits: Math.random() > 0.3 ? 1 : 0,
                        branch: Math.random() > 0.6
                    }));
                    return {
                        name: `Service${i + 1}`,
                        filename: `Service${i + 1}.java`,
                        lineCoverage: 65 + Math.random() * 25,
                        branchCoverage: 55 + Math.random() * 25,
                        lines: generatedLines,
                        linesValid: generatedLines.length,
                        linesCovered: generatedLines.filter(line => line.hits > 0).length
                    };
                })
            },
            {
                name: 'com.example.controller',
                lineCoverage: 65.8,
                branchCoverage: 48.5,
                classes: Array(4).fill(0).map((_, i) => {
                    const generatedLines = Array(Math.floor(40 + Math.random() * 60)).fill(0).map((_, j) => ({
                        number: j + 1,
                        hits: Math.random() > 0.45 ? 1 : 0,
                        branch: Math.random() > 0.5
                    }));
                    return {
                        name: `Controller${i + 1}`,
                        filename: `Controller${i + 1}.java`,
                        lineCoverage: 55 + Math.random() * 25,
                        branchCoverage: 40 + Math.random() * 25,
                        lines: generatedLines,
                        linesValid: generatedLines.length,
                        linesCovered: generatedLines.filter(line => line.hits > 0).length
                    };
                })
            },
            {
                name: 'com.example.repository',
                lineCoverage: 88.3,
                branchCoverage: 73.1,
                classes: Array(6).fill(0).map((_, i) => {
                    const generatedLines = Array(Math.floor(30 + Math.random() * 40)).fill(0).map((_, j) => ({
                        number: j + 1,
                        hits: Math.random() > 0.15 ? 1 : 0,
                        branch: Math.random() > 0.65
                    }));
                    return {
                        name: `Repository${i + 1}`,
                        filename: `Repository${i + 1}.java`,
                        lineCoverage: 80 + Math.random() * 15,
                        branchCoverage: 70 + Math.random() * 20,
                        lines: generatedLines,
                        linesValid: generatedLines.length,
                        linesCovered: generatedLines.filter(line => line.hits > 0).length
                    };
                })
            },
            {
                name: 'com.example.util',
                lineCoverage: 55.4,
                branchCoverage: 42.3,
                classes: Array(3).fill(0).map((_, i) => {
                    const generatedLines = Array(Math.floor(20 + Math.random() * 30)).fill(0).map((_, j) => ({
                        number: j + 1,
                        hits: Math.random() > 0.5 ? 1 : 0,
                        branch: Math.random() > 0.6
                    }));
                    return {
                        name: `Utility${i + 1}`,
                        filename: `Utility${i + 1}.java`,
                        lineCoverage: 45 + Math.random() * 25,
                        branchCoverage: 35 + Math.random() * 25,
                        lines: generatedLines,
                        linesValid: generatedLines.length,
                        linesCovered: generatedLines.filter(line => line.hits > 0).length
                    };
                })
            }
        ];

        // Compute package-level linesValid and linesCovered from classes' lines
        const computedPackages = packages.map(pkg => {
            const linesValid = pkg.classes.reduce((acc, cls) => acc + cls.lines.length, 0);
            const linesCovered = pkg.classes.reduce((acc, cls) => acc + cls.lines.filter(line => line.hits > 0).length, 0);
            return { ...pkg, linesValid, linesCovered };
        });

        return {
            summary: {
                lineCoverage: 78.5,
                branchCoverage: 65.3,
                methodCoverage: 72.8,
                classCoverage: 70.2,
                complexity: 34,
                linesValid: 1250,
                linesCovered: 981,
                timestamp: new Date().toISOString()
            },
            packages: computedPackages
        };
    }
}