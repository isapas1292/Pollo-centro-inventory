import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

/**
 * Autenticación por cookie HttpOnly: el JWT lo gestiona el navegador en una cookie
 * que NO es accesible desde JavaScript (protección frente a robo por XSS). Aquí solo
 * activamos `withCredentials` para que la cookie viaje en cada petición, y ante un 401
 * limpiamos el perfil local y redirigimos al login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  req = req.clone({ withCredentials: true });

  return next(req).pipe(
    catchError(error => {
      if (error?.status === 401) {
        localStorage.removeItem('pc_user');
        localStorage.removeItem('pc_token'); // limpieza de sesiones antiguas
        if (!router.url.startsWith('/login')) router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
