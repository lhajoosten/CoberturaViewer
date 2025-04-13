import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeStoreService } from './core/services/store/theme-store.service';
import { LayoutModule } from './core/layouts/layout.module';
import { ModalContainerComponent } from './shared/components/modal-container/modal-container.component';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <router-outlet></router-outlet>
  `,
})
export class AppComponent implements OnInit {
  isDarkTheme = false;

  constructor(private themeStore: ThemeStoreService) { }

  ngOnInit(): void {
    this.themeStore.isDarkTheme$.subscribe((isDark) => {
      this.isDarkTheme = isDark;
    });
  }
}