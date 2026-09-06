import { Component, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";

@Component({
  selector: 'app-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <h3>Create User</h3>
      <form #userForm="ngForm" (ngSubmit)="onSubmit(userForm)">
        <div class="form-group">
          <input
            [(ngModel)]="formData.name"
            name="name"
            placeholder="Name"
            required
            #nameInput="ngModel">
          <div *ngIf="nameInput.invalid && nameInput.touched" class="error">
            Name is required
          </div>
        </div>

        <div class="form-group">
          <input
            [(ngModel)]="formData.email"
            name="email"
            type="email"
            placeholder="Email"
            required
            #emailInput="ngModel">
          <div *ngIf="emailInput.invalid && emailInput.touched" class="error">
            Please enter a valid email
          </div>
        </div>

        <div class="form-group">
          <input
            [(ngModel)]="formData.password"
            name="password"
            [type]="showPassword ? 'text' : 'password'"
            placeholder="Password"
            required
            [minlength]="8"
            #passwordInput="ngModel"
          />
          <div class="password-controls">
            <span class="toggle-password" (click)="togglePasswordVisibility()">
              {{ showPassword ? 'Hide' : 'Show' }}
            </span>
          </div>
        </div>
        <div *ngIf="passwordInput.invalid && passwordInput.touched" class="error">
          Password must be atleast 8 characters
        </div>

        <button type="submit" [disabled]="userForm.invalid">Create</button>
      </form>
    </div>
  `,
  styles: [`
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
  `]
})
export class UserFormComponent {
  @Output() submitForm = new EventEmitter<any>();

  formData = {
    name: '',
    email: '',
    password: '',
  };

  showPassword = false;
  isSubmitting = false;

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  onSubmit(form: any) {
    console.log('Form submitted. Valid:', form.valid, 'Submitting:', this.isSubmitting);
    if (form.valid && !this.isSubmitting) {
      this.isSubmitting = true;
      this.submitForm.emit({ ...this.formData });

      setTimeout(() => {
        this.resetForm();
        form.reset();
      }, 0);
    }
  }

  private isValid(): boolean {
    return this.formData.name.trim() != '' &&
    this.formData.email.includes('@') &&
    this.formData.password.length >= 8;
  }

  private resetForm() {
    this.formData = {
      name: '',
      email: '',
      password: ''
    };
    this.showPassword = false;
    this.isSubmitting = false;
  }
}
