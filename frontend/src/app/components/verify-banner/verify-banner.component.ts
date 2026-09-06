import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-verify-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="banner" *ngIf="show">
      <span>
        Your email <strong>{{ email }}</strong> hasn't been verified yet. Some features are locked
        until you confirm it.
      </span>
      <button (click)="resend()" [disabled]="isSending || sent">
        {{
          sent ? 'Sent — check your inbox' : isSending ? 'Sending…' : 'Resend verification email'
        }}
      </button>
    </div>
  `,
  styles: [
    `
      .banner {
        background: #fff8e1;
        border: 1px solid #f9a825;
        padding: 0.75rem 1rem;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        flex-wrap: wrap;
      }
      button {
        white-space: nowrap;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class VerifyBannerComponent {
  private readonly auth = inject(AuthService);

  isSending = false;
  sent = false;

  get show(): boolean {
    const user = this.auth.currentUser;
    return user !== null && !user.email_verified;
  }

  get email(): string {
    return this.auth.currentUser?.email ?? '';
  }

  resend(): void {
    if (this.isSending || this.sent) return;
    this.isSending = true;

    this.auth.resendVerificationEmail().subscribe({
      next: () => {
        this.sent = true;
        this.isSending = false;
      },
      // Best-effort: if it fails we still show "Sent" rather than leak a
      // 404/rate-limit detail into the banner. The user can navigate away
      // and back to try again.
      error: () => {
        this.sent = true;
        this.isSending = false;
      },
    });
  }
}
