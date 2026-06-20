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

  private readonly api = 'http://localhost:3000/api/auth';

  constructor(private router: Router, private http: HttpClient) {
    // El token vive en una cookie HttpOnly (no accesible a JS). Restauramos el perfil
    // guardado para la UI y renovamos la sesión contra el backend; si la cookie ya no
    // es válida, el backend responde 401 y el interceptor limpia la sesión.
    const stored = localStorage.getItem('pc_user');
    if (stored) {
      try {
        this.currentUser.set(JSON.parse(stored));
        this.refresh();
      } catch {
        this.clearSession();
      }
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ token: string, user: AppUser }>(`${this.api}/login`, { email, password }, { withCredentials: true })
      );

      // El token NO se guarda en JS: queda en la cookie HttpOnly que pone el backend.
      if (response && response.user) {
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
    // Pide al backend que borre la cookie; pase lo que pase, limpiamos en local.
    this.http.post(`${this.api}/logout`, {}, { withCredentials: true }).subscribe({
      next: () => {},
      error: () => {}
    });
    this.currentUser.set(null);
    this.clearSession();
    this.router.navigate(['/login']);
  }

  /** Renueva la sesión (sliding) y valida que la cookie siga vigente. */
  private refresh(): void {
    this.http.post<{ user: AppUser }>(`${this.api}/refresh`, {}, { withCredentials: true }).subscribe({
      next: res => { if (res?.user) this.setUser(res.user); },
      error: () => { /* 401 lo maneja el interceptor */ }
    });
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
}
