import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {HttpErrorResponse} from '@angular/common/http';
import {BehaviorSubject, map, Observable, tap} from 'rxjs';

import {environment} from '../../../environments/environment';
import {clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken} from './auth-token.storage';

export type UserRole = 'student' | 'company';

export interface AuthUser {
  id: number;
  role: UserRole;
  email: string;
  company?: {id: number; name: string} | null;
  student?: {id: number; name: string} | null;
}

export interface AuthState {
  role: UserRole | null;
  email: string | null;
  userId: number | null;
  studentId: number | null;
  studentName: string | null;
  companyId: number | null;
  companyName: string | null;
}

const ANON_STATE: AuthState = {
  role: null,
  email: null,
  userId: null,
  studentId: null,
  studentName: null,
  companyId: null,
  companyName: null,
};

interface LoginResponse {
  token: string;
  user: AuthUser;
}

interface MeResponse {
  data: AuthUser;
}

function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

@Injectable({providedIn: 'root'})
export class AuthService {
  private readonly readySubject = new BehaviorSubject<boolean>(false);
  readonly ready$ = this.readySubject.asObservable();

  private readonly stateSubject = new BehaviorSubject<AuthState>(ANON_STATE);
  readonly authState$ = this.stateSubject.asObservable();

  constructor(private readonly http: HttpClient) {
    this.bootstrap();
  }

  get token(): string | null {
    return getStoredAuthToken();
  }

  login(role: UserRole, email: string, password: string): Observable<AuthState> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, {role, email, password}).pipe(
      tap((res) => setStoredAuthToken(res.token)),
      map((res) => this.toState(res.user)),
      tap((state) => this.stateSubject.next(state)),
    );
  }

  registerStudent(payload: {
    email: string;
    password: string;
    name: string;
    headline?: string;
    phone?: string;
    location?: string;
    linkedInUrl?: string;
    githubUrl?: string;
    bio?: string;
  }): Observable<AuthState> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/register/student`, payload).pipe(
      tap((res) => setStoredAuthToken(res.token)),
      map((res) => this.toState(res.user)),
      tap((state) => this.stateSubject.next(state)),
    );
  }

  registerCompany(payload: {
    email: string;
    password: string;
    name: string;
    location?: string;
    websiteUrl?: string;
  }): Observable<AuthState> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/register/company`, payload).pipe(
      tap((res) => setStoredAuthToken(res.token)),
      map((res) => this.toState(res.user)),
      tap((state) => this.stateSubject.next(state)),
    );
  }

  logout(): void {
    clearStoredAuthToken();
    this.stateSubject.next(ANON_STATE);
  }

  refreshMe(): Observable<AuthState> {
    return this.http.get<MeResponse>(`${environment.apiUrl}/auth/me`).pipe(
      map((res) => this.toState(res.data)),
      tap((state) => this.stateSubject.next(state)),
    );
  }

  private bootstrap(): void {
    const t = this.token;
    if (!t) {
      this.readySubject.next(true);
      return;
    }

    // Provide a quick best-effort state so guards/nav have something immediately.
    const payload = decodeJwtPayload(t);
    if (payload?.role && payload?.email && payload?.sub) {
      this.stateSubject.next({
        role: payload.role,
        email: payload.email,
        userId: payload.sub,
        studentId: payload.studentId ?? null,
        studentName: null,
        companyId: payload.companyId ?? null,
        companyName: null,
      });
    }

    // Mark ready immediately so refresh doesn't "log out" if the API is temporarily unreachable.
    this.readySubject.next(true);

    this.refreshMe().subscribe({
      next: () => {},
      error: (err: unknown) => {
        // Only clear session on explicit auth failures.
        if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
          this.logout();
        }
        // For transient/network errors (status 0, 5xx, etc.), keep the token and decoded state.
      },
    });
  }

  private toState(user: AuthUser): AuthState {
    return {
      role: user.role,
      email: user.email,
      userId: user.id,
      studentId: user.student?.id ?? null,
      studentName: user.student?.name ?? null,
      companyId: user.company?.id ?? null,
      companyName: user.company?.name ?? null,
    };
  }
}
