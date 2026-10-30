import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/format';
import { ToastService } from '../../core/toast.service';
import { IconoComponent } from '../../shared/icono.component';
import { LogoComponent } from '../../shared/logo.component';

@Component({
  selector: 'app-cuenta',
  standalone: true,
  imports: [FormsModule, IconoComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pagina estrecha">
      <div class="pagina-cabecera"><div><h1>Mi cuenta</h1><p>Los datos de tu bazar y tu contraseña.</p></div></div>

      <section class="tarjeta perfil">
        <app-logo [tamano]="64" />
        <div>
          <h2>{{ auth.sesion()?.nombre }}</h2>
          <dl>
            <div><dt>Usuario</dt><dd>{{ auth.sesion()?.usuario }}</dd></div>
            @if (auth.sesion()?.telefono) { <div><dt>Teléfono</dt><dd class="num">{{ auth.sesion()?.telefono }}</dd></div> }
          </dl>
        </div>
      </section>

      <section class="tarjeta bloque">
        <h2>Cambiar contraseña</h2>
        <form (submit)="$event.preventDefault(); cambiar()">
          <div class="campo">
            <label for="actual">Contraseña actual</label>
            <input id="actual" name="actual" class="input" type="password" autocomplete="current-password" [ngModel]="actual()" (ngModelChange)="actual.set($event)" />
          </div>
          <div class="campo">
            <label for="nueva">Contraseña nueva <small>(mínimo 6 caracteres)</small></label>
            <input id="nueva" name="nueva" class="input" type="password" autocomplete="new-password" [ngModel]="nueva()" (ngModelChange)="nueva.set($event)" />
          </div>
          @if (error()) { <div class="error-caja" role="alert">{{ error() }}</div> }
          <button class="btn btn-primario" type="submit" [disabled]="guardando() || !actual() || nueva().length < 6">
            @if (guardando()) { <span class="carga"></span> } <app-icono nombre="candado" [tamano]="20" /> Guardar contraseña
          </button>
        </form>
      </section>

      <button type="button" class="btn btn-borde btn-grande salir" (click)="auth.cerrarSesion()">
        <app-icono nombre="salir" [tamano]="24" /> Cerrar sesión
      </button>
    </div>
  `,
  styles: [`
    .estrecha{max-width:640px}
    .perfil{display:flex;align-items:center;gap:20px;padding:22px;margin-bottom:16px}
    .perfil h2{margin:0 0 6px;font-size:1.6rem}
    dl{margin:0;display:grid;gap:4px}
    dl div{display:flex;gap:10px}
    dt{color:var(--tinta-3);min-width:70px}
    dd{margin:0;font-weight:700}
    .bloque{padding:22px;margin-bottom:20px}
    .bloque h2{margin:0 0 14px;font-size:1.35rem}
    form{display:grid;gap:14px}
    form .btn{justify-self:start}
    small{color:var(--tinta-3);font-weight:500}
    .salir{width:100%}
  `]
})
export class CuentaComponent {
  auth = inject(AuthService);
  private toast = inject(ToastService);

  readonly actual = signal('');
  readonly nueva = signal('');
  readonly guardando = signal(false);
  readonly error = signal('');

  cambiar(): void {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set('');
    this.auth.cambiarPassword(this.actual(), this.nueva()).subscribe({
      next: () => {
        this.guardando.set(false);
        this.actual.set('');
        this.nueva.set('');
        this.toast.ok('Contraseña actualizada');
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeError(e));
      }
    });
  }
}
