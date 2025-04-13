import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-auth-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    template: `
    <div class="auth-layout">
      <router-outlet></router-outlet>
    </div>
  `,
    styles: [`
    .auth-layout {
      min-height: 100vh;
      background-color: var(--color-bg-secondary);
      background-image: radial-gradient(
        circle at top right,
        rgba(var(--color-primary-rgb), 0.05) 0%,
        transparent 70%
      );
    }
  `]
})
export class AuthLayoutComponent { }