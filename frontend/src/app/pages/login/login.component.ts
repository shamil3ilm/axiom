import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            #passwordInput="ngModel"
          />
          <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error">
            Password is required
          </div>
        </div>

        <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>

        <button type="submit" [disabled]="loginForm.invalid || isSubmitting">
          {{ isSubmitting ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
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
    `,
  ],
})
export class LoginComponent {
  credentials = {
    email: '',
    password: '',
  };

  isSubmitting = false;
  errorMessage = '';

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  onSubmit(form: { valid: boolean | null }): void {
    if (!form.valid || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.login(this.credentials).subscribe({
      next: () => this.router.navigate(['/users']),
      error: (error) => {
        this.errorMessage =
          error?.error?.message ?? 'Invalid credentials. Please try again.';
        this.isSubmitting = false;
      },
    });
  }
}
