import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';

import { CreateUserPayload } from '../../services/api';

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h3>Create user</h3>
      <form #userForm="ngForm" (ngSubmit)="onSubmit(userForm)">
        <div class="form-group">
          <input
            [(ngModel)]="formData.name"
            name="name"
            placeholder="Name"
            required
            #nameInput="ngModel"
          />
          <div *ngIf="nameInput.invalid && nameInput.touched" class="error">Name is required</div>
        </div>

        <div class="form-group">
          <input
            [(ngModel)]="formData.email"
            name="email"
            type="email"
            placeholder="Email"
            required
            #emailInput="ngModel"
          />
          <div *ngIf="emailInput.invalid && emailInput.touched" class="error">
            Please enter a valid email
          </div>
        </div>

        <div class="form-group">
          <input
            [(ngModel)]="formData.password"
            name="password"
            [type]="showPassword ? 'text' : 'password'"
            placeholder="Password (12+ chars)"
            required
            [minlength]="12"
            autocomplete="new-password"
            #passwordInput="ngModel"
          />
          <div class="password-controls">
            <span class="toggle-password" (click)="togglePasswordVisibility()">
              {{ showPassword ? 'Hide' : 'Show' }}
            </span>
          </div>
          <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error">
            Minimum 12 characters, with a mix of letters, numbers, and symbols.
          </div>
        </div>

        <div class="form-group">
          <input
            [(ngModel)]="formData.password_confirmation"
            name="password_confirmation"
            [type]="showPassword ? 'text' : 'password'"
            placeholder="Confirm password"
            required
            autocomplete="new-password"
          />
          <div *ngIf="mismatch()" class="error">Passwords don't match.</div>
        </div>

        <button type="submit" [disabled]="userForm.invalid || mismatch() || isSubmitting">
          {{ isSubmitting ? 'Creating…' : 'Create' }}
        </button>
      </form>
    </div>
  `,
  styles: [
    `
      .error {
        color: red;
        font-size: 0.8em;
      }
      .password-controls {
        margin-top: -20px;
        text-align: right;
      }
      .toggle-password {
        cursor: pointer;
        color: #007bff;
        text-decoration: underline;
      }
      button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    `,
  ],
})
export class UserFormComponent {
  @Output() submitForm = new EventEmitter<CreateUserPayload>();

  formData: CreateUserPayload = {
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  };

  showPassword = false;
  isSubmitting = false;

  mismatch(): boolean {
    return (
      this.formData.password_confirmation !== '' &&
      this.formData.password !== this.formData.password_confirmation
    );
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(form: NgForm): void {
    if (!form.valid || this.mismatch() || this.isSubmitting) return;

    this.isSubmitting = true;
    this.submitForm.emit({ ...this.formData });

    // Reset synchronously so the parent's next createUser() call sees a
    // clean form and the "Submitting…" state resets even if the parent
    // handler is synchronous.
    queueMicrotask(() => {
      this.reset(form);
    });
  }

  private reset(form: NgForm): void {
    this.formData = {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    };
    this.showPassword = false;
    this.isSubmitting = false;
    form.resetForm();
  }
}
