import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-two-factor-challenge',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="challenge">
      <h2>Two-factor code</h2>

      <div *ngIf="!challengeToken" class="error">
        Your challenge expired. <a (click)="restart()" role="button">Start over</a>.
      </div>

      <form *ngIf="challengeToken" #f="ngForm" (ngSubmit)="onSubmit()">
        <p>Enter the 6-digit code from your authenticator app, or a recovery code.</p>

        <input
          [(ngModel)]="code"
          name="code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          placeholder="123456"
          required
          #codeInput="ngModel"
        />

        <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>

        <button type="submit" [disabled]="!code || isSubmitting">
          {{ isSubmitting ? 'Verifying…' : 'Verify' }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .challenge {
        max-width: 320px;
        margin: 3rem auto;
      }
      input {
        width: 100%;
        padding: 0.5rem;
        font-size: 1.25rem;
        letter-spacing: 0.25em;
        text-align: center;
        box-sizing: border-box;
      }
      .error {
        color: red;
        font-size: 0.85em;
        margin: 0.5rem 0;
      }
      button {
        width: 100%;
        margin-top: 0.75rem;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      a[role='button'] {
        cursor: pointer;
        color: #0057c2;
        text-decoration: underline;
      }
    `,
  ],
})
export class TwoFactorChallengeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  challengeToken: string | null = null;
  code = '';
  isSubmitting = false;
  errorMessage = '';

  ngOnInit(): void {
    // Pulled from history.state — LoginComponent passes it via navigate({state}).
    // Hard-refreshing this page loses the token, forcing a fresh password step.
    const state = (history.state ?? {}) as { challengeToken?: string };
    this.challengeToken = state.challengeToken ?? null;
  }

  onSubmit(): void {
    if (this.challengeToken === null || this.code.trim() === '' || this.isSubmitting) {
      return;
    }
    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.verifyTwoFactor(this.challengeToken, this.code.trim()).subscribe({
      next: () => this.router.navigate(['/users']),
      error: (error) => {
        this.errorMessage =
          error?.error?.message ??
          error?.error?.errors?.code?.[0] ??
          'That code was not accepted. Try again.';
        this.isSubmitting = false;
      },
    });
  }

  restart(): void {
    this.router.navigate(['/login']);
  }
}
