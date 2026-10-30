import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { aNumero, cuandoRelativo, mensajeError, redondear, soles } from '../../core/format';
import { MovimientoStock, NivelStock, Presentacion, Producto, ProductoForm } from '../../core/models';
import { ProductosService } from '../../core/productos.service';
import { ReportesService } from '../../core/reportes.service';
import { ToastService } from '../../core/toast.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { EscanerComponent } from '../../shared/escaner.component';
import { IconoComponent } from '../../shared/icono.component';
import { ModalComponent } from '../../shared/modal.component';
import { StockChipComponent } from '../../shared/stock-chip.component';

type Filtro = 'todos' | 'rojo' | 'amarillo' | 'verde' | 'favoritos' | 'inactivos';
const PAGINA = 60;

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [FormsModule, AvatarComponent, EscanerComponent, IconoComponent, ModalComponent, StockChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inventario.component.html',
  styleUrl: './inventario.component.css'
})
export class InventarioComponent implements OnInit, OnDestroy {
  private api = inject(ProductosService);
  private toast = inject(ToastService);
  private reportes = inject(ReportesService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly soles = soles;
  readonly filtros: { id: Filtro; texto: string }[] = [
    { id: 'todos', texto: 'Todos' },
    { id: 'rojo', texto: 'Agotados' },
    { id: 'amarillo', texto: 'Por agotarse' },
    { id: 'verde', texto: 'Con stock' },
    { id: 'favoritos', texto: 'Favoritos' },
    { id: 'inactivos', texto: 'Desactivados' }
  ];
  readonly motivosAjuste = ['Conteo del día', 'Merma o vencido', 'Rotura', 'Consumo propio'];
  readonly unidades = ['unidad', 'kg', 'litro', 'paquete', 'bolsa', 'caja', 'docena', 'botella'];

  // lista
  readonly items = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly cargandoMas = signal(false);
  readonly hayMas = signal(false);
  readonly q = signal('');
  readonly filtro = signal<Filtro>('todos');
  readonly alertas = computed(() => {
    const s = this.reportes.inicio()?.stock;
    return s ? { rojos: s.agotados, amarillos: s.por_agotarse } : null;
  });

  // formulario
  readonly formAbierto = signal(false);
  readonly editando = signal<Producto | null>(null);
  readonly fNombre = signal('');
  readonly fPrecio = signal('');
  readonly fCosto = signal('');
  readonly fStock = signal('');
  readonly fMin = signal('5');
  readonly fUnidad = signal('unidad');
  readonly fCodigo = signal('');
  readonly fFav = signal(false);
  readonly fImagen = signal('');
  readonly errorForm = signal('');
  readonly guardando = signal(false);
  readonly presentaciones = signal<Presentacion[]>([]);
  readonly pNombre = signal('');
  readonly pUnidades = signal('');
  readonly escaner = signal(false);
  readonly confirmarDesactivar = signal(false);
  readonly archivoSeleccionado = signal<File | null>(null);
  readonly vistaPrevia = signal<string | null>(null);



  readonly margen = computed(() => {
    const p = aNumero(this.fPrecio());
    const c = aNumero(this.fCosto());
    if (p === null || c === null || p <= 0 || c <= 0) return null;
    return { ganancia: redondear(p - c), porcentaje: Math.round(((p - c) / p) * 100) };
  });

  // ajuste de stock
  readonly ajusteProd = signal<Producto | null>(null);
  readonly ajusteValor = signal('');
  readonly ajusteMotivo = signal('');
  readonly errorAjuste = signal('');

  // historial
  readonly movProd = signal<Producto | null>(null);
  readonly movs = signal<MovimientoStock[]>([]);
  readonly cargandoMovs = signal(false);

  private busq$ = new Subject<void>();
  private peticion?: Subscription;

  constructor() {
    this.busq$.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => this.cargar(true));
  }

