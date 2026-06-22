import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

/**
 * Surface API errors to the user. Solo notifica en operaciones de escritura
 * (POST/PUT/DELETE), donde el usuario espera un resultado; los GET fallidos los
 * manejan los estados vacíos de cada pantalla. El 401 lo gestiona authInterceptor.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notify = inject(NotificationService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const isWrite = req.method !== 'GET';
      if (isWrite && err.status !== 401) {
        notify.error(messageFor(err));
      }
      return throwError(() => err);
    })
  );
};

function messageFor(err: HttpErrorResponse): string {
  switch (err.status) {
    case 0: return 'No se pudo conectar con el servidor. Revisa tu conexión.';
    case 400: return firstValidationError(err) || err.error?.title || 'Datos inválidos. Revisa el formulario.';
    case 403: return 'No tienes permiso para realizar esta acción.';
    case 404: return 'No se encontró el recurso solicitado.';
    case 429: return 'Demasiadas solicitudes. Espera un momento e intenta de nuevo.';
    default: return err.error?.title || 'Ocurrió un error al guardar. Inténtalo de nuevo.';
  }
}

/** Extrae el primer mensaje específico de un ValidationProblemDetails de ASP.NET. */
function firstValidationError(err: HttpErrorResponse): string | null {
  const errors = err.error?.errors;
  if (errors && typeof errors === 'object') {
    for (const key of Object.keys(errors)) {
      const arr = errors[key];
      if (Array.isArray(arr) && arr.length > 0) return String(arr[0]);
    }
  }
  return null;
}
