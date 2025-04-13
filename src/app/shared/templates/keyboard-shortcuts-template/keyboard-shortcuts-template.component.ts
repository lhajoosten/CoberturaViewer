import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-keyboard-shortcuts-template',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="shortcuts-content">
      <h2>Keyboard Shortcuts</h2>
      <table class="shortcuts-table">
        <tr>
          <th>Key</th>
          <th>Action</th>
        </tr>
        <tr>
          <td><kbd>Ctrl</kbd> + <kbd>O</kbd></td>
          <td>Open coverage file</td>
        </tr>
        <tr>
          <td><kbd>Ctrl</kbd> + <kbd>F</kbd></td>
          <td>Search in report</td>
        </tr>
        <tr>
          <td><kbd>Ctrl</kbd> + <kbd>S</kbd></td>
          <td>Save report</td>
        </tr>
        <tr>
          <td><kbd>Ctrl</kbd> + <kbd>P</kbd></td>
          <td>Print report</td>
        </tr>
        <tr>
          <td><kbd>F1</kbd></td>
          <td>Show help</td>
        </tr>
      </table>
    </div>
  `,
  styleUrls: ['./keyboard-shortcuts-template.component.scss']
})
export class KeyboardShortcutsTemplateComponent { }