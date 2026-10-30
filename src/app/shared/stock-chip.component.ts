import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NivelStock } from '../core/models';
import { IconoComponent } from './icono.component';

/** Semáforo de inventario. Nunca se apoya solo en el color: lleva texto y forma. */
@Component({
  selector: 'app-stock-chip',
  standalone: true,
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="chip" [class]="nivel">
      <i class="punto"></i>
      @if (nivel === 'rojo') { Agotado }
      @else if (nivel === 'amarillo') { Quedan {{ stock }} }
      @else { {{ compacto ? stock : 'Hay ' + stock }} }
    </span>
  `,
  styles: [`
    .chip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 8px;border-radius:999px;font-size:.78rem;font-weight:700;white-space:nowrap}
    .punto{width:8px;height:8px;border-radius:50%;background:currentColor;display:inline-block}
    .verde{background:#E4EED9;color:#3C6128}
    .amarillo{background:#FBEBC2;color:#7A5200}
    .amarillo .punto{border-radius:2px;transform:rotate(45deg)}
    .rojo{background:#F8D9D6;color:#9C231C}
    .rojo .punto{border-radius:1px}
  `]
})
export class StockChipComponent {
  @Input({ required: true }) nivel: NivelStock = 'verde';
  @Input() stock = 0;
  @Input() compacto = false;
}
