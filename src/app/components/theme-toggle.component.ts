import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../common/utils/theme.utility';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button class="theme-toggle-btn" (click)="toggleTheme()" [class.dark]="isDarkTheme">
      <i class="fas" [ngClass]="isDarkTheme ? 'fa-sun' : 'fa-moon'"></i>
    </button>
  `,
  styles: [`
    .theme-toggle-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background-color: var(--surface-color);
      color: var(--text-color);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      transition: all 0.3s ease;
      z-index: 9999;
    }
    
    .theme-toggle-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }
    
    .theme-toggle-btn.dark {
      background-color: #333;
      color: #fff;
    }
  `]
})
export class ThemeToggleComponent implements OnInit {
  isDarkTheme = false;

  constructor(private themeService: ThemeService) { }

  ngOnInit(): void {
    this.themeService.darkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}