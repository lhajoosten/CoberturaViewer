import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.scss'],
  imports: [CommonModule, RouterModule],
  standalone: true
})
export class SidebarComponent {
  @Input() collapsed = false;

  navItems = [
    {
      icon: 'fas fa-home',
      label: 'Dashboard',
      route: '/dashboard'
    },
    {
      icon: 'fas fa-upload',
      label: 'Upload',
      route: '/upload'
    },
    {
      icon: 'fas fa-chart-pie',
      label: 'Visualization',
      route: '/visualization'
    },
    {
      icon: 'fas fa-chart-line',
      label: 'Trends',
      route: '/trends'
    },
    {
      icon: 'fas fa-lightbulb',
      label: 'Insights',
      route: '/insights'
    },
    {
      icon: 'fas fa-exchange-alt',
      label: 'Comparison',
      route: '/comparison'
    },
    {
      icon: 'fas fa-file-alt',
      label: 'Recent Files',
      route: '/upload/recent-files'
    },
    {
      icon: 'fas fa-user',
      label: 'Profile',
      route: '/user/profile'
    }
  ];
}