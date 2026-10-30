import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { cuandoRelativo, fechaCorta, fechaLarga, hora, mensajeError, soles } from '../../core/format';
import { CierreHistorial, MetodoPago, ReporteDia, VentaDetalle, VentaResumen } from '../../core/models';
import { ReportesService } from '../../core/reportes.service';
import { ToastService } from '../../core/toast.service';
import { VentasService } from '../../core/ventas.service';
import { IconoComponent } from '../../shared/icono.component';
import { ModalComponent } from '../../shared/modal.component';

type Pestana = 'resumen' | 'ventas' | 'cierres';

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [FormsModule, IconoComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './caja.component.html',
  styleUrl: './caja.component.css'
})
export class CajaComponent implements OnInit {
  private reportes = inject(ReportesService);
  private ventasApi = inject(VentasService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);

  readonly soles = soles;
  readonly hora = hora;
  readonly fechaCorta = fechaCorta;
  readonly fechaLarga = fechaLarga;

  readonly pestana = signal<Pestana>('resumen');
  readonly fecha = signal<string>(''); // vacío = hoy
  readonly dia = signal<ReporteDia | null>(null);
  readonly cargando = signal(true);
  readonly cerrando = signal(false);
  readonly confirmarCierre = signal(false);

  readonly ventas = signal<VentaResumen[] | null>(null);
  readonly filtroMetodo = signal<MetodoPago | ''>('');
  readonly detalle = signal<VentaDetalle | null>(null);
  readonly anulando = signal(false);
  readonly motivo = signal('');

  readonly cierres = signal<CierreHistorial[] | null>(null);

  readonly hoyIso = computed(() => this.reportes.inicio()?.hoy.fecha ?? '');
  readonly esHoy = computed(() => !this.fecha() || this.fecha() === this.reportes.inicio()?.hoy.fecha);
  readonly ventasFiltradas = computed(() => {
    const f = this.filtroMetodo();
    return (this.ventas() ?? []).filter((v) => !f || v.metodo_pago === f);
  });
  readonly maxCierre = computed(() => Math.max(1, ...(this.cierres() ?? []).map((c) => c.total_vendido)));
  readonly grafico = computed(() => [...(this.cierres() ?? [])].slice(0, 10).reverse());
  readonly maxTop = computed(() => Math.max(1, ...(this.dia()?.top_productos ?? []).map((p) => p.ingresos)));

  ngOnInit(): void {
    this.cargarDia();
  }

  cargarDia(): void {
    this.cargando.set(true);
    this.reportes.dia(this.fecha() || undefined).subscribe({
      next: (d) => {
        this.dia.set(d);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.toast.error('No se pudo cargar la caja', mensajeError(e));
      }
    });
  }

  cambiarFecha(f: string): void {
    this.fecha.set(f);
    this.confirmarCierre.set(false);
    this.cargarDia();
    if (this.pestana() === 'ventas') this.cargarVentas();
  }

  irAHoy(): void {
    this.cambiarFecha('');
  }

  elegirPestana(p: Pestana): void {
    this.pestana.set(p);
    if (p === 'ventas') this.cargarVentas();
    if (p === 'cierres' && this.cierres() === null) this.cargarCierres();
  }

  // ------------------------------------------------------------------ cierre
  cerrarDia(): void {
    const d = this.dia();
    if (!d || this.cerrando()) return;
    // Si el día ya estaba cerrado, volver a cerrar recalcula: se pide confirmar una vez.
    if (d.cerrado && !this.confirmarCierre()) {
      this.confirmarCierre.set(true);
      return;
    }
    this.cerrando.set(true);
    this.reportes.cerrar(d.fecha).subscribe({
      next: (r) => {
        this.dia.set(r);
        this.cerrando.set(false);
        this.confirmarCierre.set(false);
        this.cierres.set(null);
        this.toast.ok('Día cerrado', 'El reporte quedó guardado.');
      },
      error: (e) => {
        this.cerrando.set(false);
        this.toast.error('No se pudo cerrar el día', mensajeError(e));
      }
    });
  }

