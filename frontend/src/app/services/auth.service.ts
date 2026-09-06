import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';

import { API_URL } from '../api.config';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  email_verified: boolean;
  two_factor_enabled: boolean;
  roles: string[];
  created_at?: string;
}

export interface LoginSuccess {
  kind: 'authenticated';
  user: AuthUser;
}

export interface TwoFactorRequired {
  kind: 'two_factor_required';
  challengeToken: string;
}

export type LoginResult = LoginSuccess | TwoFactorRequired;

interface RawLoginResponse {
  user: AuthUser;
  token: string;
  token_type: string;
}

interface RawTwoFactorChallengeResponse {
  two_factor_required: true;
  challenge_token: string;
}

export interface EnableTwoFactorResponse {
  secret: string;
  qr_svg: string;
  recovery_codes: string[];
}

const TOKEN_KEY = 'token';
const USER_KEY = 'currentUser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.readStoredUser());
  readonly currentUser$ = this.currentUserSubject.asObservable();

  /**
   * Password step of login. Resolves to either a fully-authenticated session
   * OR a two-factor challenge that must be completed by verifyTwoFactor().
   */
  login(credentials: LoginRequest): Observable<LoginResult> {
    return this.http
      .post<RawLoginResponse | RawTwoFactorChallengeResponse>(`${API_URL}/login`, credentials, {
        observe: 'response',
      })
      .pipe(
        map((response): LoginResult => {
          const body = response.body;
          if (body !== null && 'two_factor_required' in body) {
            return { kind: 'two_factor_required', challengeToken: body.challenge_token };
          }
          this.setSession(body as RawLoginResponse);
          return { kind: 'authenticated', user: (body as RawLoginResponse).user };
        }),
      );
  }

  /** Second step of login when 2FA is enabled — exchanges challenge + code for a token. */
  verifyTwoFactor(challengeToken: string, code: string): Observable<AuthUser> {
    return this.http
      .post<RawLoginResponse>(`${API_URL}/login/two-factor`, {
        challenge_token: challengeToken,
        code,
      })
      .pipe(
        tap((response) => this.setSession(response)),
        map((response) => response.user),
      );
  }

  logout(): Observable<unknown> {
    return this.http.post(`${API_URL}/logout`, {}).pipe(
      catchError(() => of(null)),
      finalize(() => this.clearSession()),
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/forgot-password`, { email });
  }

  resetPassword(payload: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/reset-password`, payload);
  }

  resendVerificationEmail(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${API_URL}/email/verification-notification`, {});
  }

  enableTwoFactor(): Observable<EnableTwoFactorResponse> {
    return this.http.post<EnableTwoFactorResponse>(`${API_URL}/two-factor/enable`, {});
  }

  confirmTwoFactor(code: string): Observable<{ message: string }> {
    return this.http
      .post<{ message: string }>(`${API_URL}/two-factor/confirm`, { code })
      .pipe(tap(() => this.patchCurrentUser({ two_factor_enabled: true })));
  }

  disableTwoFactor(password: string): Observable<{ message: string }> {
    return this.http
      .request<{ message: string }>('DELETE', `${API_URL}/two-factor`, {
        body: { password },
      })
      .pipe(tap(() => this.patchCurrentUser({ two_factor_enabled: false })));
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  private setSession(response: RawLoginResponse): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    this.currentUserSubject.next(response.user);
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  private patchCurrentUser(patch: Partial<AuthUser>): void {
    const current = this.currentUserSubject.value;
    if (current === null) return;
    const updated: AuthUser = { ...current, ...patch };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    this.currentUserSubject.next(updated);
  }

  private readStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      // Corrupted storage — treat as logged-out rather than crashing bootstrap.
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
  }
}
