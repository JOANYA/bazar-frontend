import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Zona de la tendera. Un administrador que llegue aquí va a su panel. */
export const tienderaGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  return auth.rol() === 'tendera' ? true : router.createUrlTree(['/admin']);
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado()) return router.createUrlTree(['/login']);
  return auth.rol() === 'admin' ? true : router.createUrlTree(['/mostrador']);
};

/** Login: si ya hay sesión, se salta directo al trabajo. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.autenticado()) return true;
  return router.createUrlTree([auth.rol() === 'admin' ? '/admin' : '/mostrador']);
};
