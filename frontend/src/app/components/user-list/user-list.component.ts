import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthUser } from '../../services/auth.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h3>Users list</h3>
      <ul>
        <li *ngFor="let user of users">
          <span class="who"> {{ user.name }} <small>·</small> {{ user.email }} </span>
          <span class="pills">
            <span *ngFor="let role of user.roles" class="pill">{{ role }}</span>
            <span *ngIf="!user.email_verified" class="pill pill-warn" title="Email not verified">
              unverified
            </span>
            <span *ngIf="user.two_factor_enabled" class="pill pill-ok" title="2FA enabled">
              2FA
            </span>
          </span>
          <button (click)="delete.emit(user.id)">Delete</button>
        </li>
      </ul>
    </div>
  `,
  styles: [
    `
      ul {
        list-style: none;
        padding: 0;
      }
      li {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        padding: 0.5rem 0;
        border-bottom: 1px solid #eee;
      }
      .who {
        flex: 1;
      }
      .pills {
        display: flex;
        gap: 0.35rem;
      }
      .pill {
        font-size: 0.7em;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 0.15rem 0.5rem;
        border-radius: 999px;
        background: #eef2ff;
        color: #3730a3;
      }
      .pill-ok {
        background: #e8f5e9;
        color: #2e7d32;
      }
      .pill-warn {
        background: #fff8e1;
        color: #b26a00;
      }
      small {
        color: #999;
      }
    `,
  ],
})
export class UserListComponent {
  @Input() users: AuthUser[] = [];
  @Input() key?: number;
  @Output() delete = new EventEmitter<number>();
}
