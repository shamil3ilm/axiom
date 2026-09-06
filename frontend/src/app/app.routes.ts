import { Routes } from '@angular/router';

import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },

  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'two-factor',
    loadComponent: () =>
      import('./pages/two-factor-challenge/two-factor-challenge.component').then(
        (m) => m.TwoFactorChallengeComponent,
      ),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },

  {
    path: 'users',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/users/users.component').then((m) => m.UsersComponent),
  },
  {
    path: 'settings/two-factor',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/two-factor-settings/two-factor-settings.component').then(
        (m) => m.TwoFactorSettingsComponent,
      ),
  },

  { path: '**', redirectTo: 'users' },
];