  /** Texto listo para mandar por WhatsApp (a ella misma, a su familia o a su contador). */
  textoResumen(d: ReporteDia): string {
    const l = [
      `Cierre de caja · ${this.auth.nombre()}`,
      fechaLarga(d.fecha),
      '',
      `Recaudación del día: ${soles(d.recaudacion)}`,
      `  Efectivo en gaveta: ${soles(d.efectivo_en_gaveta)}`,
       // o divídelo en Yape y Plin según prefieras mostrarlo:
      ` Yape: ${soles(d.ventas.yape)} | Plin: ${soles(d.ventas.plin)}`
    ];
    if (d.ventas.tarjeta > 0) l.push(`  Tarjeta: ${soles(d.ventas.tarjeta)}`);
    if (d.cobranza_deudas > 0) l.push(`  (incluye ${soles(d.cobranza_deudas)} de deudas cobradas)`);
    l.push('');
    l.push(`Total vendido: ${soles(d.total_vendido)} (${d.num_ventas} ventas)`);
    l.push(`Fiado generado hoy: ${soles(d.fiado_generado)}`);
    l.push(`Cobranza de deudas anteriores: ${soles(d.cobranza_deudas)}`);
    l.push(`Deuda total pendiente de clientes: ${soles(d.deuda_total_pendiente.total)}`);
    l.push('');
    l.push(`Ganancia estimada: ${soles(d.ganancia_estimada)}`);
    if (d.producto_estrella) l.push(`Lo más vendido: ${d.producto_estrella.nombre}`);
    return l.join('\n');
  }

  enlaceWhatsApp(d: ReporteDia): string {
    return `https://wa.me/?text=${encodeURIComponent(this.textoResumen(d))}`;
  }

  imprimir(): void {
    window.print();
  }

  // ------------------------------------------------------------------ ventas del día
  cargarVentas(): void {
    this.ventas.set(null);
    this.ventasApi.listar({ fecha: this.fecha() || this.dia()?.fecha }).subscribe({
      next: (l) => this.ventas.set(l),
      error: (e) => {
        this.ventas.set([]);
        this.toast.error('No se pudieron cargar las ventas', mensajeError(e));
      }
    });
  }

  abrirVenta(v: VentaResumen): void {
    this.motivo.set('');
    this.ventasApi.obtener(v.id_venta).subscribe({
      next: (d) => this.detalle.set(d),
      error: (e) => this.toast.error('No se pudo abrir la venta', mensajeError(e))
    });
  }

  anular(): void {
    const d = this.detalle();
    if (!d || this.anulando()) return;
    this.anulando.set(true);
    this.ventasApi.anular(d.id_venta, this.motivo().trim() || undefined).subscribe({
      next: () => {
        this.anulando.set(false);
        this.detalle.set(null);
        this.toast.ok('Venta anulada', 'El stock y la deuda volvieron a su lugar.');
        this.cargarVentas();
        this.cargarDia();
        this.reportes.refrescarInicio();
      },
      error: (e) => {
        this.anulando.set(false);
        this.toast.error('No se pudo anular', mensajeError(e));
      }
    });
  }

  // ------------------------------------------------------------------ cierres anteriores
  cargarCierres(): void {
    this.reportes.historial(30).subscribe({
      next: (l) => this.cierres.set(l),
      error: (e) => {
        this.cierres.set([]);
        this.toast.error('No se pudo cargar el historial', mensajeError(e));
      }
    });
  }

  verCierre(c: CierreHistorial): void {
    this.fecha.set(c.fecha);
    this.pestana.set('resumen');
    this.cargarDia();
  }

  cuando(s: string): string {
    return cuandoRelativo(s, this.reportes.inicio()?.hoy.fecha ?? '');
  }

  ancho(valor: number, max: number): number {
    return Math.max(3, Math.round((valor / max) * 100));
  }
}
