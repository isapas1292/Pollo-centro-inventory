import { Injectable, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AppUser, UserRole, ROLE_PERMISSIONS } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private currentUser = signal<AppUser | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this.currentUser());
  readonly userRole = computed(() => this.currentUser()?.role ?? null);
  readonly userName = computed(() => this.currentUser()?.displayName ?? '');

  constructor(private router: Router) {
    // Restore session
    const stored = localStorage.getItem('pc_user');
    if (stored) {
      try {
        this.currentUser.set(JSON.parse(stored));
      } catch {
        localStorage.removeItem('pc_user');
      }
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    // Get users from storage
    const users: AppUser[] = JSON.parse(localStorage.getItem('pc_users') || '[]');

    // Check default admin
    if (email === 'admin@pollocentro.com' && password === 'admin123') {
      const adminUser: AppUser = {
        uid: 'admin-001',
        email: 'admin@pollocentro.com',
        displayName: 'Administrador',
        role: 'master',
        active: true,
        createdAt: new Date(),
      };
      this.setUser(adminUser);
      return true;
    }

    // Check registered users (password is stored as plain text for demo - in production use Firebase Auth)
    const passwords: Record<string, string> = JSON.parse(localStorage.getItem('pc_passwords') || '{}');
    const user = users.find(u => u.email === email && passwords[u.uid] === password && u.active);
    if (user) {
      this.setUser(user);
      return true;
    }

    return false;
  }

  logout(): void {
    this.currentUser.set(null);
    localStorage.removeItem('pc_user');
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

  private setUser(user: AppUser): void {
    this.currentUser.set(user);
    localStorage.setItem('pc_user', JSON.stringify(user));
  }
}
