import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { ClientesService } from '../../core/clientes.service';
import { aNumero, mensajeError, redondear, sinTildes, soles } from '../../core/format';
import { Cliente, MetodoPago, Producto } from '../../core/models';
import { ProductosService } from '../../core/productos.service';
import { ReportesService } from '../../core/reportes.service';
import { TicketService } from '../../core/ticket.service';
import { ToastService } from '../../core/toast.service';
import { VentasService } from '../../core/ventas.service';
import { AvatarComponent } from '../../shared/avatar.component';
import { EscanerComponent } from '../../shared/escaner.component';
import { IconoComponent } from '../../shared/icono.component';
import { ModalComponent } from '../../shared/modal.component';
import { StockChipComponent } from '../../shared/stock-chip.component';

interface Confirmacion {
  idVenta: number;
  total: number;
  metodo: MetodoPago;
  vuelto: number | null;
  vecino: string | null;
}

@Component({
  selector: 'app-mostrador',
  standalone: true,
  imports: [FormsModule, RouterLink, AvatarComponent, EscanerComponent, IconoComponent, ModalComponent, StockChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mostrador.component.html',
  styleUrl: './mostrador.component.css'
})
export class MostradorComponent implements OnInit {
  private productos = inject(ProductosService);
  private ventas = inject(VentasService);
  private reportes = inject(ReportesService);
  readonly clientes = inject(ClientesService);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly ticket = inject(TicketService);

  readonly inicio = this.reportes.inicio;
  readonly soles = soles;

  // --- catálogo ---
  readonly rapidos = signal<Producto[]>([]);
  readonly cargando = signal(true);
  readonly q = signal('');
  readonly resultados = signal<Producto[] | null>(null);
  readonly buscando = signal(false);
  readonly rebote = signal<number | null>(null);
  /** Tienda nueva: aún no hay ventas ni favoritos, se muestran los productos disponibles. */
  readonly esRespaldo = signal(false);

  // --- cámara y voz ---
  readonly escaner = signal(false);
  readonly lecturaMsg = signal<{ texto: string; mal: boolean } | null>(null);
  readonly escuchando = signal(false);
  readonly hayVoz = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // --- ticket y cobro ---
  readonly ticketAbierto = signal(false);
  readonly enviando = signal(false);
  readonly errorVenta = signal('');
  readonly pagaCon = signal<number | null>(null);
  readonly confirmacion = signal<Confirmacion | null>(null);
  readonly confirmarVaciar = signal(false);

  readonly vuelto = computed(() => {
    const p = this.pagaCon();
    return p === null ? null : redondear(p - this.ticket.total());
  });
  readonly billetes = computed(() => {
    const t = this.ticket.total();
    const redondeo = Math.ceil(t / 10) * 10;
    const lista = [redondeo, 20, 50, 100, 200].filter((b) => b >= t && b !== t);
    return [...new Set(lista)].sort((a, b) => a - b).slice(0, 4);
  });

  // --- fiado express ---
  readonly fiarAbierto = signal(false);
  readonly fq = signal('');
  readonly elegido = signal<Cliente | null>(null);
  readonly vecinosFiltrados = computed(() => {
    const t = sinTildes(this.fq().trim());
    const todos = this.clientes.vecinos();
    const lista = t ? todos.filter((c) => sinTildes(c.nombre).includes(t)) : todos;
    // primero los que ya deben (los de siempre), luego alfabético
    return [...lista]
      .sort((a, b) => (b.saldo_deudor > 0 ? 1 : 0) - (a.saldo_deudor > 0 ? 1 : 0) || a.nombre.localeCompare(b.nombre, 'es'))
      .slice(0, 40);
  });
  readonly puedeCrearVecino = computed(() => {
    const t = this.fq().trim();
    if (t.length < 2) return false;
    const n = sinTildes(t);
    return !this.clientes.vecinos().some((c) => sinTildes(c.nombre) === n);
  });
  readonly proyeccion = computed(() => {
    const c = this.elegido();
    if (!c) return null;
    const nueva = redondear(c.saldo_deudor + this.ticket.total());
    const pasa = c.limite_credito > 0 && nueva > c.limite_credito;
    return { nueva, pasa, limite: c.limite_credito };
  });

  private busqueda$ = new Subject<string>();
  private bufer = '';
  private buferMs = 0;

  constructor() {
    this.busqueda$
      .pipe(
        debounceTime(150),
        map((v) => v.trim()),
        distinctUntilChanged(),
        tap((v) => {
          if (v.length < 2) {
            this.resultados.set(null);
            this.buscando.set(false);
          }
        }),
        filter((v) => v.length >= 2),
        tap(() => this.buscando.set(true)),
        switchMap((v) => this.productos.listar({ q: v, limite: 30 }).pipe(catchError(() => of([] as Producto[])))),
        takeUntilDestroyed()
      )
      .subscribe((lista) => {
        this.resultados.set(lista);
        this.buscando.set(false);
      });
  }

  ngOnInit(): void {
    this.cargarRapidos();
    if (!this.clientes.cargados()) this.clientes.cargar().subscribe({ error: () => undefined });
  }

  // ------------------------------------------------------------------ catálogo
  cargarRapidos(): void {
    this.productos.rapidos(15).subscribe({
      next: (l) => {
        if (l.length > 0) {
          this.esRespaldo.set(false);
          this.rapidos.set(l);
          this.cargando.set(false);
          return;
        }
        this.productos.listar({ estado: 'Disponible', limite: 15 }).subscribe({
          next: (m) => {
            this.esRespaldo.set(true);
            this.rapidos.set(m.filter((p) => p.stock_actual > 0));
            this.cargando.set(false);
          },
          error: () => {
            this.rapidos.set([]);
            this.cargando.set(false);
          }
        });
      },
      error: (e) => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar los productos', mensajeError(e));
      }
    });
  }

  onBuscar(valor: string): void {
    this.q.set(valor);
    this.busqueda$.next(valor);
  }

  limpiarBusqueda(): void {
    this.onBuscar('');
  }

  alEnter(): void {
    const t = this.q().trim();
    if (!t) return;
    // Pistola o código tipeado: solo dígitos, largo de código de barras
    if (/^\d{6,}$/.test(t)) {
      this.buscarCodigo(t);
      this.limpiarBusqueda();
      return;
    }
    const primero = this.resultados()?.find((p) => p.stock_actual > 0);
    if (primero) {
      this.agregar(primero);
      this.limpiarBusqueda();
    }
  }

// --- selector de presentaciones ---
  readonly productoConPresentacion = signal<Producto | null>(null);

  // Agregar directamente al ticket sin modales molestos
  agregar(p: Producto): void {
    const r = this.ticket.agregar(p);
    if (!r.ok) {
      this.toast.aviso(r.mensaje ?? 'No se pudo agregar');
      return;
    }
    navigator.vibrate?.(12);
    this.confirmacion.set(null);
    this.errorVenta.set('');
    this.rebote.set(p.id_producto);
    setTimeout(() => this.rebote.set(null), 260);
  }

  // Cambiar presentación desde el ticket (ej. pasar de unidad a caja)
 cambiarPresentacionLinea(idProducto: number, presentacionId: string): void {
    const linea = this.ticket.lineas().find(l => l.id_producto === idProducto);
    if (!linea) return;

    if (presentacionId === 'unidad') {
      const msg = this.ticket.fijarCantidad(idProducto, 1);
      if (msg) this.toast.aviso(msg);
      return;
    }

    const presSeleccionada = linea.presentaciones?.find(p => String(p.id_presentacion) === presentacionId);
    if (presSeleccionada) {
      // Capturamos el mensaje que devuelve el servicio si el stock es menor a la caja
      const msg = this.ticket.fijarCantidad(idProducto, presSeleccionada.unidades);
      if (msg) {
        this.toast.aviso(msg); // <--- ¡Esto mostrará la alerta avisando que se ajustó al stock disponible!
      }
    }
  }

  buscarCodigo(codigo: string): void {
    this.productos.porCodigo(codigo).subscribe({
      next: (p) => {
        const r = this.ticket.agregar(p);
        if (r.ok) {
          this.confirmacion.set(null);
          this.lecturaMsg.set({ texto: `${p.nombre} · ${soles(p.precio_venta)}`, mal: false });
        } else {
          this.lecturaMsg.set({ texto: r.mensaje ?? 'No se pudo agregar', mal: true });
        }
      },
      error: (e) => {
        if (e?.status === 404) {
          this.lecturaMsg.set({ texto: `Código ${codigo}: no está en tu inventario`, mal: true });
          if (!this.escaner()) {
            this.toast.mostrar({
              tipo: 'aviso',
              titulo: 'Ese código no está en tu inventario',
              texto: codigo,
              accion: { texto: 'Crear producto', fn: () => this.router.navigate(['/inventario'], { queryParams: { nuevo: codigo } }) }
            });
          }
        } else {
          this.lecturaMsg.set({ texto: mensajeError(e), mal: true });
        }
      }
    });
  }

  alLeerCamara(codigo: string): void {
    this.buscarCodigo(codigo);
  }

  cerrarEscaner(): void {
    this.escaner.set(false);
    this.lecturaMsg.set(null);
  }

  /** Pistola lectora USB: escribe muy rápido y termina con Enter, aunque no haya un campo enfocado. */
  @HostListener('window:keydown', ['$event'])
  alTeclear(e: KeyboardEvent): void {
    if (this.fiarAbierto() || this.escaner() || e.ctrlKey || e.metaKey || e.altKey) return;
    const t = e.target as HTMLElement | null;
    if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
    const ahora = Date.now();
    if (ahora - this.buferMs > 120) this.bufer = '';
    this.buferMs = ahora;
    if (e.key === 'Enter') {
      if (this.bufer.length >= 6) this.buscarCodigo(this.bufer);
      this.bufer = '';
      return;
    }
    if (/^[0-9A-Za-z-]$/.test(e.key)) this.bufer += e.key;
  }

  escuchar(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || this.escuchando()) return;
    const r = new SR();
    r.lang = 'es-PE';
    r.interimResults = false;
    r.maxAlternatives = 1;
    this.escuchando.set(true);
    r.onresult = (ev: any) => {
      const texto = String(ev.results?.[0]?.[0]?.transcript ?? '').replace(/[.,;!?]+$/, '');
      if (texto) this.onBuscar(texto);
    };
    r.onerror = () => this.escuchando.set(false);
    r.onend = () => this.escuchando.set(false);
    try {
      r.start();
    } catch {
      this.escuchando.set(false);
    }
  }

  // ------------------------------------------------------------------ ticket
  cambiarCantidad(id: number, delta: number): void {
    const msg = this.ticket.cambiar(id, delta);
    if (msg) this.toast.aviso(msg);
  }

  escribirCantidad(id: number, valor: string): void {
    const n = aNumero(valor);
    const msg = this.ticket.fijarCantidad(id, n ?? 0);
    if (msg) this.toast.aviso(msg);
  }

  vaciar(): void {
    if (!this.confirmarVaciar()) {
      this.confirmarVaciar.set(true);
      setTimeout(() => this.confirmarVaciar.set(false), 3000);
      return;
    }
    this.ticket.vaciar();
    this.pagaCon.set(null);
    this.confirmarVaciar.set(false);
    this.ticketAbierto.set(false);
  }

  elegirBillete(valor: number | 'exacto'): void {
    this.pagaCon.set(valor === 'exacto' ? this.ticket.total() : valor);
  }

  cerrarConfirmacion(): void {
    this.confirmacion.set(null);
    this.ticketAbierto.set(false);
  }

  // ------------------------------------------------------------------ cobro
  cobrar(metodo: MetodoPago, idCliente?: number, vecino: string | null = null): void {
    if (this.enviando() || this.ticket.vacio()) return;
    if (metodo === 'Efectivo' && this.vuelto() !== null && (this.vuelto() as number) < 0) {
      this.toast.aviso('Falta dinero', `El cliente paga con ${soles(this.pagaCon())} y el total es ${soles(this.ticket.total())}.`);
      return;
    }
    const pago = this.pagaCon();
    this.enviando.set(true);
    this.errorVenta.set('');
    this.ventas.registrar(this.ticket.armarVenta(metodo, idCliente)).subscribe({
      next: (v) => {
        const vuelto = metodo === 'Efectivo' && pago !== null ? redondear(pago - v.monto_total) : null;
        this.ticket.vaciar();
        this.pagaCon.set(null);
        this.enviando.set(false);
        this.fiarAbierto.set(false);
        this.elegido.set(null);
        this.fq.set('');
        this.confirmacion.set({ idVenta: v.id_venta, total: v.monto_total, metodo, vuelto, vecino: v.cliente?.nombre ?? vecino });
        if (v.cliente) this.clientes.fijarSaldo(v.cliente.id_cliente, v.cliente.saldo_deudor);
        this.cargarRapidos();
        this.reportes.refrescarInicio();
        navigator.vibrate?.([30, 40, 30]);
      },
      error: (e) => {
        this.enviando.set(false);
        const msg = mensajeError(e);
        this.errorVenta.set(msg);
        this.toast.error('No se guardó la venta', msg);
        if (e?.status === 409) this.cargarRapidos();
      }
    });
  }

  deshacer(): void {
    const c = this.confirmacion();
    if (!c) return;
    this.ventas.anular(c.idVenta, 'Deshecha desde el mostrador').subscribe({
      next: () => {
        this.confirmacion.set(null);
        this.toast.ok('Venta deshecha', 'El stock volvió a su lugar.');
        this.cargarRapidos();
        this.reportes.refrescarInicio();
        if (c.metodo === 'Fiado') this.clientes.cargar().subscribe({ error: () => undefined });
      },
      error: (e) => this.toast.error('No se pudo deshacer', mensajeError(e))
    });
  }

  // ------------------------------------------------------------------ fiado express
  abrirFiar(): void {
    if (this.ticket.vacio()) return;
    this.errorVenta.set('');
    this.fq.set('');
    this.elegido.set(null);
    this.fiarAbierto.set(true);
  }

  cerrarFiar(): void {
    this.fiarAbierto.set(false);
  }

  guardarFiado(): void {
    const c = this.elegido();
    if (!c || this.proyeccion()?.pasa) return;
    this.cobrar('Fiado', c.id_cliente, c.nombre);
  }

  /** Anota un vecino nuevo solo con el nombre y le fía de una vez. */
  fiarANuevo(): void {
    const nombre = this.fq().trim();
    if (nombre.length < 2 || this.enviando()) return;
    this.enviando.set(true);
    this.clientes.crear({ nombre }).subscribe({
      next: (c) => {
        this.enviando.set(false);
        this.elegido.set(c);
        this.cobrar('Fiado', c.id_cliente, c.nombre);
      },
      error: (e) => {
        this.enviando.set(false);
        this.toast.error('No se pudo anotar al vecino', mensajeError(e));
      }
    });
  }
}
