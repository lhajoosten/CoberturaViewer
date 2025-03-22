export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    duration: number;
}