  ngOnInit(): void {
    this.cargar(true);
    this.reportes.refrescarInicio();
    // Llega desde el mostrador con un código que no existe: ?nuevo=7750182…
    const nuevo = this.route.snapshot.queryParamMap.get('nuevo');
    if (nuevo) {
      this.nuevo(/^\d{4,}$/.test(nuevo) ? nuevo : '');
      this.router.navigate([], { queryParams: { nuevo: null }, replaceUrl: true });
    }
  }

  ngOnDestroy(): void {
    this.peticion?.unsubscribe();
  }

  // ------------------------------------------------------------------ lista
  onBuscar(v: string): void {
    this.q.set(v);
    this.busq$.next();
  }

  elegirFiltro(f: Filtro): void {
    this.filtro.set(f);
    this.cargar(true);
  }

  cargar(reiniciar: boolean): void {
    this.peticion?.unsubscribe();
    const desde = reiniciar ? 0 : this.items().length;
    if (reiniciar) this.cargando.set(true);
    else this.cargandoMas.set(true);
    const f = this.filtro();
    this.peticion = this.api
      .listar({
        q: this.q().trim() || undefined,
        nivel: f === 'rojo' || f === 'amarillo' || f === 'verde' ? (f as NivelStock) : '',
        favoritos: f === 'favoritos',
        estado: f === 'inactivos' ? 'Inactivo' : '',
        limite: PAGINA,
        desdeFila: desde
      })
      .subscribe({
        next: (l) => {
          this.items.set(reiniciar ? l : [...this.items(), ...l]);
          this.hayMas.set(l.length === PAGINA);
          this.cargando.set(false);
          this.cargandoMas.set(false);
        },
        error: (e) => {
          this.cargando.set(false);
          this.cargandoMas.set(false);
          this.toast.error('No se pudo cargar el inventario', mensajeError(e));
        }
      });
  }

  reemplazar(p: Producto): void {
    this.items.update((l) => l.map((x) => (x.id_producto === p.id_producto ? { ...x, ...p } : x)));
  }

  barra(p: Producto): number {
    const tope = Math.max(p.stock_minimo * 3, 10);
    return Math.max(4, Math.min(100, Math.round((p.stock_actual / tope) * 100)));
  }

  margenDe(p: Producto): number | null {
    return p.precio_costo > 0 && p.precio_venta > 0 ? Math.round(((p.precio_venta - p.precio_costo) / p.precio_venta) * 100) : null;
  }

  alternarFavorito(p: Producto): void {
    this.api.favorito(p.id_producto, !p.es_favorito).subscribe({
      next: (n) => {
        this.reemplazar(n);
        this.toast.ok(n.es_favorito ? 'Fijado en el mostrador' : 'Quitado de los fijados', n.nombre);
      },
      error: (e) => this.toast.error('No se pudo cambiar', mensajeError(e))
    });
  }

  reactivar(p: Producto): void {
    this.api.reactivar(p.id_producto).subscribe({
      next: () => {
        this.toast.ok('Producto reactivado', p.nombre);
        this.cargar(true);
        this.reportes.refrescarInicio();
      },
      error: (e) => this.toast.error('No se pudo reactivar', mensajeError(e))
    });
  }

  // ------------------------------------------------------------------ formulario
  nuevo(codigo = ''): void {
    this.editando.set(null);
    this.fNombre.set('');
    this.fPrecio.set('');
    this.fCosto.set('');
    this.fStock.set('');
    this.fMin.set('5');
    this.fUnidad.set('unidad');
    this.fCodigo.set(codigo);
    this.fFav.set(false);
    this.fImagen.set('');
    this.archivoSeleccionado.set(null); // <--- Resetear archivo
    this.vistaPrevia.set(null);        // <--- Resetear vista previa
    this.presentaciones.set([]);
    this.errorForm.set('');
    this.confirmarDesactivar.set(false);
    this.formAbierto.set(true);
  }

