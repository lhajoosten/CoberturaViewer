import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-welcome',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './welcome.component.html',
    styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent {
    constructor(private router: Router) { }

    navigateToLogin(): void {
        this.router.navigate(['/login']);
    }

    learnMore(): void {
        // You could navigate to a features/about page or show a modal
        // For now, just go to login
        this.router.navigate(['/login']);
    }
}