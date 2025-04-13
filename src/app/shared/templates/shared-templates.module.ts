import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
    AboutTemplateComponent,
    HelpTemplateComponent,
    KeyboardShortcutsTemplateComponent,
    SettingsTemplateComponent,
    ChangelogTemplateComponent
} from './index';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        AboutTemplateComponent,
        HelpTemplateComponent,
        KeyboardShortcutsTemplateComponent,
        SettingsTemplateComponent,
        ChangelogTemplateComponent
    ],
    exports: [
        AboutTemplateComponent,
        HelpTemplateComponent,
        KeyboardShortcutsTemplateComponent,
        SettingsTemplateComponent,
        ChangelogTemplateComponent
    ]
})
export class SharedTemplatesModule { }