import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { WelcomeComponent } from './components/welcome/welcome.component';

// Define clear routes without duplications
const authRoutes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'profile', component: UserProfileComponent }
];

@NgModule({
  declarations: [
    LoginComponent,
    UserProfileComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(authRoutes),
    WelcomeComponent  // Standalone component
  ],
  exports: [
    LoginComponent,
    UserProfileComponent,
    WelcomeComponent
  ]
})
export class AuthModule { }