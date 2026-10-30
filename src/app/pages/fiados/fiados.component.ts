import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ClientesService } from '../../core/clientes.service';
import { aNumero, cuandoRelativo, enlaceWhatsApp, fechaCorta, hora, mensajeError, redondear, sinTildes, soles } from '../../core/format';
import { AuthService } from '../../core/auth.service';
import { Cliente, ClienteDetalle, MetodoCobro } from '../../core/models';
import { ReportesService } from '../../core/reportes.service';
import { ToastService } from '../../core/toast.service';
import { IconoComponent } from '../../shared/icono.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-fiados',
  standalone: true,
  imports: [FormsModule, IconoComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fiados.component.html',
  styleUrl: './fiados.component.css'
})
export class FiadosComponent implements OnInit {
  private api = inject(ClientesService);
  private toast = inject(ToastService);
  private reportes = inject(ReportesService);
  private auth = inject(AuthService);

  readonly soles = soles;
  readonly hora = hora;
  readonly fechaCorta = fechaCorta;

  readonly cargando = computed(() => !this.api.cargados());
  readonly q = signal('');
  readonly soloDeuda = signal(false);
  readonly seleccion = signal<ClienteDetalle | null>(null);
  readonly cargandoFicha = signal(false);

  readonly lista = computed(() => {
    const t = sinTildes(this.q().trim());
    let l = this.api.vecinos();
    if (this.soloDeuda()) l = l.filter((c) => c.saldo_deudor > 0);
    if (t) l = l.filter((c) => sinTildes(c.nombre).includes(t));
    return [...l].sort((a, b) => b.saldo_deudor - a.saldo_deudor || a.nombre.localeCompare(b.nombre, 'es'));
  });
  readonly totalDeuda = computed(() => redondear(this.api.vecinos().reduce((a, c) => a + Math.max(0, c.saldo_deudor), 0)));
  readonly conDeuda = computed(() => this.api.vecinos().filter((c) => c.saldo_deudor > 0).length);

  // cobro
  readonly cobroAbierto = signal(false);
  readonly monto = signal('');
  readonly metodo = signal<MetodoCobro>('Efectivo');
  readonly nota = signal('');
  readonly enviando = signal(false);
  readonly errorCobro = signal('');
  readonly metodos: MetodoCobro[] = ['Efectivo', 'Yape', 'Plin', 'Tarjeta'];

  // alta / edición
  readonly formAbierto = signal(false);
  readonly editando = signal<Cliente | null>(null);
  readonly fNombre = signal('');
  readonly fTelefono = signal('');
  readonly fLimite = signal('');
  readonly errorForm = signal('');

  ngOnInit(): void {
    this.refrescar();
  }

  refrescar(): void {
    this.api.cargar().subscribe({ error: (e) => this.toast.error('No se pudo cargar el cuaderno', mensajeError(e)) });
  }

  abrir(c: Cliente): void {
    this.cargandoFicha.set(true);
    this.seleccion.set({ ...c, movimientos: [] });
    this.api.detalle(c.id_cliente).subscribe({
      next: (d) => {
        this.seleccion.set(d);
        this.cargandoFicha.set(false);
      },
      error: (e) => {
        this.cargandoFicha.set(false);
        this.toast.error('No se pudo abrir la ficha', mensajeError(e));
      }
    });
  }

  cerrarFicha(): void {
    this.seleccion.set(null);
  }

  whatsapp(c: Cliente): string | null {
    const msg = `Hola ${c.nombre}, te escribo del bazar ${this.auth.nombre()}. Te recuerdo tu saldo pendiente de ${soles(c.saldo_deudor)}. ¡Gracias por tu preferencia!`;
    return enlaceWhatsApp(c.telefono, msg);
  }

  // ---------------------------------------------------------------- cobrar
  abrirCobro(): void {
    const c = this.seleccion();
    if (!c || c.saldo_deudor <= 0) return;
    this.monto.set(c.saldo_deudor.toFixed(2));
    this.metodo.set('Efectivo');
    this.nota.set('');
    this.errorCobro.set('');
    this.cobroAbierto.set(true);
  }

  ponerMonto(n: number): void {
    this.monto.set(n.toFixed(2));
  }

  cobrar(): void {
    const c = this.seleccion();
    const m = aNumero(this.monto());
    if (!c || this.enviando()) return;
    if (m === null || m <= 0) { this.errorCobro.set('Escribe cuánto está pagando.'); return; }
    if (m > c.saldo_deudor + 0.001) { this.errorCobro.set(`Solo debe ${soles(c.saldo_deudor)}.`); return; }
    this.enviando.set(true);
    this.errorCobro.set('');
    this.api.cobrar(c.id_cliente, redondear(m), this.metodo(), this.nota().trim() || undefined).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.cobroAbierto.set(false);
        this.toast.ok(`Cobraste ${soles(r.monto_pagado)}`, r.saldo_deudor > 0 ? `${r.nombre} aún debe ${soles(r.saldo_deudor)}.` : `${r.nombre} quedó al día.`);
        this.abrir({ ...c, saldo_deudor: r.saldo_deudor });
        this.reportes.refrescarInicio();
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorCobro.set(mensajeError(e));
      }
    });
  }

  // ---------------------------------------------------------------- alta / edición
  nuevo(): void {
    this.editando.set(null);
    this.fNombre.set('');
    this.fTelefono.set('');
    this.fLimite.set('');
    this.errorForm.set('');
    this.formAbierto.set(true);
  }

  editar(c: Cliente): void {
    this.editando.set(c);
    this.fNombre.set(c.nombre);
    this.fTelefono.set(c.telefono ?? '');
    this.fLimite.set(c.limite_credito > 0 ? String(c.limite_credito) : '');
    this.errorForm.set('');
    this.formAbierto.set(true);
  }

  guardarForm(): void {
    const nombre = this.fNombre().trim();
    if (nombre.length < 2) { this.errorForm.set('Escribe el nombre del vecino.'); return; }
    const lim = this.fLimite().trim() ? aNumero(this.fLimite()) : 0;
    if (lim === null || lim < 0) { this.errorForm.set('El límite debe ser un monto, o déjalo vacío para no poner límite.'); return; }
    const datos = { nombre, telefono: this.fTelefono().trim() || null, limite_credito: lim };
    this.enviando.set(true);
    const ed = this.editando();
    const op$ = ed ? this.api.actualizar(ed.id_cliente, datos) : this.api.crear(datos);
    op$.subscribe({
      next: (c) => {
        this.enviando.set(false);
        this.formAbierto.set(false);
        this.toast.ok(ed ? 'Datos actualizados' : `${c.nombre} anotado`);
        if (ed) this.abrir(c);
      },
      error: (e) => {
        this.enviando.set(false);
        this.errorForm.set(mensajeError(e));
      }
    });
  }

  cuando(s: string): string {
    return cuandoRelativo(s, this.reportes.inicio()?.hoy.fecha ?? '');
  }
}
