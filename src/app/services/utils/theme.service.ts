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