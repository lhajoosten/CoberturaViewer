import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { UserProfileComponent } from './components/user-profile/user-profile.component';
import { AuthGuard } from '../../core/guards/auth.guard';

export const authRoutes: Routes = [
    {
        path: '',
        component: LoginComponent
    },
    {
        path: 'profile',
        component: UserProfileComponent,
        canActivate: [AuthGuard]
    }
];