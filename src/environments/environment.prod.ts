/**
 * Configuración de PRODUCCIÓN.
 * `apiUrl` relativo ('/api') asume que el frontend y la API se sirven detrás del mismo
 * dominio/proxy inverso (recomendado: la cookie de sesión queda first-party, sin CORS).
 * Si la API vive en otro host, pon aquí la URL completa: 'https://api.tudominio.com/api'.
 */
export const environment = {
  production: true,
  apiUrl: '/api',
};