  editar(p: Producto): void {
    this.editando.set(p);
    this.fNombre.set(p.nombre);
    this.fPrecio.set(String(p.precio_venta));
    this.fCosto.set(p.precio_costo > 0 ? String(p.precio_costo) : '');
    this.fStock.set(String(p.stock_actual));
    this.fMin.set(String(p.stock_minimo));
    this.fUnidad.set(p.unidad_medida);
    this.fCodigo.set(p.codigo_barras ?? '');
    this.fFav.set(p.es_favorito);
    this.fImagen.set(p.imagen_url ?? '');
    this.vistaPrevia.set(p.imagen_url ?? null);     // <--- Mostrar vista previa si ya tiene foto
    this.archivoSeleccionado.set(null);             // <--- Archivo nuevo en blanco
    this.presentaciones.set(p.presentaciones ?? []);
    this.errorForm.set('');
    this.confirmarDesactivar.set(false);
    this.formAbierto.set(true);
    this.api.obtener(p.id_producto).subscribe({ next: (d) => this.presentaciones.set(d.presentaciones ?? []), error: () => undefined });
  }

  cerrarForm(): void {
    this.formAbierto.set(false);
    this.escaner.set(false);
  }

  alLeerCodigo(c: string): void {
    this.fCodigo.set(c);
    this.escaner.set(false);
    navigator.vibrate?.(40);
  }

  guardar(): void {
    const nombre = this.fNombre().trim();
    const precio = aNumero(this.fPrecio());
    const costo = this.fCosto().trim() ? aNumero(this.fCosto()) : 0;
    const min = this.fMin().trim() ? aNumero(this.fMin()) : 5;
    const ed = this.editando();
    const stock = this.fStock().trim() ? aNumero(this.fStock()) : 0;
    if (nombre.length < 2) return this.errorForm.set('Escribe el nombre del producto.');
    if (precio === null || precio <= 0) return this.errorForm.set('Escribe el precio de venta.');
    if (costo === null || costo < 0) return this.errorForm.set('El costo no es válido.');
    if (min === null || min < 0 || !Number.isInteger(min)) return this.errorForm.set('El stock mínimo debe ser un número entero.');
    if (!ed && (stock === null || stock < 0 || !Number.isInteger(stock))) return this.errorForm.set('El stock inicial debe ser un número entero.');

    const base: Omit<ProductoForm, 'stock_actual'> = {
      nombre,
      precio_venta: redondear(precio),
      precio_costo: redondear(costo),
      stock_minimo: min,
      unidad_medida: this.fUnidad().trim() || 'unidad',
      codigo_barras: this.fCodigo().trim() || null,
      es_favorito: this.fFav(),
      imagen_url: this.fImagen().trim() || null
    };

    const archivo = this.archivoSeleccionado(); // Capturamos el archivo de imagen de la PC si existe
    this.guardando.set(true);
    this.errorForm.set('');

    // Enviamos el archivo junto con los datos base al servicio
    const op$ = ed 
      ? this.api.actualizar(ed.id_producto, base, archivo) 
      : this.api.crear({ ...base, stock_actual: stock ?? 0 }, archivo);

    op$.subscribe({
      next: (p) => {
        this.guardando.set(false);
        this.toast.ok(ed ? 'Cambios guardados' : 'Producto creado', p.nombre);
        this.cerrarForm();
        this.cargar(true);
        this.reportes.refrescarInicio();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorForm.set(mensajeError(e));
      }
    });
  }

  desactivar(): void {
    const p = this.editando();
    if (!p) return;
    if (!this.confirmarDesactivar()) {
      this.confirmarDesactivar.set(true);
      return;
    }
    this.api.desactivar(p.id_producto).subscribe({
      next: () => {
        this.toast.ok('Producto desactivado', 'Ya no aparece al vender. Sus ventas pasadas se conservan.');
        this.cerrarForm();
        this.cargar(true);
        this.reportes.refrescarInicio();
      },
      error: (e) => this.errorForm.set(mensajeError(e))
    });
  }

