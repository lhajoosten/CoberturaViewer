import { Injectable, TemplateRef, Type } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ModalConfig } from '../../models/modal.model';
import {
    AboutTemplateComponent,
    HelpTemplateComponent,
    KeyboardShortcutsTemplateComponent,
    SettingsTemplateComponent,
    ChangelogTemplateComponent
} from '../../../shared/templates/index';

export interface ModalRef {
    /** Close the modal */
    close: (result?: any) => void;
    /** Get the result as an observable */
    afterClosed: () => Observable<any>;
    /** Update modal configuration */
    updateConfig: (config: Partial<ModalConfig>) => void;
}

@Injectable({
    providedIn: 'root'
})
export class ModalService {
    private modals: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

    /**
     * Open a modal with a component
     */
    open(component: Type<any>, data?: any, config?: ModalConfig): ModalRef {
        const id = this.generateId();
        const afterClosedSubject = new BehaviorSubject<any>(null);
        const afterClosed = afterClosedSubject.asObservable();

        const modalInstance = {
            id,
            component,
            data,
            config: this.getDefaultConfig(config),
            afterClosedSubject
        };

        const currentModals = this.modals.getValue();
        this.modals.next([...currentModals, modalInstance]);

        const modalRef: ModalRef = {
            close: (result?: any) => this.close(id, result),
            afterClosed: () => afterClosed,
            updateConfig: (newConfig: Partial<ModalConfig>) => this.updateConfig(id, newConfig)
        };

        return modalRef;
    }

    /**
     * Open a modal with a template
     */
    openTemplate(template: TemplateRef<any>, data?: any, config?: ModalConfig): ModalRef {
        const id = this.generateId();
        const afterClosedSubject = new BehaviorSubject<any>(null);
        const afterClosed = afterClosedSubject.asObservable();

        const modalInstance = {
            id,
            template,
            data,
            config: this.getDefaultConfig(config),
            afterClosedSubject
        };

        const currentModals = this.modals.getValue();
        this.modals.next([...currentModals, modalInstance]);

        const modalRef: ModalRef = {
            close: (result?: any) => this.close(id, result),
            afterClosed: () => afterClosed,
            updateConfig: (newConfig: Partial<ModalConfig>) => this.updateConfig(id, newConfig)
        };

        return modalRef;
    }

    /**
     * Close a modal by id
     */
    close(id: string, result?: any): void {
        const currentModals = this.modals.getValue();
        const modalToClose = currentModals.find(m => m.id === id);

        if (modalToClose) {
            modalToClose.afterClosedSubject.next(result);
            modalToClose.afterClosedSubject.complete();

            // Remove the modal
            this.modals.next(currentModals.filter(m => m.id !== id));
        }
    }

    /**
     * Update modal configuration
     */
    updateConfig(id: string, config: Partial<ModalConfig>): void {
        const currentModals = this.modals.getValue();
        const modalToUpdate = currentModals.find(m => m.id === id);

        if (modalToUpdate) {
            modalToUpdate.config = { ...modalToUpdate.config, ...config };
            this.modals.next(currentModals);
        }
    }

    /**
     * Get all modals as observable
     */
    getModals(): Observable<any[]> {
        return this.modals.asObservable();
    }

    //////////////////////////////////////////////
    // Common predefined modal template methods //
    //////////////////////////////////////////////

    /**
     * Opens the About modal
     */
    openAboutModal(data?: any, config?: ModalConfig): ModalRef {
        const defaultConfig: ModalConfig = {
            title: 'About Coverage Explorer',
            width: '500px',
            cssClass: 'about-modal'
        };
        return this.open(AboutTemplateComponent, data, { ...defaultConfig, ...config });
    }

    /**
     * Opens the Help modal
     */
    openHelpModal(data?: any, config?: ModalConfig): ModalRef {
        const defaultConfig: ModalConfig = {
            title: 'Help & Getting Started',
            width: '550px',
            cssClass: 'help-modal'
        };
        return this.open(HelpTemplateComponent, data, { ...defaultConfig, ...config });
    }

    /**
     * Opens the Keyboard Shortcuts modal
     */
    openKeyboardShortcutsModal(data?: any, config?: ModalConfig): ModalRef {
        const defaultConfig: ModalConfig = {
            title: 'Keyboard Shortcuts',
            width: '600px',
            cssClass: 'shortcuts-modal'
        };
        return this.open(KeyboardShortcutsTemplateComponent, data, { ...defaultConfig, ...config });
    }

    /**
     * Opens the Settings modal
     */
    openSettingsModal(data?: any, config?: ModalConfig): ModalRef {
        const defaultConfig: ModalConfig = {
            title: 'Settings',
            width: '600px',
            cssClass: 'settings-modal'
        };
        return this.open(SettingsTemplateComponent, data, { ...defaultConfig, ...config });
    }

    /**
     * Opens the Changelog modal
     */
    openChangelogModal(data?: any, config?: ModalConfig): ModalRef {
        const defaultConfig: ModalConfig = {
            title: 'What\'s New',
            width: '600px',
            cssClass: 'changelog-modal'
        };
        return this.open(ChangelogTemplateComponent, data, { ...defaultConfig, ...config });
    }

    /**
     * Generate unique id for modal
     */
    private generateId(): string {
        return Math.random().toString(36).substring(2, 9);
    }

    /**
     * Get default config with overrides
     */
    private getDefaultConfig(config?: ModalConfig): ModalConfig {
        return {
            title: '',
            width: '500px',
            height: 'auto',
            closeOnOutsideClick: true,
            cssClass: '',
            zIndex: 1000,
            animation: 'fade',
            ...config
        };
    }
}