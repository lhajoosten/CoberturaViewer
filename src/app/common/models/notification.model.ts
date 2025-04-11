/**
 * Defines the severity level of a notification
 * Used to visually distinguish different types of messages
 */
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

/**
 * Represents a temporary notification or alert message
 * Used to inform users about events, errors, or operation results
 */
export interface Notification {
    /** Unique identifier for the notification */
    id: number;

    /** Severity level determining the visual style */
    type: NotificationType;

    /** Short heading text summarizing the notification */
    title: string;

    /** Detailed explanation or content of the notification */
    message: string;

    /** How long the notification should remain visible (in milliseconds) */
    duration: number;
}

/**
 * Configuration options for notifications
 */
export interface NotificationOptions {
    /** Duration in milliseconds */
    duration?: number;
    /** Whether notification can be dismissed */
    dismissible?: boolean;
    /** CSS class to apply to notification */
    cssClass?: string;
    /** Action label if applicable */
    actionLabel?: string;
    /** Action callback if applicable */
    actionCallback?: () => void;
}