import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn()) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const roleGuard = (...permissions: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
      router.navigate(['/login']);
      return false;
    }

    if (auth.hasAnyPermission(permissions)) {
      return true;
    }

    // Sin permiso: lo enviamos a la pantalla inicial de su rol (evita bucles).
    router.navigate([auth.homeRoute()]);
    return false;
  };
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isLoggedIn() && auth.userRole() === 'admin') {
    return true;
  }

  // Si no es admin, cierra sesión o mándalo a una página de error
  // Por ahora lo enviamos al login
  auth.logout();
  return false;
};
