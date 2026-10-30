import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CompraDetalle, CompraItemEnvio, CompraResumen } from './models';

@Injectable({ providedIn: 'root' })
export class ComprasService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/compras`;

  registrar(body: { proveedor?: string; observaciones?: string; items: CompraItemEnvio[] }): Observable<CompraDetalle> {
    return this.http.post<CompraDetalle>(this.url, body);
  }

  listar(): Observable<CompraResumen[]> {
    return this.http.get<CompraResumen[]>(this.url);
  }

  obtener(id: number): Observable<CompraDetalle> {
    return this.http.get<CompraDetalle>(`${this.url}/${id}`);
  }
}
