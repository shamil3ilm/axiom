import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { AuthService, AuthUser, EnableTwoFactorResponse } from '../../services/auth.service';

type Mode = 'idle' | 'enrolling' | 'active';

@Component({
  selector: 'app-two-factor-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="tfa">
      <p><a routerLink="/users">← Back to users</a></p>
      <h2>Two-factor authentication</h2>

      <p *ngIf="mode === 'idle'">
        Two-factor authentication adds a second step to sign-in using a code from an app like
        <strong>1Password</strong>, <strong>Authy</strong>, or
        <strong>Google Authenticator</strong>.
      </p>

      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>

      <!-- Idle: user has 2FA disabled -->
      <button *ngIf="mode === 'idle'" (click)="startEnrollment()" [disabled]="isSubmitting">
        {{ isSubmitting ? 'Preparing…' : 'Enable two-factor auth' }}
      </button>

      <!-- Enrolling: show QR + secret + recovery codes, wait for confirmation code -->
      <ng-container *ngIf="mode === 'enrolling' && enrollment">
        <ol>
          <li>Scan this QR code with your authenticator app:</li>
        </ol>

        <div class="qr" [innerHTML]="qrSvg"></div>

        <p>
          Or enter this secret manually:
          <code>{{ enrollment.secret }}</code>
        </p>

        <div class="recovery">
          <strong>Save your recovery codes</strong>
          <p>
            If you lose access to your authenticator, one of these codes will get you back in. Each
            code works once. Store them somewhere safe now — we won't show them again.
          </p>
          <ul>
            <li *ngFor="let code of enrollment.recovery_codes">
              <code>{{ code }}</code>
            </li>
          </ul>
        </div>

        <form (ngSubmit)="confirmEnrollment()">
          <label for="tfa-confirm-code">Enter a code from your app to finish:</label>
          <input
            id="tfa-confirm-code"
            [(ngModel)]="confirmCode"
            name="code"
            type="text"
            inputmode="numeric"
            placeholder="123456"
            autocomplete="one-time-code"
            required
          />
          <button type="submit" [disabled]="!confirmCode || isSubmitting">
            {{ isSubmitting ? 'Confirming…' : 'Confirm and enable' }}
          </button>
        </form>
      </ng-container>

      <!-- Active: user has 2FA enabled, offer to disable it -->
      <ng-container *ngIf="mode === 'active'">
        <p class="active-banner">
          Two-factor authentication is <strong>enabled</strong> on this account.
        </p>

        <form (ngSubmit)="disable()">
          <label for="tfa-disable-pw">Enter your password to turn it off:</label>
          <input
            id="tfa-disable-pw"
            [(ngModel)]="disablePassword"
            name="password"
            type="password"
            autocomplete="current-password"
            required
          />
          <button type="submit" class="danger" [disabled]="!disablePassword || isSubmitting">
            {{ isSubmitting ? 'Disabling…' : 'Disable two-factor auth' }}
          </button>
        </form>
      </ng-container>
    </div>
  `,
  styles: [
    `
      .tfa {
        max-width: 480px;
        margin: 2rem auto;
      }
      .qr {
        margin: 1rem 0;
        max-width: 240px;
      }
      code {
        background: #f3f4f6;
        padding: 0.15rem 0.35rem;
        border-radius: 3px;
        font-family: ui-monospace, SFMono-Regular, monospace;
      }
      .recovery {
        background: #fff8e1;
        border-left: 3px solid #f9a825;
        padding: 0.75rem 1rem;
        margin: 1rem 0;
      }
      .recovery ul {
        columns: 2;
        margin: 0.5rem 0 0;
        padding-left: 1.25rem;
      }
      .active-banner {
        background: #e8f5e9;
        border-left: 3px solid #2e7d32;
        padding: 0.75rem;
      }
      form {
        margin-top: 1rem;
      }
      label {
        display: block;
        margin-bottom: 0.25rem;
      }
      input {
        width: 100%;
        padding: 0.5rem;
        box-sizing: border-box;
      }
      button {
        margin-top: 0.75rem;
      }
      button.danger {
        background: #b71c1c;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
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
export class TwoFactorSettingsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  mode: Mode = 'idle';
  enrollment: EnableTwoFactorResponse | null = null;
  qrSvg: SafeHtml = '';
  confirmCode = '';
  disablePassword = '';
  isSubmitting = false;
  errorMessage = '';

  ngOnInit(): void {
    this.mode = this.currentUserHas2fa() ? 'active' : 'idle';
  }

  startEnrollment(): void {
    if (this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.enableTwoFactor().subscribe({
      next: (response) => {
        this.enrollment = response;
        // The SVG comes straight from our backend's bacon-qr-code renderer;
        // we control it, so bypassSecurityTrust is safe here. Never do this
        // with SVG from an untrusted source.
        this.qrSvg = this.sanitizer.bypassSecurityTrustHtml(response.qr_svg);
        this.mode = 'enrolling';
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Could not start enrollment.';
        this.isSubmitting = false;
      },
    });
  }

  confirmEnrollment(): void {
    if (this.confirmCode.trim() === '' || this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.confirmTwoFactor(this.confirmCode.trim()).subscribe({
      next: () => {
        this.mode = 'active';
        this.enrollment = null;
        this.confirmCode = '';
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.errors?.code?.[0] ?? 'That code did not match. Try again.';
        this.isSubmitting = false;
      },
    });
  }

  disable(): void {
    if (this.disablePassword === '' || this.isSubmitting) return;
    this.isSubmitting = true;
    this.errorMessage = '';

    this.auth.disableTwoFactor(this.disablePassword).subscribe({
      next: () => {
        this.mode = 'idle';
        this.disablePassword = '';
        this.isSubmitting = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.errors?.password?.[0] ?? 'Password did not match.';
        this.isSubmitting = false;
      },
    });
  }

  private currentUserHas2fa(): boolean {
    const user: AuthUser | null = this.auth.currentUser;
    return user !== null && user.two_factor_enabled;
  }
}
