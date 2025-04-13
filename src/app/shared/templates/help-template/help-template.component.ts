import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help-template',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="help-content">
      <h2>Help</h2>
      <h3>Getting Started</h3>
      <ol>
        <li>Upload or drag and drop your Cobertura XML file</li>
        <li>Browse through the coverage report</li>
        <li>Use filters to focus on specific areas</li>
        <li>Export or share your analysis</li>
      </ol>
      <h3>Need More Help?</h3>
      <p>Visit our <a href="#" target="_blank">documentation</a> or <a href="#" target="_blank">contact support</a>.</p>
    </div>
  `,
  styleUrls: ['./help-template.component.scss']
})
export class HelpTemplateComponent { }