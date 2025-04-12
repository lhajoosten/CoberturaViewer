import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './header/header.component';
import { SidebarComponent } from './side-bar/side-bar.component';
import { FooterComponent } from './footer/footer.component';
import { MainLayoutComponent } from './main-layout/main-layout.component';

@NgModule({
    imports: [
        CommonModule,
        RouterModule,
        HeaderComponent,
        SidebarComponent,
        FooterComponent,
        MainLayoutComponent
    ],
    exports: [
        MainLayoutComponent
    ]
})
export class LayoutModule { }