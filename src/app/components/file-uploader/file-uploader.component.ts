import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoberturaParserService } from '../../services/cobertura-parser.service';
import { CoverageStoreService } from '../../services/coverage-store.service';

@Component({
    selector: 'app-file-uploader',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss']
})
export class FileUploaderComponent {
    isLoading = false;
    errorMessage = '';

    constructor(
        private parserService: CoberturaParserService,
        private coverageStore: CoverageStoreService
    ) { }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) {
            return;
        }

        const file = input.files[0];
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
}