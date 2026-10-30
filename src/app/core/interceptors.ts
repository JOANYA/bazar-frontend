import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Agrega el token a toda petición que va al backend del bazar. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (!token || !req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

export interface ErrorApi {
  status: number;
  message: string;
}

/**
 * Unifica los errores: el backend responde { status:'error', message } en español.
 * Si no hay internet (status 0) se explica con palabras de tienda, no de informática.
 * Un 401 fuera del login significa sesión vencida: se manda al login.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      const esLogin = /\/auth\/(admin\/)?login$/.test(req.url);
      if (e.status === 401 && !esLogin && auth.autenticado()) auth.cerrarSesion(true);

      let message: string;
      if (e.status === 0) message = 'No hay conexión con el sistema. Revisa tu internet y vuelve a intentar.';
      else if (typeof e.error?.message === 'string') message = e.error.message;
      else if (e.status === 429) message = 'Demasiados intentos. Espera unos minutos.';
      else if (e.status >= 500) message = 'El sistema tuvo un problema. Inténtalo en un momento.';
      else message = 'No se pudo completar la acción.';

      const err: ErrorApi = { status: e.status, message };
      return throwError(() => err);
    })
  );
};
