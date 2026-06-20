import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppUser, UserRole, ROLE_PERMISSIONS } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<AppUser | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.role ?? null);
  readonly userName = computed(() => this.currentUser()?.displayName ?? '');

  constructor(private router: Router, private http: HttpClient) {
    // Restore session
    const stored = localStorage.getItem('pc_user');
    const token = localStorage.getItem('pc_token');
    if (stored && token && !this.isTokenExpired(token)) {
      try {
        this.currentUser.set(JSON.parse(stored));
      } catch {
        this.clearSession();
      }
    } else {
      this.clearSession();
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{token: string, user: AppUser}>('http://localhost:3000/api/auth/login', { email, password })
      );
      
      if (response && response.token && response.user) {
        localStorage.setItem('pc_token', response.token);
        this.setUser(response.user);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  logout(): void {
    this.currentUser.set(null);
    this.clearSession();
    this.router.navigate(['/login']);
  }

  hasPermission(permission: string): boolean {
    const role = this.userRole();
    if (!role) return false;
    return ROLE_PERMISSIONS[role].includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  /** Ruta inicial según el rol (operations solo tiene la pantalla de inventario). */
  homeRoute(): string {
    return this.userRole() === 'operations' ? '/inventory' : '/dashboard';
  }

  private setUser(user: AppUser): void {
    this.currentUser.set(user);
    localStorage.setItem('pc_user', JSON.stringify(user));
  }

  private clearSession(): void {
    this.currentUser.set(null);
    localStorage.removeItem('pc_user');
    localStorage.removeItem('pc_token');
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
      return !payload.exp || payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }
}
