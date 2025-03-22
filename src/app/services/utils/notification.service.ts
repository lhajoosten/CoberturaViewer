import { Injectable } from '@angular/core';
import { Notification, NotificationType } from '../../models/notification.model';

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notifications: Notification[] = [];
    private container: HTMLElement | null = null;
    private nextId = 1;

    constructor() {
        this.createContainer();
    }

    private createContainer(): void {
        if (typeof document === 'undefined') return; // Server-side rendering check

        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    showSuccess(title: string, message: string, duration: number = 3000): void {
        this.show('success', title, message, duration);
    }

    showError(title: string, message: string, duration: number = 5000): void {
        this.show('error', title, message, duration);
    }

    showWarning(title: string, message: string, duration: number = 4000): void {
        this.show('warning', title, message, duration);
    }

    showInfo(title: string, message: string, duration: number = 3000): void {
        this.show('info', title, message, duration);
    }

    private show(type: NotificationType, title: string, message: string, duration: number): void {
        if (typeof document === 'undefined') return; // Server-side rendering check

        this.createContainer();

        const notification: Notification = {
            id: this.nextId++,
            type,
            title,
            message,
            duration
        };

        this.notifications.push(notification);
        this.renderNotification(notification);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(notification.id);
            }, duration);
        }
    }

    remove(id: number): void {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications.splice(index, 1);

            // Remove from DOM
            const element = document.getElementById(`toast-${id}`);
            if (element && this.container) {
                element.classList.add('fade-out');
                setTimeout(() => {
                    this.container?.removeChild(element);
                }, 300);
            }
        }
    }

    private renderNotification(notification: Notification): void {
        if (!this.container) return;

        const element = document.createElement('div');
        element.id = `toast-${notification.id}`;
        element.className = `toast ${notification.type} fade-in`;

        // Icon based on type
        let icon = '';
        switch (notification.type) {
            case 'success':
                icon = 'fas fa-check-circle';
                break;
            case 'error':
                icon = 'fas fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fas fa-exclamation-triangle';
                break;
            case 'info':
                icon = 'fas fa-info-circle';
                break;
        }

        element.innerHTML = `
      <div class="toast-icon">
        <i class="${icon}"></i>
      </div>
      <div class="toast-content">
        <div class="toast-title">${notification.title}</div>
        <div class="toast-message">${notification.message}</div>
      </div>
      <button class="toast-close" aria-label="Close">
        <i class="fas fa-times"></i>
      </button>
    `;

        // Add click handler for close button
        element.querySelector('.toast-close')?.addEventListener('click', () => {
            this.remove(notification.id);
        });

        this.container.appendChild(element);
    }
}