import { Injectable, TemplateRef, Type } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ModalConfig } from '../../models/modal.model';

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
    private close(id: string, result?: any): void {
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
    private updateConfig(id: string, config: Partial<ModalConfig>): void {
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