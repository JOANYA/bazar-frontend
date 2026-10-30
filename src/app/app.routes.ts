import { Routes } from '@angular/router';
import { adminGuard, invitadoGuard, tienderaGuard } from './core/guards';

/** Todas las pantallas se cargan bajo demanda: el primer paquete solo trae el menú. */
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'mostrador' },
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [tienderaGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: 'mostrador', loadComponent: () => import('./pages/mostrador/mostrador.component').then((m) => m.MostradorComponent) },
      { path: 'fiados', loadComponent: () => import('./pages/fiados/fiados.component').then((m) => m.FiadosComponent) },
      { path: 'inventario', loadComponent: () => import('./pages/inventario/inventario.component').then((m) => m.InventarioComponent) },
      { path: 'mercaderia', loadComponent: () => import('./pages/mercaderia/mercaderia.component').then((m) => m.MercaderiaComponent) },
      { path: 'caja', loadComponent: () => import('./pages/caja/caja.component').then((m) => m.CajaComponent) },
      { path: 'cuenta', loadComponent: () => import('./pages/cuenta/cuenta.component').then((m) => m.CuentaComponent) }
    ]
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./pages/no-encontrado/no-encontrado.component').then((m) => m.NoEncontradoComponent)
  }
];
