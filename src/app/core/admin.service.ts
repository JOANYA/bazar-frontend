import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Tienda } from './models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/admin/tiendas`;

  listar(): Observable<Tienda[]> {
    return this.http.get<Tienda[]>(this.url);
  }

  crear(d: { nombre_tienda: string; telefono: string; usuario_login: string; password: string }): Observable<Tienda> {
    return this.http.post<Tienda>(this.url, d);
  }

  actualizar(id: number, d: Partial<Pick<Tienda, 'nombre_tienda' | 'telefono' | 'estado'>>): Observable<Tienda> {
    return this.http.patch<Tienda>(`${this.url}/${id}`, d);
  }

  restablecerPassword(id: number, password: string): Observable<{ mensaje?: string }> {
    return this.http.post<{ mensaje?: string }>(`${this.url}/${id}/restablecer-password`, { password });
  }
}
