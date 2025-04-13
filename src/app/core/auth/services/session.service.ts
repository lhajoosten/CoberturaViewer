import { Injectable } from "@angular/core";

@Injectable({
    providedIn: 'root'
})
export class SessionService {
    private sessionStart: Date | null = null;

    constructor() {
        this.loadSession();
    }

    private loadSession(): void {
        const sessionData = localStorage.getItem('current_session');
        if (sessionData) {
            try {
                const data = JSON.parse(sessionData);
                this.sessionStart = new Date(data.startTime);
            } catch (e) {
                console.error('Error loading session data:', e);
                this.resetSession();
            }
        }
    }

    startNewSession(): void {
        this.sessionStart = new Date();
        this.saveSession();
    }

    getSessionStartTime(): Date {
        if (!this.sessionStart) {
            this.startNewSession();
        }
        return this.sessionStart as Date;
    }

    private saveSession(): void {
        const sessionData = {
            startTime: this.sessionStart?.toISOString(),
            // Add other session info as needed
        };
        localStorage.setItem('current_session', JSON.stringify(sessionData));
    }

    resetSession(): void {
        this.sessionStart = null;
        localStorage.removeItem('current_session');
    }
}