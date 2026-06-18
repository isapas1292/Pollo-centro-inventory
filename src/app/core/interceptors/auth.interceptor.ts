import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Adjunta el token JWT (guardado en localStorage tras el login) a cada petición
 * saliente como cabecera Authorization: Bearer. Necesario para los endpoints
 * protegidos del backend (p. ej. el módulo de Contabilidad, solo-admin).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('pc_token');
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
