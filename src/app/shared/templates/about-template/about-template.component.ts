import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about-template',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="about-content">
      <h2>About Coverage Explorer</h2>
      <p class="version">Version 2.0.0</p>
      <p>Coverage Explorer is a tool for visualizing and analyzing code coverage data from Cobertura XML reports.</p>
      <h3>Features</h3>
      <ul>
        <li>Visual representation of code coverage</li>
        <li>Coverage trend analysis</li>
        <li>Code highlighting with coverage information</li>
        <li>Report generation and sharing</li>
      </ul>
      <p class="copyright">© {{ currentYear }} Coverage Explorer Team</p>
    </div>
  `,
  styleUrls: ['./about-template.component.scss']
})
export class AboutTemplateComponent {
  currentYear = new Date().getFullYear();
}