// theme.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ThemeService {
    private darkThemeSubject = new BehaviorSubject<boolean>(false);
    darkTheme$: Observable<boolean> = this.darkThemeSubject.asObservable();

    constructor() {
        // Check if user has a theme preference stored or use system preference
        const savedTheme = localStorage.getItem('theme-preference');
        if (savedTheme) {
            this.setDarkTheme(savedTheme === 'dark');
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setDarkTheme(prefersDark);
        }
    }

    setDarkTheme(isDark: boolean): void {
        this.darkThemeSubject.next(isDark);
        localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');

        // Apply class to document root for global CSS variables
        if (isDark) {
            document.documentElement.classList.add('dark-theme');
        } else {
            document.documentElement.classList.remove('dark-theme');
        }
    }

    toggleTheme(): void {
        this.setDarkTheme(!this.darkThemeSubject.value);
    }
}