import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { parametros } from './api';
import { Cliente, ClienteDetalle, MetodoCobro, PagoResultado } from './models';

/**
 * Los vecinos se guardan en memoria: son pocos (unos cientos) y así el autocompletado
 * del "Fiado Express" es instantáneo, sin esperar al servidor en cada letra.
 */
@Injectable({ providedIn: 'root' })
export class ClientesService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/clientes`;

  readonly vecinos = signal<Cliente[]>([]);
  readonly cargados = signal(false);

  cargar(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.url, { params: parametros({ limite: 200 }) }).pipe(
      tap((l) => {
        this.vecinos.set(l);
        this.cargados.set(true);
      })
    );
  }

  listar(q = '', conDeuda = false): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.url, {
      params: parametros({ q, con_deuda: conDeuda ? true : undefined, limite: 200 })
    });
  }

  crear(d: { nombre: string; telefono?: string | null; direccion?: string | null; limite_credito?: number }): Observable<Cliente> {
    return this.http.post<Cliente>(this.url, d).pipe(tap((c) => this.vecinos.update((l) => [...l, c])));
  }

  detalle(id: number): Observable<ClienteDetalle> {
    return this.http.get<ClienteDetalle>(`${this.url}/${id}`, { params: parametros({ limite: 60 }) });
  }

  actualizar(id: number, d: Partial<Pick<Cliente, 'nombre' | 'telefono' | 'direccion' | 'limite_credito'>>): Observable<Cliente> {
    return this.http.patch<Cliente>(`${this.url}/${id}`, d).pipe(
      tap((c) => this.vecinos.update((l) => l.map((x) => (x.id_cliente === id ? c : x))))
    );
  }

  cobrar(id: number, monto: number, metodo_pago: MetodoCobro, observacion?: string): Observable<PagoResultado> {
    return this.http.post<PagoResultado>(`${this.url}/${id}/pagos`, { monto, metodo_pago, observacion }).pipe(
      tap((r) => this.fijarSaldo(r.id_cliente, r.saldo_deudor))
    );
  }

  /** Actualiza el saldo en memoria (después de fiar o cobrar) sin volver a pedir la lista. */
  fijarSaldo(id: number, saldo: number): void {
    this.vecinos.update((l) => l.map((x) => (x.id_cliente === id ? { ...x, saldo_deudor: saldo } : x)));
  }
}
