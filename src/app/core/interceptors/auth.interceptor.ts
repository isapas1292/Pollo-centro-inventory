import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Adjunta el token JWT (guardado en localStorage tras el login) a cada petición
 * saliente como cabecera Authorization: Bearer. Necesario para los endpoints
 * protegidos del backend (p. ej. el módulo de Contabilidad, solo-admin).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('pc_token');
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req).pipe(
    catchError(error => {
      if (error?.status === 401) {
        localStorage.removeItem('pc_user');
        localStorage.removeItem('pc_token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
