import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginAdminRespuesta, LoginTiendaRespuesta, Rol, Sesion } from './models';

const CLAVE = 'bazar.sesion';

interface PayloadJwt { id?: number; rol?: Rol; exp?: number }

function decodificar(token: string): PayloadJwt | null {
  try {
    const p = token.split('.')[1];
    if (!p) return null;
    const b64 = p.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='))
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json) as PayloadJwt;
  } catch {
    return null;
  }
}

/**
 * Sesión de la tendera o del administrador.
 * El rol y el id se leen SIEMPRE del JWT firmado por el backend, nunca de un objeto
 * editable en localStorage. La autorización real la sigue haciendo el backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = `${environment.apiUrl}/auth`;

  readonly sesion = signal<Sesion | null>(this.restaurar());
  readonly autenticado = computed(() => this.sesion() !== null);
  readonly rol = computed(() => this.sesion()?.rol ?? null);
  readonly nombre = computed(() => this.sesion()?.nombre ?? '');

  token(): string | null {
    return this.sesion()?.token ?? null;
  }

  loginTienda(usuario_login: string, password: string): Observable<LoginTiendaRespuesta> {
    return this.http.post<LoginTiendaRespuesta>(`${this.base}/login`, { usuario_login, password }).pipe(
      tap((r) => {
        const p = decodificar(r.token);
        this.guardar({
          token: r.token,
          rol: 'tendera',
          id: p?.id ?? r.tienda.id_usuario,
          nombre: r.tienda.nombre_tienda,
          telefono: r.tienda.telefono,
          usuario: r.tienda.usuario_login
        });
      })
    );
  }

  loginAdmin(correo: string, password: string): Observable<LoginAdminRespuesta> {
    return this.http.post<LoginAdminRespuesta>(`${this.base}/admin/login`, { correo, password }).pipe(
      tap((r) => {
        const p = decodificar(r.token);
        this.guardar({ token: r.token, rol: 'admin', id: p?.id ?? r.admin.id_admin, nombre: r.admin.nombre });
      })
    );
  }

  cambiarPassword(password_actual: string, password_nueva: string): Observable<{ mensaje: string }> {
    return this.http.put<{ mensaje: string }>(`${this.base}/password`, { password_actual, password_nueva });
  }

  cerrarSesion(vencida = false): void {
    localStorage.removeItem(CLAVE);
    this.sesion.set(null);
    this.router.navigate(['/login'], vencida ? { queryParams: { vencida: 1 } } : {});
  }

  private guardar(s: Sesion): void {
    localStorage.setItem(CLAVE, JSON.stringify(s));
    this.sesion.set(s);
  }

  private restaurar(): Sesion | null {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return null;
      const s = JSON.parse(crudo) as Sesion;
      const p = s?.token ? decodificar(s.token) : null;
      if (!p?.exp || p.exp * 1000 <= Date.now() || !p.rol) {
        localStorage.removeItem(CLAVE);
        return null;
      }
      return { ...s, rol: p.rol, id: p.id ?? s.id };
    } catch {
      localStorage.removeItem(CLAVE);
      return null;
    }
  }
}
