import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { parametros } from './api';
import { CierreHistorial, Inicio, ReporteDia } from './models';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/reportes`;

  /** Pulso del día (ventas, por reponer, cuánto me deben). Lo comparten el menú y el mostrador. */
  readonly inicio = signal<Inicio | null>(null);

  refrescarInicio(): void {
    this.http.get<Inicio>(`${this.url}/inicio`).subscribe({
      next: (i) => this.inicio.set(i),
      error: () => { /* el pulso es informativo: si falla, no se molesta a la señora */ }
    });
  }

  dia(fecha?: string): Observable<ReporteDia> {
    return this.http.get<ReporteDia>(`${this.url}/dia`, { params: parametros({ fecha }) });
  }

  cerrar(fecha?: string): Observable<ReporteDia> {
    return this.http.post<ReporteDia>(`${this.url}/cierre`, fecha ? { fecha } : {}).pipe(
      tap(() => this.refrescarInicio())
    );
  }

  historial(limite = 30): Observable<CierreHistorial[]> {
    return this.http.get<CierreHistorial[]>(`${this.url}/cierres`, { params: parametros({ limite }) });
  }
}
