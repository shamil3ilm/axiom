import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <header class="topbar">
      <span class="brand">Axiom</span>
      <span class="spacer"></span>
      <ng-container *ngIf="auth.currentUser$ | async as user">
        <span class="user">{{ user.name }}</span>
        <button class="logout" (click)="logout()">Logout</button>
      </ng-container>
    </header>

    <main class="content">
      <router-outlet />
    </main>
  `,
  styles: [
    `
      .topbar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        border-bottom: 1px solid #e5e5e5;
      }
      .brand {
        font-weight: 600;
        font-size: 1.1rem;
      }
      .spacer {
        flex: 1;
      }
      .user {
        color: #555;
      }
      .logout {
        cursor: pointer;
      }
      .content {
        padding: 1.25rem;
      }
    `,
  ],
})
export class App {
  constructor(
    public auth: AuthService,
    private router: Router,
  ) {}

  logout(): void {
    this.auth.logout().subscribe({
      next: () => this.router.navigate(['/login']),
    });
  }
}
