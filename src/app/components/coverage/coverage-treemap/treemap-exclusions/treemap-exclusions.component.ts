import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExclusionPattern } from '../../../../models/treemap-config.model';

@Component({
    selector: 'app-treemap-exclusions',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './treemap-exclusions.component.html',
    styleUrls: ['./treemap-exclusions.component.scss']
})
export class TreemapExclusionsComponent implements OnInit {
    @Input() isDarkTheme = false;
    @Input() patterns: ExclusionPattern[] = [];

    @Output() close = new EventEmitter<void>();
    @Output() patternsChange = new EventEmitter<ExclusionPattern[]>();
    @Output() applyExclusions = new EventEmitter<ExclusionPattern[]>();

    newPattern: ExclusionPattern = this.getEmptyPattern();

    // Sample patterns that users might find useful
    samplePatterns: { label: string, pattern: ExclusionPattern }[] = [
        {
            label: 'Event classes',
            pattern: {
                pattern: 'Event',
                type: 'class',
                description: 'Domain events typically have high coverage by nature',
                enabled: true
            }
        },
        {
            label: 'DTO classes',
            pattern: {
                pattern: 'DTO',
                type: 'class',
                description: 'Data Transfer Objects are simple containers',
                enabled: true
            }
        },
        {
            label: 'Test infrastructure',
            pattern: {
                pattern: 'Test',
                type: 'package',
                description: 'Test support classes should not count in coverage',
                enabled: true
            }
        }
    ];

    ngOnInit(): void {
        // Initialize with empty pattern if none provided
        if (!this.patterns) {
            this.patterns = [];
        }
    }

    getEmptyPattern(): ExclusionPattern {
        return {
            pattern: '',
            type: 'class',
            description: '',
            enabled: true
        };
    }

    onClose(): void {
        this.close.emit();
    }

    onAddPattern(): void {
        if (!this.newPattern.pattern) return;

        // Add new pattern to the list
        this.patterns.push({
            ...this.newPattern,
            enabled: true
        });

        // Reset form
        this.newPattern = this.getEmptyPattern();

        // Emit patterns change
        this.patternsChange.emit([...this.patterns]);
    }

    onRemovePattern(index: number): void {
        if (index >= 0 && index < this.patterns.length) {
            this.patterns.splice(index, 1);
            this.patternsChange.emit([...this.patterns]);
        }
    }

    onPatternToggle(pattern: ExclusionPattern): void {
        // Just emit the updated patterns
        this.patternsChange.emit([...this.patterns]);
    }

    onApplyExclusions(): void {
        this.applyExclusions.emit([...this.patterns]);
        this.close.emit();
    }

    addSamplePattern(pattern: ExclusionPattern): void {
        // Check if a similar pattern already exists
        const exists = this.patterns.some(p =>
            p.pattern === pattern.pattern && p.type === pattern.type
        );

        if (!exists) {
            this.patterns.push({ ...pattern });
            this.patternsChange.emit([...this.patterns]);
        }
    }

    // Enable all patterns
    enableAllPatterns(): void {
        this.patterns.forEach(p => p.enabled = true);
        this.patternsChange.emit([...this.patterns]);
    }

    // Disable all patterns
    disableAllPatterns(): void {
        this.patterns.forEach(p => p.enabled = false);
        this.patternsChange.emit([...this.patterns]);
    }
}