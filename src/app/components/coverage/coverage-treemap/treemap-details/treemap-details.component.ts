import { Component, Input, Output, EventEmitter, OnDestroy, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Coverage, ClassInfo } from '../../../../models/coverage.model';
import { ClassDetailsComponent } from '../../../class-details/class-details.component';
import { ThemeService } from '../../../../services/utils/theme.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-treemap-details',
    standalone: true,
    imports: [CommonModule, ClassDetailsComponent],
    templateUrl: './treemap-details.component.html',
    styleUrls: ['./treemap-details.component.scss']
})
export class TreemapDetailsComponent implements OnInit, OnDestroy {
    @Input() selectedNode: Coverage | null = null;
    @Input() selectedClass: ClassInfo | null = null;
    @Input() similarClasses: Coverage[] = [];
    @Input() isDarkTheme = false;

    @Output() closeDetails = new EventEmitter<void>();
    @Output() selectSimilarNode = new EventEmitter<Coverage>();

    showClassLines = false;

    private themeSubscription: Subscription | null = null;

    constructor(private themeService: ThemeService) { }

    ngOnInit(): void {
        // Subscribe to theme changes if not provided externally
        if (this.isDarkTheme === undefined) {
            this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
                this.isDarkTheme = isDark;
            });
        }
    }

    ngOnDestroy(): void {
        if (this.themeSubscription) {
            this.themeSubscription.unsubscribe();
        }

        // Restore scrolling
        document.body.style.overflow = '';
    }

    onClose(): void {
        this.closeDetails.emit();
    }

    onSelectNode(node: Coverage): void {
        this.selectSimilarNode.emit(node);
    }

    toggleClassLines(): void {
        this.showClassLines = !this.showClassLines;
    }

    getCoverageClass(coverage: number): string {
        if (coverage >= 90) return 'excellent';
        if (coverage >= 75) return 'good';
        if (coverage >= 50) return 'moderate';
        return 'poor';
    }

    /**
     * Handle clicks on the overlay background
     * Close the modal when clicking outside the details panel
     */
    onOverlayClick(event: MouseEvent): void {
        if ((event.target as HTMLElement).classList.contains('details-modal-overlay')) {
            this.closeDetails.emit();
        }
    }

    /**
     * Handle escape key press
     */
    @HostListener('document:keydown.escape')
    onEscapeKey(): void {
        this.closeDetails.emit();
    }
}