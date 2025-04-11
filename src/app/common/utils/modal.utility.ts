import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ModalType = 'about' | 'help' | 'shortcuts' | 'upload' | null;

@Injectable({
    providedIn: 'root'
})
export class ModalService implements OnDestroy {
    // Observable to track which modal should be open, if any
    private activeModalSource = new BehaviorSubject<ModalType>(null);
    activeModal$ = this.activeModalSource.asObservable();

    // Track if we've set up the key handler
    private keyHandlerInitialized = false;

    constructor() {
        this.setupKeyboardHandler();
    }

    ngOnDestroy(): void {
        // Remove the event listener when service is destroyed
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Set up global keyboard handler for modals
     */
    private setupKeyboardHandler(): void {
        if (!this.keyHandlerInitialized) {
            document.addEventListener('keydown', this.handleKeyDown.bind(this));
            this.keyHandlerInitialized = true;
        }
    }

    /**
     * Handle keyboard events for modals
     */
    private handleKeyDown(event: KeyboardEvent): void {
        // Close modal on ESC key press if any modal is open
        if (event.key === 'Escape' && this.activeModalSource.value !== null) {
            this.closeModal();
            event.preventDefault();
        }
    }

    /**
     * Open the About modal
     */
    openAboutModal(): void {
        this.activeModalSource.next('about');
    }

    /**
     * Open the Help modal
     */
    openHelpModal(): void {
        this.activeModalSource.next('help');
    }

    /**
     * Open the Keyboard Shortcuts modal
     */
    openKeyboardShortcutsModal(): void {
        this.activeModalSource.next('shortcuts');
    }

    /**
     * Open the Upload modal
     */
    openUploadModal(): void {
        this.activeModalSource.next('upload');
    }

    /**
     * Close any open modal
     */
    closeModal(): void {
        this.activeModalSource.next(null);
    }
}