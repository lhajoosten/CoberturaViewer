import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ModalType = 'about' | 'help' | 'upload' | 'shortcuts' | null;

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    // Observable to track which modal should be open, if any
    private activeModalSource = new BehaviorSubject<ModalType>(null);
    activeModal$ = this.activeModalSource.asObservable();

    constructor() { }

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