import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ToastInfo, ToastType } from '../../models/toast.model';

/**
 * Service for displaying temporary notification messages to users
 */
@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private notifications: ToastInfo[] = [];
    private container: HTMLElement | null = null;
    private nextId = 1;
    private isBrowser: boolean;
    private isDarkTheme = false;
    private maxToasts = 5; // Maximum number of toasts to show at once

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
     */
    showSuccess(title: string, message: string, duration: number = 3000): void {
        this.show('success', title, message, duration);
    }

    /**
     * Display an error notification
     */
    showError(title: string, message: string, duration: number = 5000): void {
        this.show('error', title, message, duration);
    }

    /**
     * Display a warning notification
     */
    showWarning(title: string, message: string, duration: number = 4000): void {
        this.show('warning', title, message, duration);
    }

    /**
     * Display an info notification
     */
    showInfo(title: string, message: string, duration: number = 3000): void {
        this.show('info', title, message, duration);
    }

    /**
     * Core method to display a notification
     */
    private show(type: ToastType, title: string, message: string, duration: number): void {
        if (!this.isBrowser) return;

        this.createContainer();

        const notification: ToastInfo = {
            id: this.nextId++,
            type,
            title,
            message,
            duration
        };

        // Check if we need to remove older notifications
        if (this.notifications.length >= this.maxToasts) {
            // Remove the oldest notification
            const oldestId = this.notifications[0].id;
            this.remove(oldestId);
        }

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
     */
    private renderNotification(notification: ToastInfo): void {
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

        // Set progress bar animation duration
        if (notification.duration > 0) {
            const progressStyle = `animation-duration: ${notification.duration}ms`;
            element.setAttribute('style', `--progress-duration: ${notification.duration}ms`);

            // Set the pseudo-element animation duration using CSS variables
            const style = document.createElement('style');
            style.textContent = `
                #toast-${notification.id}::after {
                    animation-duration: ${notification.duration}ms;
                }
            `;
            document.head.appendChild(style);
        }

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

    /**
     * Clear all notifications
     */
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