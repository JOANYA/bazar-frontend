import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';
import { IconoComponent } from './icono.component';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pila" aria-live="polite" role="status">
      @for (t of toasts.lista(); track t.id) {
        <div class="toast" [class]="t.tipo">
          <span class="ico">
            <app-icono [nombre]="t.tipo === 'ok' ? 'check' : t.tipo === 'error' ? 'alerta' : 'info'" [tamano]="20" />
          </span>
          <div class="txt">
            <strong>{{ t.titulo }}</strong>
            @if (t.texto) { <span>{{ t.texto }}</span> }
          </div>
          @if (t.accion) {
            <button type="button" class="accion" (click)="t.accion.fn(); toasts.cerrar(t.id)">{{ t.accion.texto }}</button>
          }
          <button type="button" class="x" (click)="toasts.cerrar(t.id)" aria-label="Cerrar aviso">
            <app-icono nombre="cerrar" [tamano]="16" />
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .pila{position:fixed;z-index:200;left:50%;transform:translateX(-50%);bottom:calc(86px + env(safe-area-inset-bottom));
      display:flex;flex-direction:column;gap:8px;width:min(480px,calc(100vw - 24px));pointer-events:none}
    @media (min-width:900px){.pila{bottom:24px;left:calc(50% + 46px)}}
    .toast{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;border-radius:var(--r-lg);
      background:var(--tinta);color:var(--crema-50);box-shadow:var(--sombra-alta);animation:entra .22s cubic-bezier(.2,.8,.2,1)}
    .ico{display:grid;place-items:center;width:32px;height:32px;border-radius:50%;flex-shrink:0}
    .ok .ico{background:var(--oro-400);color:var(--granate-900)}
    .aviso .ico{background:var(--oro-300);color:var(--granate-900)}
    .error .ico{background:#E0584F;color:#fff}
    .txt{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0;line-height:1.25}
    .txt strong{font-weight:700}
    .txt span{font-size:.88rem;opacity:.85}
    .accion{background:var(--oro-400);color:var(--granate-900);border:0;border-radius:999px;padding:8px 14px;font-weight:800;min-height:40px;cursor:pointer;font-family:inherit}
    .x{background:none;border:0;color:inherit;opacity:.6;cursor:pointer;padding:6px;border-radius:50%;display:grid;place-items:center}
    .x:hover{opacity:1}
    @keyframes entra{from{transform:translateY(12px);opacity:0}}
  `]
})
export class ToastHostComponent {
  toasts = inject(ToastService);
}
