import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { API_URL } from '../api.config';
import { AuthUser } from './auth.service';

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

interface UserCollectionResponse {
  data: AuthUser[];
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getUsers(): Observable<AuthUser[]> {
    return this.http
      .get<UserCollectionResponse>(`${API_URL}/users`)
      .pipe(map((response) => response.data));
  }

  createUser(payload: CreateUserPayload): Observable<{ data: AuthUser }> {
    return this.http.post<{ data: AuthUser }>(`${API_URL}/users`, payload);
  }

  deleteUser(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${API_URL}/users/${id}`);
  }
}
