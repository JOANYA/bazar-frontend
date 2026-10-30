import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AuthService } from './auth.service';
import { redondear } from './format';
import { MetodoPago, Producto, VentaEnvio } from './models';

export interface LineaTicket {
  id_producto: number;
  nombre: string;
  precio: number;
  cantidad: number;
  stock: number;
  unidad: string;
  imagen_url: string | null;
  presentaciones?: any[]; // <--- ¡Indispensable para que el ticket no las borre!
}

interface Guardado { lineas: LineaTicket[]; uuid: string }

const nuevoUuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

/**
 * El ticket en curso. Se guarda en el navegador: si se va la luz o se recarga la
 * página, el carrito sigue ahí. El uuid viaja con la venta: si el internet se cae
 * y se reintenta, el backend no la duplica.
 */
@Injectable({ providedIn: 'root' })
export class TicketService {
  private auth = inject(AuthService);

  readonly lineas = signal<LineaTicket[]>([]);
  readonly uuid = signal(nuevoUuid());

  readonly total = computed(() => redondear(this.lineas().reduce((a, l) => a + l.precio * l.cantidad, 0)));
  readonly unidades = computed(() => this.lineas().reduce((a, l) => a + l.cantidad, 0));
  readonly vacio = computed(() => this.lineas().length === 0);

  constructor() {
    // Cada tienda tiene su propio ticket guardado; si cambia la sesión, se recarga el que corresponde.
    effect(
      () => {
        const id = this.auth.sesion()?.id;
        untracked(() => this.cargar(id));
      },
      { allowSignalWrites: true }
    );
  }

  cantidadDe(idProducto: number): number {
    return this.lineas().find((l) => l.id_producto === idProducto)?.cantidad ?? 0;
  }

  /** Suma una unidad (o `cantidad`). Devuelve un mensaje si no se pudo por falta de stock. */
  agregar(p: Producto, cantidad = 1): { ok: boolean; mensaje?: string } {
    if (p.stock_actual <= 0) return { ok: false, mensaje: `"${p.nombre}" está agotado.` };
    const actual = this.cantidadDe(p.id_producto);
    if (actual + cantidad > p.stock_actual) {
      return { ok: false, mensaje: `Solo quedan ${p.stock_actual} de "${p.nombre}".` };
    }
    this.lineas.update((ls) => {
      const existe = ls.some((l) => l.id_producto === p.id_producto);
      if (existe) {
        return ls.map((l) =>
          l.id_producto === p.id_producto
            ? {
                ...l,
                cantidad: l.cantidad + cantidad,
                stock: p.stock_actual,
                precio: p.precio_venta,
                presentaciones: (p as any).presentaciones || l.presentaciones || []
              }
            : l
        );
      }
      return [
        ...ls,
        {
          id_producto: p.id_producto,
          nombre: p.nombre,
          precio: p.precio_venta,
          cantidad,
          stock: p.stock_actual,
          unidad: p.unidad_medida,
          imagen_url: p.imagen_url,
          presentaciones: (p as any).presentaciones || [] // <--- Asigna las presentaciones al crear la línea
        }
      ];
    });
    this.guardar();
    return { ok: true };
  }

  fijarCantidad(idProducto: number, cantidad: number): string | null {
    const l = this.lineas().find((x) => x.id_producto === idProducto);
    if (!l) return null;
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      this.quitar(idProducto);
      return null;
    }
    const q = Math.floor(cantidad);
    if (q > l.stock) {
      this.lineas.update((ls) => ls.map((x) => (x.id_producto === idProducto ? { ...x, cantidad: l.stock } : x)));
      this.guardar();
      return `Solo quedan ${l.stock} de "${l.nombre}".`;
    }
    this.lineas.update((ls) => ls.map((x) => (x.id_producto === idProducto ? { ...x, cantidad: q } : x)));
    this.guardar();
    return null;
  }

  cambiar(idProducto: number, delta: number): string | null {
    const l = this.lineas().find((x) => x.id_producto === idProducto);
    return l ? this.fijarCantidad(idProducto, l.cantidad + delta) : null;
  }

  quitar(idProducto: number): void {
    this.lineas.update((ls) => ls.filter((l) => l.id_producto !== idProducto));
    this.guardar();
  }

  /** Limpia el ticket y estrena un identificador nuevo para la próxima venta. */
  vaciar(): void {
    this.lineas.set([]);
    this.uuid.set(nuevoUuid());
    this.guardar();
  }

  armarVenta(metodo: MetodoPago, idCliente?: number): VentaEnvio {
    return {
      items: this.lineas().map((l) => ({ id_producto: l.id_producto, cantidad: l.cantidad })),
      metodo_pago: metodo,
      id_cliente: idCliente,
      uuid_cliente: this.uuid()
    };
  }

  private clave(id: number | undefined): string | null {
    return id ? `bazar.ticket.${id}` : null;
  }

  private guardar(): void {
    const k = this.clave(this.auth.sesion()?.id);
    if (!k) return;
    const g: Guardado = { lineas: this.lineas(), uuid: this.uuid() };
    try { localStorage.setItem(k, JSON.stringify(g)); } catch { /* almacenamiento lleno: no es grave */ }
  }

  private cargar(id: number | undefined): void {
    const k = this.clave(id);
    if (!k) {
      this.lineas.set([]);
      this.uuid.set(nuevoUuid());
      return;
    }
    try {
      const g = JSON.parse(localStorage.getItem(k) ?? 'null') as Guardado | null;
      if (g && Array.isArray(g.lineas) && typeof g.uuid === 'string') {
        this.lineas.set(g.lineas);
        this.uuid.set(g.uuid);
        return;
      }
    } catch { /* guardado dañado: se empieza limpio */ }
    this.lineas.set([]);
    this.uuid.set(nuevoUuid());
  }
}
