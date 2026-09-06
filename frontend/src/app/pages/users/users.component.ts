import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

import { ApiService, CreateUserPayload } from '../../services/api';
import { AuthService, AuthUser } from '../../services/auth.service';
import { UserListComponent } from '../../components/user-list/user-list.component';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { VerifyBannerComponent } from '../../components/verify-banner/verify-banner.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterLink, UserListComponent, UserFormComponent, VerifyBannerComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h2>Users</h2>
          <p *ngIf="currentUser" class="who">
            Signed in as <strong>{{ currentUser.email }}</strong>
            <span *ngIf="currentUser.two_factor_enabled" class="pill pill-ok">2FA on</span>
          </p>
        </div>
        <nav>
          <a routerLink="/settings/two-factor">Security</a>
          <button (click)="logout()">Sign out</button>
        </nav>
      </header>

      <app-verify-banner></app-verify-banner>

      <app-user-form (submitForm)="createUser($event)"></app-user-form>

      <div *ngIf="errorMessage" class="error">{{ errorMessage }}</div>

      <hr />

      <div *ngIf="users.length === 0 && !isLoading">No users found</div>
      <div *ngIf="isLoading">Loading users…</div>

      <app-user-list
        [users]="users"
        [key]="updateKey"
        (delete)="deleteUser($event)"
        *ngIf="users.length > 0"
      >
      </app-user-list>
    </div>
  `,
  styles: [
    `
      .page {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
      }
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .page-header h2 {
        margin: 0;
      }
      .who {
        margin: 0.25rem 0 0;
        font-size: 0.9em;
        color: #555;
      }
      nav {
        display: flex;
        gap: 0.75rem;
        align-items: center;
      }
      .pill {
        font-size: 0.75em;
        padding: 0.1rem 0.5rem;
        border-radius: 999px;
        margin-left: 0.35rem;
      }
      .pill-ok {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .error {
        color: red;
        margin: 0.5rem 0;
      }
    `,
  ],
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  users: AuthUser[] = [];
  isLoading = false;
  updateKey = 0;
  errorMessage = '';

  get currentUser(): AuthUser | null {
    return this.auth.currentUser;
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.api.getUsers().subscribe({
      next: (data) => {
        this.users = [...data];
        this.updateKey++;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.status === 403
            ? 'You need an admin role to view this page.'
            : 'Failed to load users.';
        this.isLoading = false;
      },
    });
  }

  createUser(userData: CreateUserPayload): void {
    this.errorMessage = '';
    this.api.createUser(userData).subscribe({
      next: () => this.loadUsers(),
      error: (error) => {
        this.errorMessage =
          error?.error?.errors?.email?.[0] ??
          error?.error?.errors?.password?.[0] ??
          'Failed to create user.';
      },
    });
  }

  deleteUser(id: number): void {
    if (!confirm('Delete this user? This cannot be undone.')) {
      return;
    }

    this.api.deleteUser(id).subscribe({
      next: () => this.loadUsers(),
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to delete user.';
      },
    });
  }

  logout(): void {
    this.auth.logout().subscribe({
      complete: () => this.router.navigate(['/login']),
    });
  }
}
