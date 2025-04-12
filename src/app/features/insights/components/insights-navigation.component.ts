import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-insights-nav',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div class="insights-nav">
      <a routerLink="/insights" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-item">
        <i class="fas fa-chart-line"></i>
        <span>Overview</span>
      </a>
      <a routerLink="/insights/packages" routerLinkActive="active" class="nav-item">
        <i class="fas fa-boxes"></i>
        <span>Packages</span>
      </a>
      <a routerLink="/insights/classes" routerLinkActive="active" class="nav-item">
        <i class="fas fa-code"></i>
        <span>Classes</span>
      </a>
    </div>
  `,
    styles: [`
    .insights-nav {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
      background-color: var(--color-bg-secondary);
      border-radius: 8px;
      margin-bottom: 1.5rem;
      border: 1px solid var(--color-border-default);
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 6px;
      color: var(--color-text-secondary);
      text-decoration: none;
      transition: all 0.2s ease;
    }

    .nav-item:hover {
      background-color: var(--color-bg-tertiary);
      color: var(--color-text-default);
    }

    .nav-item.active {
      background-color: var(--color-primary);
      color: white;
    }

    i {
      font-size: 1rem;
    }

    @media (max-width: 768px) {
      .insights-nav {
        padding: 0.25rem;
      }
      
      .nav-item {
        padding: 0.5rem 0.75rem;
        font-size: 0.9rem;
      }
    }
  `]
})
export class InsightsNavComponent { }