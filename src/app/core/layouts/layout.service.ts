import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';

export type LayoutType = 'auth' | 'main';

@Injectable({
    providedIn: 'root'
})
export class LayoutService {
    private currentLayoutSubject = new BehaviorSubject<LayoutType>('auth');
    public currentLayout$ = this.currentLayoutSubject.asObservable();

    constructor(private authService: AuthService) {
        // Set layout based on auth status
        this.authService.currentUser$.subscribe(user => {
            this.currentLayoutSubject.next(user ? 'main' : 'auth');
        });
    }

    setLayout(layout: LayoutType): void {
        this.currentLayoutSubject.next(layout);
    }

    getCurrentLayout(): LayoutType {
        return this.currentLayoutSubject.value;
    }
}