/**
 * Type for notification severity level
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Interface for notification message
 */
export interface ToastInfo {
    /** Unique identifier for the notification */
    id: number;
    /** Severity level determining the visual style */
    type: ToastType;
    /** Short heading text summarizing the notification */
    title: string;
    /** Detailed explanation or content of the notification */
    message: string;
    /** How long the notification should remain visible (in milliseconds) */
    duration: number;
}