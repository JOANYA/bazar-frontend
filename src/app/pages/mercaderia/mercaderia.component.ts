import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComprasService } from '../../core/compras.service';
import { aNumero, cuandoRelativo, mensajeError, redondear, soles } from '../../core/format';
import { CompraDetalle, CompraItemEnvio, CompraResumen, Presentacion, Producto } from '../../core/models';
import { ProductosService } from '../../core/productos.service';
import { ReportesService } from '../../core/reportes.service';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { EscanerComponent } from '../../shared/escaner.component';
import { IconoComponent } from '../../shared/icono.component';
import { ModalComponent } from '../../shared/modal.component';

interface LineaCompra {
  producto: Producto;
  presentaciones: Presentacion[];
  /** 0 = por unidad suelta */
  idPres: number;
  cantidad: string;
  costo: string;
  precio: string;
}

@Component({
  selector: 'app-mercaderia',
  standalone: true,
  imports: [FormsModule, AvatarComponent, EscanerComponent, IconoComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mercaderia.component.html',
  styleUrl: './mercaderia.component.css'
})
export class MercaderiaComponent implements OnInit {
  private productos = inject(ProductosService);
  private compras = inject(ComprasService);
  private reportes = inject(ReportesService);
  private toast = inject(ToastService);

  readonly soles = soles;

  readonly proveedor = signal('');
  readonly lineas = signal<LineaCompra[]>([]);
  readonly q = signal('');
  readonly sugerencias = signal<Producto[] | null>(null);
  readonly buscando = signal(false);
  readonly escaner = signal(false);
  readonly lectura = signal<{ texto: string; mal: boolean } | null>(null);
  readonly guardando = signal(false);
  readonly error = signal('');

  readonly historial = signal<CompraResumen[]>([]);
  readonly detalle = signal<CompraDetalle | null>(null);

  readonly resumen = computed(() => {
    let total = 0;
    let unidades = 0;
    for (const l of this.lineas()) {
      const c = this.calcular(l);
      total += c.total;
      unidades += c.unidades;
    }
    return { total: redondear(total), unidades, productos: this.lineas().length };
  });

  private busq$ = new Subject<string>();

  constructor() {
    this.busq$
      .pipe(
        debounceTime(150),
        map((v) => v.trim()),
        distinctUntilChanged(),
        tap((v) => {
          if (v.length < 2) { this.sugerencias.set(null); this.buscando.set(false); }
        }),
        filter((v) => v.length >= 2),
        tap(() => this.buscando.set(true)),
        switchMap((v) => this.productos.listar({ q: v, limite: 8 }).pipe(catchError(() => of([] as Producto[])))),
        takeUntilDestroyed()
      )
      .subscribe((l) => {
        this.sugerencias.set(l);
        this.buscando.set(false);
      });
  }

  ngOnInit(): void {
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.compras.listar().subscribe({ next: (l) => this.historial.set(l.slice(0, 8)), error: () => undefined });
  }

  onBuscar(v: string): void {
    this.q.set(v);
    this.busq$.next(v);
  }

  /** Cálculo de una línea: lo que entra al stock y lo que costó. */
  calcular(l: LineaCompra): { factor: number; unidades: number; total: number; costoUnit: number | null; margen: number | null } {
    const pres = l.presentaciones.find((p) => p.id_presentacion === l.idPres);
    const factor = pres?.unidades ?? 1;
    const cant = aNumero(l.cantidad) ?? 0;
    const costo = aNumero(l.costo);
    const precio = aNumero(l.precio);
    const costoUnit = costo !== null && costo > 0 ? redondear(costo / factor) : null;
    const margen = costoUnit !== null && precio !== null && precio > 0 ? Math.round(((precio - costoUnit) / precio) * 100) : null;
    return { factor, unidades: Math.floor(cant) * factor, total: redondear(cant * (costo ?? 0)), costoUnit, margen };
  }

  // ------------------------------------------------------------------ agregar productos
  elegir(p: Producto): void {
    this.q.set('');
    this.sugerencias.set(null);
    this.busq$.next('');
    if (this.lineas().some((l) => l.producto.id_producto === p.id_producto)) {
      this.toast.aviso('Ya está en la lista', p.nombre);
      return;
    }
    // Se pide la ficha completa para conocer sus presentaciones (cajas, docenas…)
    this.productos.obtener(p.id_producto).subscribe({
      next: (d) => {
        this.lineas.update((ls) => [
          ...ls,
          {
            producto: d,
            presentaciones: d.presentaciones ?? [],
            idPres: 0,
            cantidad: '',
            costo: d.precio_costo > 0 ? String(d.precio_costo) : '',
            precio: String(d.precio_venta)
          }
        ]);
        this.error.set('');
      },
      error: (e) => this.toast.error('No se pudo agregar', mensajeError(e))
    });
  }

  alEnter(): void {
    const s = this.sugerencias();
    if (s?.length) this.elegir(s[0]);
  }

  alLeerCodigo(codigo: string): void {
    this.productos.porCodigo(codigo).subscribe({
      next: (p) => {
        this.lectura.set({ texto: `${p.nombre} agregado a la lista`, mal: false });
        this.elegir(p);
      },
      error: (e) => this.lectura.set({ texto: e?.status === 404 ? `Código ${codigo}: no está en tu inventario` : mensajeError(e), mal: true })
    });
  }

  cerrarEscaner(): void {
    this.escaner.set(false);
    this.lectura.set(null);
  }

  // ------------------------------------------------------------------ edición de líneas
  cambiar(i: number, campo: 'cantidad' | 'costo' | 'precio', valor: string): void {
    this.lineas.update((ls) => ls.map((l, k) => (k === i ? { ...l, [campo]: valor } : l)));
  }

  cambiarPresentacion(i: number, idPres: number): void {
    this.lineas.update((ls) =>
      ls.map((l, k) => {
        if (k !== i) return l;
        const factor = l.presentaciones.find((p) => p.id_presentacion === idPres)?.unidades ?? 1;
        const base = l.producto.precio_costo;
        // Si hay un costo conocido por unidad, se sugiere el de la presentación (ej. caja ×24)
        return { ...l, idPres, costo: base > 0 ? String(redondear(base * factor)) : l.costo };
      })
    );
  }

  quitar(i: number): void {
    this.lineas.update((ls) => ls.filter((_, k) => k !== i));
  }

  limpiar(): void {
    this.lineas.set([]);
    this.proveedor.set('');
    this.error.set('');
  }

  // ------------------------------------------------------------------ guardar
  guardar(): void {
    if (this.guardando()) return;
    const items: CompraItemEnvio[] = [];
    for (const l of this.lineas()) {
      const nombre = l.producto.nombre;
      const cant = aNumero(l.cantidad);
      if (cant === null || cant < 1 || !Number.isInteger(cant)) {
        this.error.set(`Escribe cuántos llegaron de «${nombre}» (número entero).`);
        return;
      }
      const costo = l.costo.trim() ? aNumero(l.costo) : null;
      if (l.costo.trim() && (costo === null || costo < 0)) { this.error.set(`El costo de «${nombre}» no es válido.`); return; }
      const precio = l.precio.trim() ? aNumero(l.precio) : null;
      if (l.precio.trim() && (precio === null || precio <= 0)) { this.error.set(`El precio de venta de «${nombre}» no es válido.`); return; }
      const item: CompraItemEnvio = { id_producto: l.producto.id_producto, cantidad: cant };
      if (l.idPres > 0) item.id_presentacion = l.idPres;
      if (costo !== null) item.costo = redondear(costo);
      if (precio !== null && precio !== l.producto.precio_venta) item.precio_venta = redondear(precio);
      items.push(item);
    }
    if (items.length === 0) { this.error.set('Agrega al menos un producto.'); return; }

    this.guardando.set(true);
    this.error.set('');
    this.compras.registrar({ proveedor: this.proveedor().trim() || undefined, items }).subscribe({
      next: (c) => {
        this.guardando.set(false);
        const unidades = c.items.reduce((a, x) => a + x.unidades_ingresadas, 0);
        this.toast.ok('Mercadería ingresada', `${unidades} unidades en ${c.items.length} productos · ${soles(c.total_costo)}`);
        this.limpiar();
        this.cargarHistorial();
        this.reportes.refrescarInicio();
        this.detalle.set(c);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeError(e));
      }
    });
  }

  verCompra(c: CompraResumen): void {
    this.compras.obtener(c.id_compra).subscribe({
      next: (d) => this.detalle.set(d),
      error: (e) => this.toast.error('No se pudo abrir', mensajeError(e))
    });
  }

  cuando(s: string): string {
    return cuandoRelativo(s, this.reportes.inicio()?.hoy.fecha ?? '');
  }
}
