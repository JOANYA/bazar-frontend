import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { environment } from '../../environments/environment';
import { claseColor, inicial } from '../core/format';

/**
 * "Foto" del producto. Si no hay imagen, un monograma grande en la letra inicial y un
 * color estable por nombre: en el mostrador se reconoce un producto por su color y su letra.
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (src) {
      <img [src]="src" [alt]="nombre" loading="lazy" (error)="src = null" />
    } @else {
      <span class="mono" [ngClass]="color">{{ letra }}</span>
    }
  `,
  styles: [`
    :host{display:block;width:var(--av,56px);height:var(--av,56px);border-radius:var(--av-r,16px);overflow:hidden;flex-shrink:0}
    img{width:100%;height:100%;object-fit:cover;display:block}
    .mono{display:grid;place-items:center;width:100%;height:100%;font-family:var(--f-display);font-weight:700;
      font-size:calc(var(--av,56px) * .5);line-height:1;font-variation-settings:'opsz' 72;letter-spacing:-.02em}
    .tono-0{background:var(--granate-100);color:var(--granate-700)}
    .tono-1{background:var(--oro-300);color:var(--oro-800)}
    .tono-2{background:var(--crema-300);color:var(--tinta)}
    .tono-3{background:var(--granate-700);color:var(--crema-100)}
    .tono-4{background:var(--oro-500);color:var(--granate-900)}
  `]
})
export class AvatarComponent {
  @Input({ required: true }) nombre = '';
  @Input() set imagen(v: string | null | undefined) {
    this.src = v ? (v.startsWith('/') ? environment.apiUrl.replace(/\/api\/?$/, '') + v : v) : null;
  }
  src: string | null = null;

  get letra(): string { return inicial(this.nombre); }
  get color(): string { return claseColor(this.nombre); }
}
