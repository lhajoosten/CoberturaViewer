import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoadingState {
    show: boolean;
    message?: string;
}

@Injectable({
    providedIn: 'root'
})
export class LoadingService {
    private loadingSubject = new BehaviorSubject<LoadingState>({ show: false });
    loading$: Observable<LoadingState> = this.loadingSubject.asObservable();

    /**
     * Show the loading spinner
     * @param message Optional message to display with the spinner
     */
    show(message?: string): void {
        this.loadingSubject.next({ show: true, message });
    }

    /**
     * Hide the loading spinner
     */
    hide(): void {
        this.loadingSubject.next({ show: false });
    }
}