import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-changelog-template',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="changelog-content">
      <h2>What's New in Version 2.0.0</h2>
      <p class="update-info">Major update from v1.3.0</p>
      
      <h3>New Features</h3>
      <ul>
        <li>Completely redesigned UI for better usability</li>
        <li>Dark mode support</li>
        <li>Advanced filtering capabilities</li>
        <li>Coverage trend visualization</li>
        <li>Export to multiple formats</li>
      </ul>
      
      <h3>Improvements</h3>
      <ul>
        <li>Significantly improved performance with large reports</li>
        <li>Enhanced code highlighting</li>
        <li>Better accessibility support</li>
        <li>Customizable report views</li>
      </ul>
      
      <h3>Previous Version</h3>
      <p>v1.3.0 (Released January 2025)</p>
    </div>
  `,
  styleUrls: ['./changelog-template.component.scss']
})
export class ChangelogTemplateComponent { }