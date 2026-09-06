import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../services/api';
import { UserListComponent } from '../../components/user-list/user-list.component';
import { UserFormComponent } from '../../components/user-form/user-form.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, UserListComponent, UserFormComponent],
  template: `
    <div>
      <app-user-form (submitForm)="createUser($event)"></app-user-form>

      <hr />

      <div *ngIf="users.length === 0 && !isLoading">No users found</div>
      <div *ngIf="isLoading">Loading users...</div>

      <app-user-list
        [users]="users"
        [key]="updateKey"
        (delete)="deleteUser($event)"
        *ngIf="users.length > 0"
      >
      </app-user-list>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  users: any[] = [];
  isLoading = false;
  updateKey = 0;
  errorMessage = '';

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.api.getUsers().subscribe({
      next: (data: any[]) => {
        this.users = [...data];
        this.updateKey++;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load users.';
        this.isLoading = false;
      },
    });
  }

  createUser(userData: any): void {
    this.api.createUser(userData).subscribe({
      next: () => this.loadUsers(),
      error: () => {
        this.errorMessage = 'Failed to create user.';
      },
    });
  }

  deleteUser(id: number): void {
    if (!confirm('Are you sure you want to delete the user?')) {
      return;
    }

    this.api.deleteUser(id).subscribe({
      next: () => this.loadUsers(),
      error: () => {
        this.errorMessage = 'Failed to delete user.';
      },
    });
  }
}
