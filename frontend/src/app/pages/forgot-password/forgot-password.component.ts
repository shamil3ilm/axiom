import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="forgot">
      <h2>Reset your password</h2>

      <ng-container *ngIf="!submitted; else confirmation">
        <p>Enter the email on your account and we'll send you a reset link.</p>

        <form #f="ngForm" (ngSubmit)="onSubmit(f)">
          <input
            [(ngModel)]="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autocomplete="email"
            #emailInput="ngModel"
          />
          <div *ngIf="emailInput.invalid && emailInput.touched" class="error">
            Enter a valid email.
          </div>

          <button type="submit" [disabled]="f.invalid || isSubmitting">
            {{ isSubmitting ? 'Sending…' : 'Send reset link' }}
          </button>
        </form>
      </ng-container>

      <ng-template #confirmation>
        <p class="ok">
          If an account exists for <strong>{{ email }}</strong
          >, a reset link is on its way. Check your inbox (and spam folder) in the next few minutes.
        </p>
      </ng-template>

      <p class="back"><a routerLink="/login">Back to sign in</a></p>
    </div>
  `,
  styles: [
    `
      .forgot {
        max-width: 360px;
        margin: 3rem auto;
      }
      input {
        width: 100%;
        padding: 0.5rem;
        box-sizing: border-box;
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
      .ok {
        background: #e8f5e9;
        border-left: 3px solid #2e7d32;
        padding: 0.75rem;
      }
      .back {
        text-align: center;
        margin-top: 1.5rem;
        font-size: 0.9em;
      }
    `,
  ],
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);

  email = '';
  isSubmitting = false;
  submitted = false;

  onSubmit(form: NgForm): void {
    if (!form.valid || this.isSubmitting) return;
    this.isSubmitting = true;

    // We intentionally show the same confirmation regardless of response —
    // the backend already returns 200 for unknown emails to avoid account
    // enumeration, and the UI must not leak that either.
    this.auth.forgotPassword(this.email).subscribe({
      next: () => {
        this.submitted = true;
        this.isSubmitting = false;
      },
      error: () => {
        this.submitted = true;
        this.isSubmitting = false;
      },
    });
  }
}
