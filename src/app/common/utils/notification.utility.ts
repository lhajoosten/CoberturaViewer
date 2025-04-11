import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
    Notification,
    NotificationType,
} from '../models/notification.model';

/**
 * Service for displaying temporary notification messages to users
 */
@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private notifications: Notification[] = [];
    private container: HTMLElement | null = null;
    private nextId = 1;
    private isBrowser: boolean;
    private isDarkTheme = false;

    constructor(@Inject(PLATFORM_ID) platformId: Object) {
        this.isBrowser = isPlatformBrowser(platformId);
        if (this.isBrowser) {
            this.createContainer();
            // Check if dark theme is active
            this.isDarkTheme = document.body.classList.contains('dark-theme');
            // Listen for theme changes
            this.setupThemeListener();
        }
    }

    /**
     * Set up a MutationObserver to track theme changes on the body element
     */
    private setupThemeListener(): void {
        if (!this.isBrowser) return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.attributeName === 'class') {
                    this.isDarkTheme = document.body.classList.contains('dark-theme');
                    // Update container class
                    if (this.container) {
                        if (this.isDarkTheme) {
                            this.container.classList.add('dark-theme');
                        } else {
                            this.container.classList.remove('dark-theme');
                        }
                    }
                }
            });
        });

        observer.observe(document.body, { attributes: true });
    }

    /**
     * Create a container for notifications if it doesn't exist
     */
    private createContainer(): void {
        if (!this.isBrowser) return;

        // Create container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            // Check current theme state immediately
            this.isDarkTheme = document.body.classList.contains('dark-theme');
            if (this.isDarkTheme) {
                this.container.classList.add('dark-theme');
            }
            document.body.appendChild(this.container);
        }
    }

    /**
     * Display a success notification
     * @param title The notification title
     * @param message The notification message
     * @param duration How long to display (ms)
     */
    showSuccess(title: string, message: string, duration: number = 3000): void {
        this.show('success', title, message, duration);
    }

    /**
     * Display an error notification
     * @param title The notification title
     * @param message The notification message
     * @param duration How long to display (ms)
     */
    showError(title: string, message: string, duration: number = 5000): void {
        this.show('error', title, message, duration);
    }

    /**
     * Display a warning notification
     * @param title The notification title
     * @param message The notification message
     * @param duration How long to display (ms)
     */
    showWarning(title: string, message: string, duration: number = 4000): void {
        this.show('warning', title, message, duration);
    }

    /**
     * Display an info notification
     * @param title The notification title
     * @param message The notification message
     * @param duration How long to display (ms)
     */
    showInfo(title: string, message: string, duration: number = 3000): void {
        this.show('info', title, message, duration);
    }

    /**
     * Core method to display a notification
     * @param type The notification type
     * @param title The notification title
     * @param message The notification message
     * @param duration How long to display (ms)
     */
    private show(type: NotificationType, title: string, message: string, duration: number): void {
        if (!this.isBrowser) return;

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

    /**
     * Remove a notification by ID
     * @param id The notification ID to remove
     */
    remove(id: number): void {
        const index = this.notifications.findIndex(n => n.id === id);
        if (index !== -1) {
            this.notifications.splice(index, 1);

            // Remove from DOM
            const element = document.getElementById(`toast-${id}`);
            if (element && this.container) {
                element.classList.add('fade-out');
                element.classList.remove('fade-in');

                setTimeout(() => {
                    if (element.parentNode === this.container) {
                        this.container?.removeChild(element);
                    }
                }, 300);
            }
        }
    }

    /**
     * Create and render a notification element
     * @param notification The notification to render
     */
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

        // Always insert newest notifications at top
        if (this.container.firstChild) {
            this.container.insertBefore(element, this.container.firstChild);
        } else {
            this.container.appendChild(element);
        }
    }

    clearAll(): void {
        if (!this.container) return;

        // Add fade-out animation to all toasts
        const toasts = this.container.querySelectorAll('.toast');
        toasts.forEach(toast => {
            toast.classList.add('fade-out');
            toast.classList.remove('fade-in');
        });

        // Remove them after animation completes
        setTimeout(() => {
            this.notifications = [];
            while (this.container && this.container.firstChild) {
                this.container.removeChild(this.container.firstChild);
            }
        }, 300);
    }
}