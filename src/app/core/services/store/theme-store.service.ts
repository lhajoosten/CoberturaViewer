import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service for managing application theme
 */
@Injectable({
    providedIn: 'root'
})
export class ThemeStoreService {
    private darkThemeSubject = new BehaviorSubject<boolean>(false);
    isDarkTheme$: Observable<boolean> = this.darkThemeSubject.asObservable();

    constructor() {
        // Initialize theme preference
        this.initializeTheme();
    }

    private initializeTheme(): void {
        const savedTheme = localStorage.getItem('theme');
        const isDarkMode = savedTheme === 'dark' ||
            (savedTheme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);

        this.setTheme(isDarkMode);
    }

    setTheme(isDark: boolean): void {
        if (isDark) {
            document.documentElement.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
        this.darkThemeSubject.next(isDark);
    }

    toggleTheme(): void {
        this.setTheme(!this.darkThemeSubject.value);
    }
}