import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../api.config';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) {}

  getUsers():Observable<any[]> {
    return this.http.get<any[]>(`${API_URL}/users`);
  }

  createUser(data: any) {
    return this.http.post(`${API_URL}/users`, data);
  }

  deleteUser(id: number) {
    return this.http.delete(`${API_URL}/users/${id}`);
  }
}
