import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login">
      <h2>Sign in</h2>
      <form #loginForm="ngForm" (ngSubmit)="onSubmit(loginForm)">
        <div class="form-group">
          <input
            [(ngModel)]="credentials.email"
            name="email"
            type="email"
            placeholder="Email"
            required
            autocomplete="username"
            #emailInput="ngModel"
          />
          <div *ngIf="emailInput.invalid && emailInput.touched" class="error">
            A valid email is required
          </div>
        </div>

        <div class="form-group">
          <input
            [(ngModel)]="credentials.password"
            name="password"
            type="password"
            placeholder="Password"
            required
            autocomplete="current-password"
            #passwordInput="ngModel"
          />
          <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error">
            Password is required
          </div>
        </div>

        <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>

        <button type="submit" [disabled]="loginForm.invalid || isSubmitting">
          {{ isSubmitting ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="forgot">
        <a routerLink="/forgot-password">Forgot your password?</a>
      </p>
    </div>
  `,
  styles: [
    `
      .login {
        max-width: 320px;
        margin: 3rem auto;
      }
      .form-group {
        margin-bottom: 1rem;
      }
      .form-group input {
        width: 100%;
        padding: 0.5rem;
        box-sizing: border-box;
      }
      .error {
        color: red;
        font-size: 0.8em;
        margin-bottom: 0.5rem;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .forgot {
        text-align: center;
        margin-top: 1rem;
        font-size: 0.9em;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  credentials = { email: '', password: '' };
  isSubmitting = false;
  errorMessage = '';

  onSubmit(form: NgForm): void {
    if (!form.valid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.login(this.credentials).subscribe({
      next: (result) => {
        if (result.kind === 'two_factor_required') {
          // Route state carries the challenge token — it never appears in the
          // URL bar, and disappears if the user hits refresh (which we treat
          // as "start over with password again").
          this.router.navigate(['/two-factor'], {
            state: { challengeToken: result.challengeToken },
          });
          return;
        }
        this.router.navigate(['/users']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Invalid credentials. Please try again.';
        this.isSubmitting = false;
      },
    });
  }
}
