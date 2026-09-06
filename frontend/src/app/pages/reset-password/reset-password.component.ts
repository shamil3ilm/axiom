import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="reset">
      <h2>Choose a new password</h2>

      <div *ngIf="!token || !email" class="error">
        This reset link is invalid or malformed.
        <a routerLink="/forgot-password">Request a new one</a>.
      </div>

      <form *ngIf="token && email" #f="ngForm" (ngSubmit)="onSubmit(f)">
        <input
          [(ngModel)]="password"
          name="password"
          type="password"
          placeholder="New password"
          minlength="12"
          required
          autocomplete="new-password"
          #passwordInput="ngModel"
        />
        <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error">
          Minimum 12 characters, with a mix of letters, numbers, and symbols.
        </div>

        <input
          [(ngModel)]="passwordConfirmation"
          name="password_confirmation"
          type="password"
          placeholder="Confirm new password"
          required
          autocomplete="new-password"
        />

        <div *ngIf="mismatch()" class="error">Passwords don't match.</div>
        <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>

        <button type="submit" [disabled]="f.invalid || mismatch() || isSubmitting">
          {{ isSubmitting ? 'Saving…' : 'Update password' }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .reset {
        max-width: 360px;
        margin: 3rem auto;
      }
      input {
        width: 100%;
        padding: 0.5rem;
        box-sizing: border-box;
        margin-bottom: 0.5rem;
      }
      button {
        width: 100%;
        margin-top: 0.75rem;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .error {
        color: red;
        font-size: 0.85em;
        margin: 0.5rem 0;
      }
    `,
  ],
})
export class ResetPasswordComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  token: string | null = null;
  email: string | null = null;
  password = '';
  passwordConfirmation = '';
  isSubmitting = false;
  errorMessage = '';

  ngOnInit(): void {
    // Reset links land here as /reset-password?token=…&email=…
    // Signed by the backend broker; we just forward both back on submit.
    this.token = this.route.snapshot.queryParamMap.get('token');
    this.email = this.route.snapshot.queryParamMap.get('email');
  }

  mismatch(): boolean {
    return this.passwordConfirmation !== '' && this.password !== this.passwordConfirmation;
  }

  onSubmit(form: NgForm): void {
    if (!form.valid || this.mismatch() || this.token === null || this.email === null) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth
      .resetPassword({
        token: this.token,
        email: this.email,
        password: this.password,
        password_confirmation: this.passwordConfirmation,
      })
      .subscribe({
        next: () => this.router.navigate(['/login'], { queryParams: { reset: 'ok' } }),
        error: (error) => {
          this.errorMessage =
            error?.error?.errors?.email?.[0] ??
            error?.error?.errors?.password?.[0] ??
            error?.error?.message ??
            'Could not reset password. The link may have expired.';
          this.isSubmitting = false;
        },
      });
  }
}
