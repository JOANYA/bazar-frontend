import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from '../core/auth.service';
import { ReportesService } from '../core/reportes.service';
import { fechaLarga } from '../core/format';
import { IconoComponent } from '../shared/icono.component';
import { LogoComponent } from '../shared/logo.component';

interface Destino {
  ruta: string;
  texto: string;
  icono: string;
}

const DESTINOS: Destino[] = [
  { ruta: '/mostrador', texto: 'Mostrador', icono: 'mostrador' },
  { ruta: '/fiados', texto: 'Fiados', icono: 'cuaderno' },
  { ruta: '/inventario', texto: 'Inventario', icono: 'inventario' },
  { ruta: '/mercaderia', texto: 'Mercadería', icono: 'camion' },
  { ruta: '/caja', texto: 'Caja', icono: 'caja' }
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconoComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell">
      <!-- Riel lateral (tablet / computadora) -->
      <nav class="riel" aria-label="Secciones principales">
        <a class="marca" routerLink="/mostrador" aria-label="Bazar Vecino, ir al mostrador">
          <app-logo [tamano]="46" />
        </a>
        <ul>
          @for (d of destinos; track d.ruta) {
            <li>
              <a [routerLink]="d.ruta" routerLinkActive="activo" class="item">
                <span class="ico">
                  <app-icono [nombre]="d.icono" [tamano]="26" />
                  @if (d.ruta === '/inventario' && porReponer() > 0) { <b class="aviso">{{ porReponer() }}</b> }
                </span>
                <span class="txt">{{ d.texto }}</span>
              </a>
            </li>
          }
        </ul>
        <a routerLink="/cuenta" routerLinkActive="activo" class="item pie">
          <span class="ico"><app-icono nombre="usuario" [tamano]="26" /></span>
          <span class="txt">Mi cuenta</span>
        </a>
      </nav>

      <div class="contenido">
        <header class="tope">
          <a class="marca-movil" routerLink="/mostrador" aria-label="Ir al mostrador"><app-logo [tamano]="38" /></a>
          <div class="quien">
            <strong>{{ auth.nombre() }}</strong>
            <span>{{ hoyTexto() }}</span>
          </div>
          @if (cerrado()) {
            <span class="pastilla oro"><app-icono nombre="check" [tamano]="14" /> Día cerrado</span>
          }
          <a class="cuenta-movil btn-icono" routerLink="/cuenta" aria-label="Mi cuenta"><app-icono nombre="usuario" [tamano]="24" /></a>
        </header>

        <main><router-outlet /></main>
      </div>

      <!-- Barra inferior (celular) -->
      <nav class="barra" aria-label="Secciones principales">
        @for (d of destinos; track d.ruta) {
          <a [routerLink]="d.ruta" routerLinkActive="activo" class="b-item">
            <span class="ico">
              <app-icono [nombre]="d.icono" [tamano]="24" />
              @if (d.ruta === '/inventario' && porReponer() > 0) { <b class="aviso">{{ porReponer() }}</b> }
            </span>
            <span>{{ d.texto }}</span>
          </a>
        }
      </nav>
    </div>
  `,
  styles: [`
    .shell{display:grid;grid-template-columns:100px minmax(0,1fr);min-height:100dvh}
    .contenido{min-width:0;display:flex;flex-direction:column}
    main{flex:1;min-width:0}

    /* --- Riel --- */
    .riel{position:sticky;top:0;height:100dvh;display:flex;flex-direction:column;align-items:center;gap:18px;
      padding:18px 10px;background:linear-gradient(180deg,var(--granate-800),var(--granate-900));color:var(--crema-100)}
    .marca{display:block;margin-bottom:6px;border-radius:12px}
    .riel ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;width:100%}
    .item{position:relative;display:flex;flex-direction:column;align-items:center;gap:5px;padding:12px 4px 9px;border-radius:var(--r-lg);
      color:rgba(250,243,227,.78);text-decoration:none;font-size:.78rem;font-weight:700;letter-spacing:.01em;transition:background-color .15s,color .15s}
    .item:hover{background:rgba(250,243,227,.1);color:var(--crema-50)}
    .item.activo{background:var(--crema-50);color:var(--granate-700)}
    .item.activo::before{content:'';position:absolute;left:-10px;top:22%;bottom:22%;width:5px;border-radius:0 5px 5px 0;background:var(--oro-400)}
    .item.pie{margin-top:auto;width:100%}
    .ico{position:relative;display:grid;place-items:center}
    .aviso{position:absolute;top:-8px;right:-12px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:var(--oro-400);
      color:var(--granate-900);font-size:.7rem;font-weight:800;display:grid;place-items:center;border:2px solid var(--granate-800)}
    .item.activo .aviso{border-color:var(--crema-50)}

    /* --- Encabezado --- */
    .tope{display:flex;align-items:center;gap:14px;padding:16px 20px 6px;max-width:1280px;width:100%;margin:0 auto}
    .quien{display:flex;flex-direction:column;line-height:1.2;margin-right:auto;min-width:0}
    .quien strong{font-family:var(--f-display);font-size:1.25rem;color:var(--granate-800);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .quien span{color:var(--tinta-2);font-size:.9rem;text-transform:capitalize}
    .marca-movil,.cuenta-movil{display:none}
    .barra{display:none}

    /* --- Celular --- */
    @media (max-width:899px){
      .shell{grid-template-columns:minmax(0,1fr)}
      .riel{display:none}
      .marca-movil,.cuenta-movil{display:inline-flex}
      .tope{padding:max(12px,env(safe-area-inset-top)) 14px 4px}
      main{padding-bottom:calc(76px + env(safe-area-inset-bottom))}
      .barra{display:grid;grid-template-columns:repeat(5,1fr);position:fixed;z-index:60;left:0;right:0;bottom:0;
        padding:6px 6px calc(6px + env(safe-area-inset-bottom));background:var(--granate-900);box-shadow:0 -6px 24px rgba(62,11,22,.3)}
      .b-item{display:flex;flex-direction:column;align-items:center;gap:3px;padding:7px 2px;border-radius:var(--r-md);
        color:rgba(250,243,227,.72);text-decoration:none;font-size:.7rem;font-weight:700}
      .b-item.activo{background:var(--crema-50);color:var(--granate-700)}
      .b-item .aviso{border-color:var(--granate-900)}
      .b-item.activo .aviso{border-color:var(--crema-50)}
    }
  `]
})
export class ShellComponent {
  auth = inject(AuthService);
  private reportes = inject(ReportesService);
  private router = inject(Router);

  readonly destinos = DESTINOS;

  readonly porReponer = computed(() => {
    const s = this.reportes.inicio()?.stock;
    return s ? s.agotados + s.por_agotarse : 0;
  });
  readonly cerrado = computed(() => this.reportes.inicio()?.hoy.cerrado ?? false);
  readonly hoyTexto = computed(() => {
    const f = this.reportes.inicio()?.hoy.fecha;
    if (f) return fechaLarga(f);
    const d = new Date();
    return fechaLarga(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  });

  constructor() {
    // El pulso del día (avisos de stock, cierre) se refresca al cambiar de pantalla.
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.reportes.refrescarInicio());
  }
}
