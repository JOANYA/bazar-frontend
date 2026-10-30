import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { parametros } from './api';
import { MetodoPago, VentaDetalle, VentaEnvio, VentaResumen } from './models';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/ventas`;

  registrar(body: VentaEnvio): Observable<VentaDetalle> {
    return this.http.post<VentaDetalle>(this.url, body);
  }

  listar(f: { fecha?: string; metodo_pago?: MetodoPago | ''; estado?: string; limite?: number } = {}): Observable<VentaResumen[]> {
    return this.http.get<VentaResumen[]>(this.url, {
      params: parametros({ fecha: f.fecha, metodo_pago: f.metodo_pago, estado: f.estado, limite: f.limite ?? 200 })
    });
  }

  obtener(id: number): Observable<VentaDetalle> {
    return this.http.get<VentaDetalle>(`${this.url}/${id}`);
  }

  anular(id: number, motivo?: string): Observable<VentaDetalle> {
    return this.http.post<VentaDetalle>(`${this.url}/${id}/anular`, { motivo });
  }
}
