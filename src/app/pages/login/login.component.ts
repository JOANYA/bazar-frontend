import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeError } from '../../core/format';
import { IconoComponent } from '../../shared/icono.component';
import { LogoComponent } from '../../shared/logo.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconoComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login">
      <aside class="marca">
        <div class="toldo" aria-hidden="true"></div>
        <div class="marca-int">
          <app-logo [tamano]="56" />
          <h1>Bazar<br />Vecino</h1>
          <p class="lema">Más rápido que un lápiz.<br />Tu cuaderno de ventas y fiados, siempre al día.</p>
          <ul class="puntos">
            <li><app-icono nombre="mostrador" [tamano]="20" /> Vende con un toque</li>
            <li><app-icono nombre="cuaderno" [tamano]="20" /> Fía sin escribir</li>
            <li><app-icono nombre="caja" [tamano]="20" /> Cierra la caja sin cuentas</li>
          </ul>
        </div>
      </aside>

      <main class="form-lado">
        <form class="form" (submit)="$event.preventDefault(); entrar()">
          <div class="movil-logo"><app-logo [tamano]="44" /><span>Bazar Vecino</span></div>
          <h2>{{ admin() ? 'Panel del administrador' : 'Bienvenida' }}</h2>
          <p class="sub">{{ admin() ? 'Entra con tu correo para gestionar las tiendas.' : 'Entra a tu bazar para empezar a vender.' }}</p>

          @if (vencida && !error()) {
            <div class="aviso-caja"><app-icono nombre="info" [tamano]="20" /> Tu sesión venció. Vuelve a entrar.</div>
          }
          @if (error()) { <div class="error-caja" role="alert">{{ error() }}</div> }

          <div class="campo">
            <label for="usuario">{{ admin() ? 'Correo' : 'Usuario' }}</label>
            <input id="usuario" name="usuario" class="input" [class.invalido]="error()"
                   [type]="admin() ? 'email' : 'text'" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false"
                   [placeholder]="admin() ? 'tu@correo.com' : 'por ejemplo: bazar.rosita'"
                   [ngModel]="usuario()" (ngModelChange)="usuario.set($event)" autofocus />
          </div>

          <div class="campo">
            <label for="clave">Contraseña</label>
            <div class="clave">
              <input id="clave" name="clave" class="input" [class.invalido]="error()"
                     [type]="ver() ? 'text' : 'password'" autocomplete="current-password" placeholder="Tu contraseña"
                     [ngModel]="password()" (ngModelChange)="password.set($event)" />
              <button type="button" class="ojo btn-icono" (click)="ver.set(!ver())"
                      [attr.aria-label]="ver() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <app-icono [nombre]="ver() ? 'ojoNo' : 'ojo'" [tamano]="22" />
              </button>
            </div>
          </div>

          <button class="btn btn-primario btn-grande btn-bloque" type="submit" [disabled]="enviando() || !usuario().trim() || !password()">
            @if (enviando()) { <span class="carga"></span> Entrando… } @else { Entrar <app-icono nombre="flecha" [tamano]="22" /> }
          </button>

          <button type="button" class="cambiar" (click)="alternar()">
            @if (admin()) { <app-icono nombre="tienda" [tamano]="18" /> Soy dueña de un bazar }
            @else { <app-icono nombre="escudo" [tamano]="18" /> Soy el administrador }
          </button>
        </form>
      </main>
    </div>
  `,
  styles: [`
    .login{display:grid;grid-template-columns:minmax(380px,46%) 1fr;min-height:100dvh}
    .marca{position:relative;overflow:hidden;color:var(--crema-50);
      background:radial-gradient(900px 500px at 10% 110%,rgba(221,178,74,.22),transparent 60%),linear-gradient(160deg,var(--granate-700),var(--granate-900))}
    .toldo{height:96px;background:repeating-linear-gradient(90deg,#fbf3df 0 44px,#ddb24a 44px 88px);
      -webkit-mask:linear-gradient(#000 0 0) top/100% calc(100% - 22px) no-repeat,radial-gradient(22px 22px at 22px 0,#000 21px,transparent 22px) bottom/44px 22px repeat-x;
      mask:linear-gradient(#000 0 0) top/100% calc(100% - 22px) no-repeat,radial-gradient(22px 22px at 22px 0,#000 21px,transparent 22px) bottom/44px 22px repeat-x;
      filter:drop-shadow(0 8px 10px rgba(0,0,0,.25))}
    .marca-int{padding:44px 48px;display:flex;flex-direction:column;gap:22px}
    .marca h1{margin:0;font-size:clamp(3rem,6vw,4.6rem);color:var(--crema-50);font-weight:800;line-height:.95;letter-spacing:-.03em}
    .lema{margin:0;font-size:1.2rem;line-height:1.5;color:var(--oro-300);max-width:30ch}
    .puntos{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:14px}
    .puntos li{display:flex;align-items:center;gap:12px;font-weight:600;color:var(--crema-100)}
    .puntos app-icono{color:var(--oro-400)}

    .form-lado{display:grid;place-items:center;padding:28px}
    .form{width:min(440px,100%);display:flex;flex-direction:column;gap:18px}
    .form h2{margin:0;font-size:2.1rem}
    .sub{margin:-8px 0 4px;color:var(--tinta-2)}
    .clave{position:relative}
    .clave .input{padding-right:58px}
    .ojo{position:absolute;right:6px;top:50%;transform:translateY(-50%)}
    .cambiar{align-self:center;display:inline-flex;align-items:center;gap:8px;background:none;border:0;color:var(--granate-600);
      font-weight:700;padding:12px;border-radius:var(--r-md);min-height:48px}
    .cambiar:hover{background:var(--crema-200)}
    .aviso-caja{display:flex;gap:10px;align-items:center;background:#f6e3b0;color:var(--oro-800);padding:12px 14px;border-radius:var(--r-md);font-weight:600}
    .movil-logo{display:none;align-items:center;gap:12px;font-family:var(--f-display);font-weight:800;font-size:1.5rem;color:var(--granate-800)}

    @media (max-width:860px){
      .login{grid-template-columns:1fr}
      .marca{display:none}
      .movil-logo{display:flex}
      .form-lado{place-items:start center;padding-top:max(36px,env(safe-area-inset-top))}
    }
  `]
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  vencida = inject(ActivatedRoute).snapshot.queryParamMap.has('vencida');

  readonly admin = signal(false);
  readonly usuario = signal('');
  readonly password = signal('');
  readonly ver = signal(false);
  readonly enviando = signal(false);
  readonly error = signal('');

  alternar(): void {
    this.admin.update((v) => !v);
    this.error.set('');
    this.usuario.set('');
    this.password.set('');
  }

entrar(): void {
    if (this.enviando()) return;
    this.enviando.set(true);
    this.error.set('');
    const u = this.usuario().trim();
    
    // Forzamos el tipo como Observable<any> para que TypeScript no discuta las diferencias de interfaces
    const login$: any = this.admin() 
      ? this.auth.loginAdmin(u, this.password()) 
      : this.auth.loginTienda(u, this.password());

    login$.subscribe({
      next: () => this.router.navigateByUrl(this.admin() ? '/admin' : '/mostrador'),
      error: (e: any) => {
        this.enviando.set(false);
        this.error.set(mensajeError(e, 'No se pudo entrar. Revisa tus datos.'));
      }
    });
  }
}
