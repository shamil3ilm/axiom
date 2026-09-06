import { Component, Input, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div>
      <h3>Users List</h3>
      <ul>
        <li *ngFor="let user of users">
          {{ user.name }} - {{ user.email }}
          <button (click)="delete.emit(user.id)">Delete</button>
        </li>
      </ul>
    </div>
  `
})
export class UserListComponent {
  @Input() users: any[] = [];
  @Input() key?: number;
  @Output() delete = new EventEmitter<number>();
}
