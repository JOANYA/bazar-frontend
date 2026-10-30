import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/admin.service';
import { AuthService } from '../../core/auth.service';
import { fechaCorta, mensajeError } from '../../core/format';
import { Tienda } from '../../core/models';
import { ToastService } from '../../core/toast.service';
import { IconoComponent } from '../../shared/icono.component';
import { LogoComponent } from '../../shared/logo.component';
import { ModalComponent } from '../../shared/modal.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, IconoComponent, LogoComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="tope">
      <app-logo [tamano]="44" />
      <div class="marca"><strong>Bazar Vecino</strong><span>Panel del administrador</span></div>
      <span class="quien">{{ auth.nombre() }}</span>
      <button type="button" class="btn btn-suave btn-chico" (click)="auth.cerrarSesion()"><app-icono nombre="salir" [tamano]="18" /> Salir</button>
    </header>

    <div class="pagina">
      <div class="pagina-cabecera">
        <div><h1>Tiendas</h1><p>{{ activas() }} activas de {{ tiendas().length }} registradas.</p></div>
        <button type="button" class="btn btn-primario" (click)="abrirNueva()"><app-icono nombre="mas" [tamano]="22" /> Nueva tienda</button>
      </div>

      @if (cargando()) {
        <div class="esqueleto" style="height:90px;margin-bottom:10px"></div><div class="esqueleto" style="height:90px"></div>
      } @else if (tiendas().length === 0) {
        <div class="vacio tarjeta"><app-icono nombre="tienda" [tamano]="44" /><strong>Aún no hay tiendas</strong><span>Crea la primera para entregarle su usuario a la dueña del bazar.</span></div>
      } @else {
        <ul class="lista">
          @for (t of tiendas(); track t.id_usuario) {
            <li class="tienda" [class.suspendida]="t.estado !== 'ACTIVO'">
              <span class="ico"><app-icono nombre="tienda" [tamano]="28" /></span>
              <div class="datos">
                <strong>{{ t.nombre_tienda }}</strong>
                <span>Usuario <b class="num">{{ t.usuario_login }}</b> · {{ t.telefono }}@if (t.fecha_creacion) { · desde {{ fechaCorta(t.fecha_creacion) }} }</span>
              </div>
              <span class="pastilla" [class.verde]="t.estado === 'ACTIVO'" [class.rojo]="t.estado === 'SUSPENDIDO'" [class.crema]="t.estado === 'INACTIVO'">{{ t.estado === 'ACTIVO' ? 'Activa' : t.estado === 'SUSPENDIDO' ? 'Suspendida' : 'Inactiva' }}</span>
              <div class="acc">
                <button type="button" class="btn btn-suave btn-chico" (click)="abrirClave(t)"><app-icono nombre="candado" [tamano]="18" /> Contraseña</button>
                <button type="button" class="btn btn-chico" [class.btn-peligro]="t.estado === 'ACTIVO'" [class.btn-oro]="t.estado !== 'ACTIVO'" (click)="alternar(t)">
                  {{ confirmando() === t.id_usuario ? '¿Seguro?' : t.estado === 'ACTIVO' ? 'Suspender' : 'Reactivar' }}
                </button>
              </div>
            </li>
          }
        </ul>
      }
    </div>

    @if (nuevaAbierta()) {
      <app-modal titulo="Nueva tienda" [ancho]="500" (cerrar)="nuevaAbierta.set(false)">
        <div class="campo"><label for="n-nom">Nombre del bazar</label><input id="n-nom" class="input" placeholder="Bazar Doña Rosita" autocomplete="off" [ngModel]="nNombre()" (ngModelChange)="nNombre.set($event)" /></div>
        <div class="campo" style="margin-top:14px"><label for="n-tel">Celular de la dueña</label><input id="n-tel" class="input" inputmode="tel" placeholder="987654321" autocomplete="off" [ngModel]="nTelefono()" (ngModelChange)="nTelefono.set($event)" /></div>
        <div class="campo" style="margin-top:14px"><label for="n-user">Usuario de acceso <small>(letras, números, punto o guion)</small></label><input id="n-user" class="input" placeholder="bazar.rosita" autocapitalize="none" autocomplete="off" [ngModel]="nUsuario()" (ngModelChange)="nUsuario.set($event)" /></div>
        <div class="campo" style="margin-top:14px"><label for="n-pass">Contraseña inicial <small>(mínimo 6)</small></label><input id="n-pass" class="input" autocomplete="off" [ngModel]="nPassword()" (ngModelChange)="nPassword.set($event)" /></div>
        @if (error()) { <div class="error-caja" style="margin-top:12px" role="alert">{{ error() }}</div> }
        <div pie style="display:contents">
          <button type="button" class="btn btn-suave" (click)="nuevaAbierta.set(false)">Cancelar</button>
          <button type="button" class="btn btn-primario" [disabled]="guardando()" (click)="crear()">@if (guardando()) { <span class="carga"></span> } Crear tienda</button>
        </div>
      </app-modal>
    }

    @if (claveDe(); as t) {
      <app-modal [titulo]="'Nueva contraseña · ' + t.nombre_tienda" [ancho]="460" (cerrar)="claveDe.set(null)">
        <div class="campo"><label for="c-pass">Contraseña nueva <small>(mínimo 6)</small></label><input id="c-pass" class="input" autocomplete="off" [ngModel]="cPassword()" (ngModelChange)="cPassword.set($event)" (keydown.enter)="guardarClave()" /></div>
        @if (error()) { <div class="error-caja" style="margin-top:12px" role="alert">{{ error() }}</div> }
        <div pie style="display:contents">
          <button type="button" class="btn btn-suave" (click)="claveDe.set(null)">Cancelar</button>
          <button type="button" class="btn btn-primario" [disabled]="guardando() || cPassword().length < 6" (click)="guardarClave()">Guardar</button>
        </div>
      </app-modal>
    }
  `,
  styles: [`
    .tope{display:flex;align-items:center;gap:14px;padding:max(14px,env(safe-area-inset-top)) 20px 14px;background:linear-gradient(180deg,var(--granate-800),var(--granate-900));color:var(--crema-50)}
    .marca{display:flex;flex-direction:column;line-height:1.15;margin-right:auto}
    .marca strong{font-family:var(--f-display);font-size:1.3rem}
    .marca span{color:var(--oro-300);font-size:.85rem}
    .quien{font-weight:700;opacity:.9}
    .pagina{padding-top:22px}
    .lista{list-style:none;margin:0;padding:0;display:grid;gap:10px}
    .tienda{display:flex;align-items:center;gap:16px;padding:14px 16px;background:var(--crema-50);border:1px solid var(--linea);border-radius:var(--r-lg);flex-wrap:wrap}
    .tienda.suspendida{background:var(--crema-100)}
    .ico{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:var(--granate-100);color:var(--granate-700);flex-shrink:0}
    .datos{display:flex;flex-direction:column;flex:1;min-width:200px;line-height:1.3}
    .datos strong{font-size:1.15rem}
    .datos span{color:var(--tinta-2);font-size:.9rem}
    .acc{display:flex;gap:8px;flex-wrap:wrap}
    small{color:var(--tinta-3);font-weight:500}
  `]
})
export class AdminComponent implements OnInit {
  private api = inject(AdminService);
  private toast = inject(ToastService);
  auth = inject(AuthService);

  readonly fechaCorta = fechaCorta;
  readonly tiendas = signal<Tienda[]>([]);
  readonly cargando = signal(true);
  readonly activas = computed(() => this.tiendas().filter((t) => t.estado === 'ACTIVO').length);
  readonly confirmando = signal<number | null>(null);

  readonly nuevaAbierta = signal(false);
  readonly nNombre = signal('');
  readonly nTelefono = signal('');
  readonly nUsuario = signal('');
  readonly nPassword = signal('');
  readonly claveDe = signal<Tienda | null>(null);
  readonly cPassword = signal('');
  readonly guardando = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.api.listar().subscribe({
      next: (l) => {
        this.tiendas.set(l);
        this.cargando.set(false);
      },
      error: (e) => {
        this.cargando.set(false);
        this.toast.error('No se pudieron cargar las tiendas', mensajeError(e));
      }
    });
  }

  abrirNueva(): void {
    this.nNombre.set('');
    this.nTelefono.set('');
    this.nUsuario.set('');
    this.nPassword.set('');
    this.error.set('');
    this.nuevaAbierta.set(true);
  }

  crear(): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.api
      .crear({ nombre_tienda: this.nNombre().trim(), telefono: this.nTelefono().trim(), usuario_login: this.nUsuario().trim(), password: this.nPassword() })
      .subscribe({
        next: (t) => {
          this.guardando.set(false);
          this.nuevaAbierta.set(false);
          this.tiendas.update((l) => [t, ...l]);
          this.toast.ok('Tienda creada', `Usuario: ${t.usuario_login}`);
        },
        error: (e) => {
          this.guardando.set(false);
          this.error.set(mensajeError(e));
        }
      });
  }

  alternar(t: Tienda): void {
    if (this.confirmando() !== t.id_usuario) {
      this.confirmando.set(t.id_usuario);
      setTimeout(() => this.confirmando() === t.id_usuario && this.confirmando.set(null), 3000);
      return;
    }
    this.confirmando.set(null);
    const estado = t.estado === 'ACTIVO' ? 'SUSPENDIDO' : 'ACTIVO';
    this.api.actualizar(t.id_usuario, { estado }).subscribe({
      next: (n) => {
        this.tiendas.update((l) => l.map((x) => (x.id_usuario === n.id_usuario ? n : x)));
        this.toast.ok(estado === 'ACTIVO' ? 'Tienda reactivada' : 'Tienda suspendida', t.nombre_tienda);
      },
      error: (e) => this.toast.error('No se pudo cambiar el estado', mensajeError(e))
    });
  }

  abrirClave(t: Tienda): void {
    this.cPassword.set('');
    this.error.set('');
    this.claveDe.set(t);
  }

  guardarClave(): void {
    const t = this.claveDe();
    if (!t || this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.api.restablecerPassword(t.id_usuario, this.cPassword()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.claveDe.set(null);
        this.toast.ok('Contraseña restablecida', t.nombre_tienda);
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeError(e));
      }
    });
  }
}
