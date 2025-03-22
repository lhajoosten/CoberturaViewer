import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, Router } from '@angular/router';
import { ThemeService } from './services/utils/theme.service';
import { ThemeToggleComponent } from './components/theme-toggle.component';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  isDarkTheme = false;
  private themeSubscription: Subscription | null = null;

  constructor(
    private themeService: ThemeService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.themeSubscription = this.themeService.darkTheme$.subscribe(isDark => {
      this.isDarkTheme = isDark;
    });
  }

  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  startComparison(): void {
    this.router.navigate(['/compare']);
  }
}