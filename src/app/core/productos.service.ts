import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { parametros } from './api';
import { MovimientoStock, NivelStock, Presentacion, Producto, ProductoForm } from './models';

export interface FiltroProductos {
  q?: string;
  nivel?: NivelStock | '';
  favoritos?: boolean;
  estado?: 'Disponible' | 'Agotado' | 'Inactivo' | '';
  limite?: number;
  desdeFila?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/productos`;

  // Método auxiliar para armar el FormData cuando se envían textos y/o archivos
  private construirFormData(datos: Record<string, any>, archivo?: File | null): FormData {
    const formData = new FormData();
    Object.keys(datos).forEach((key) => {
      const valor = datos[key];
      if (valor !== null && valor !== undefined) {
        formData.append(key, valor);
      }
    });
    if (archivo) {
      formData.append('imagen', archivo);
    }
    return formData;
  }

  listar(f: FiltroProductos = {}): Observable<Producto[]> {
    return this.http.get<Producto[]>(this.url, {
      params: parametros({
        q: f.q,
        nivel: f.nivel,
        favoritos: f.favoritos ? true : undefined,
        estado: f.estado,
        limite: f.limite ?? 50,
        desde_fila: f.desdeFila
      })
    });
  }

  /** La cuadrícula "Un Toque": favoritos fijados + lo más vendido de 30 días. */
  rapidos(limite = 15): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.url}/rapidos`, { params: parametros({ limite }) });
  }

  alertas(): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.url}/alertas`);
  }

  porCodigo(codigo: string): Observable<Producto> {
    return this.http.get<Producto>(`${this.url}/codigo/${encodeURIComponent(codigo)}`);
  }

  obtener(id: number): Observable<Producto> {
    return this.http.get<Producto>(`${this.url}/${id}`);
  }

  crear(body: ProductoForm, archivo?: File | null): Observable<Producto> {
    const formData = this.construirFormData(body, archivo);
    return this.http.post<Producto>(this.url, formData);
  }

  /** El stock NO se edita aquí: se usa ajustarStock() o una compra. */
  actualizar(id: number, body: Partial<Omit<ProductoForm, 'stock_actual'>>, archivo?: File | null): Observable<Producto> {
    const formData = this.construirFormData(body, archivo);
    return this.http.patch<Producto>(`${this.url}/${id}`, formData);
  }

  favorito(id: number, valor: boolean): Observable<Producto> {
    return this.http.patch<Producto>(`${this.url}/${id}/favorito`, { es_favorito: valor });
  }

  desactivar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  reactivar(id: number): Observable<Producto> {
    return this.http.post<Producto>(`${this.url}/${id}/reactivar`, {});
  }

  ajustarStock(id: number, stock_nuevo: number, motivo?: string): Observable<Producto> {
    return this.http.post<Producto>(`${this.url}/${id}/ajuste-stock`, { stock_nuevo, motivo });
  }

  movimientos(id: number, limite = 40): Observable<MovimientoStock[]> {
    return this.http.get<MovimientoStock[]>(`${this.url}/${id}/movimientos`, { params: parametros({ limite }) });
  }

  agregarPresentacion(id: number, nombre: string, unidades: number): Observable<Presentacion[]> {
    return this.http.post<Presentacion[]>(`${this.url}/${id}/presentaciones`, { nombre, unidades });
  }

  quitarPresentacion(id: number, idPresentacion: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/presentaciones/${idPresentacion}`);
  }
}