  agregarPresentacion(): void {
    const p = this.editando();
    const u = aNumero(this.pUnidades());
    const n = this.pNombre().trim();
    if (!p) return;
    if (!n || u === null || !Number.isInteger(u) || u < 2) return this.errorForm.set('Escribe el nombre (Caja, Docena…) y cuántas unidades trae (2 o más).');
    this.errorForm.set('');
    this.api.agregarPresentacion(p.id_producto, n, u).subscribe({
      next: (l) => {
        this.presentaciones.set(l);
        this.pNombre.set('');
        this.pUnidades.set('');
      },
      error: (e) => this.errorForm.set(mensajeError(e))
    });
  }

  quitarPresentacion(pr: Presentacion): void {
    const p = this.editando();
    if (!p) return;
    this.api.quitarPresentacion(p.id_producto, pr.id_presentacion).subscribe({
      next: () => this.presentaciones.update((l) => l.filter((x) => x.id_presentacion !== pr.id_presentacion)),
      error: (e) => this.errorForm.set(mensajeError(e))
    });
  }

  // ------------------------------------------------------------------ ajuste de stock
  abrirAjuste(p: Producto): void {
    this.ajusteProd.set(p);
    this.ajusteValor.set(String(p.stock_actual));
    this.ajusteMotivo.set('');
    this.errorAjuste.set('');
  }

  pasoAjuste(d: number): void {
    const n = aNumero(this.ajusteValor()) ?? 0;
    this.ajusteValor.set(String(Math.max(0, Math.floor(n) + d)));
  }

  guardarAjuste(): void {
    const p = this.ajusteProd();
    const n = aNumero(this.ajusteValor());
    if (!p) return;
    if (n === null || n < 0 || !Number.isInteger(n)) return this.errorAjuste.set('Escribe cuántas unidades hay realmente (número entero).');
    this.guardando.set(true);
    this.api.ajustarStock(p.id_producto, n, this.ajusteMotivo().trim() || undefined).subscribe({
      next: (n2) => {
        this.guardando.set(false);
        this.ajusteProd.set(null);
        this.reemplazar(n2);
        this.toast.ok('Stock actualizado', `${n2.nombre}: ${n2.stock_actual} ${n2.unidad_medida === 'unidad' ? 'u.' : n2.unidad_medida}`);
        this.reportes.refrescarInicio();
      },
      error: (e) => {
        this.guardando.set(false);
        this.errorAjuste.set(mensajeError(e));
      }
    });
  }

  // ------------------------------------------------------------------ historial
  verMovimientos(p: Producto): void {
    this.movProd.set(p);
    this.movs.set([]);
    this.cargandoMovs.set(true);
    this.api.movimientos(p.id_producto, 40).subscribe({
      next: (l) => {
        this.movs.set(l);
        this.cargandoMovs.set(false);
      },
      error: (e) => {
        this.cargandoMovs.set(false);
        this.toast.error('No se pudo cargar el historial', mensajeError(e));
      }
    });
  }

onSeleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.archivoSeleccionado.set(file);
      
      const reader = new FileReader();
      reader.onload = () => this.vistaPrevia.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  quitarImagenSeleccionada(): void {
    this.archivoSeleccionado.set(null);
    this.vistaPrevia.set(null);
    this.fImagen.set('');
  }



  etiquetaMov(t: MovimientoStock['tipo']): string {
    return { INICIAL: 'Stock inicial', VENTA: 'Venta', ANULACION: 'Venta anulada', COMPRA: 'Mercadería', AJUSTE: 'Ajuste' }[t];
  }

  cuando(s: string): string {
    return cuandoRelativo(s, this.reportes.inicio()?.hoy.fecha ?? '');
  }
}
