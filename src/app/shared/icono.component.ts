import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Iconos propios del bazar, dibujados sobre una cuadrícula de 24 px con trazo de 1.8.
 * El contenido son cadenas fijas de este archivo (nunca datos del usuario), por eso es
 * seguro marcarlas como confiables: Angular sanea <path> y dejaría el SVG vacío.
 */
export const ICONOS: Record<string, string> = {
  mostrador: '<path d="M3 9l1.6-5h14.8L21 9"/><path d="M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
  cuaderno: '<path d="M6 3h11a2 2 0 012 2v14a2 2 0 01-2 2H6z"/><path d="M6 3v18"/><path d="M10 8h5M10 12h5"/>',
  inventario: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
  camion: '<path d="M2 6h11v9H2z"/><path d="M13 9h4l3 3v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  caja: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v.01M17.5 14.5v.01"/>',
  buscar: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  microfono: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M9 21h6"/>',
  escanear: '<path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"/><path d="M8 9v6M11 9v6M14 9v6M17 9v6"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  menos: '<path d="M5 12h14"/>',
  cerrar: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  basura: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/>',
  estrella: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z"/>',
  alerta: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>',
  flechaD: '<path d="M9 5l7 7-7 7"/>',
  flechaI: '<path d="M15 5l-7 7 7 7"/>',
  abajo: '<path d="M5 9l7 7 7-7"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/>',
  salir: '<path d="M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4M10 8l-4 4 4 4M6 12h10"/>',
  telefono: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/>',
  lapiz: '<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
  reloj: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  celular: '<rect x="7" y="3" width="10" height="18" rx="2.5"/><path d="M11 18h2"/>',
  tarjeta: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3 10h18M7 15h4"/>',
  monedas: '<ellipse cx="12" cy="7" rx="7" ry="3"/><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5"/>',
  deshacer: '<path d="M8 5L3.5 9.5 8 14"/><path d="M4 9.5h9a6 6 0 010 12H9"/>',
  candado: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  enviar: '<path d="M21 3L10 14M21 3l-6.5 18-4-7-7-4z"/>',
  calendario: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8 3.5v4M16 3.5v4"/>',
  barras: '<path d="M5 20V11M12 20V5M19 20v-7"/>',
  ticket: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  ojo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>',
  ojoNo: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/><path d="M4 4l16 16"/>',
  escudo: '<path d="M12 3l7.5 3v5.5c0 4.5-3.2 8-7.5 9.5-4.3-1.5-7.5-5-7.5-9.5V6z"/>',
  camara: '<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"/><circle cx="12" cy="13" r="3.4"/>',
  tienda: '<path d="M4 10v10h16V10"/><path d="M3 10l2-6h14l2 6z"/><path d="M9 20v-5h6v5"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  linterna: '<path d="M8 3h8v5l-2 3v10h-4V11L8 8z"/>',
  imprimir: '<path d="M7 9V3.5h10V9M7 17H4.5a1 1 0 01-1-1v-6a1 1 0 011-1h15a1 1 0 011 1v6a1 1 0 01-1 1H17"/><rect x="7" y="14" width="10" height="6.5" rx="1"/>'
};

@Component({
  selector: 'app-icono',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg
    viewBox="0 0 24 24"
    [attr.width]="tamano"
    [attr.height]="tamano"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    [attr.role]="etiqueta ? 'img' : null"
    [attr.aria-label]="etiqueta || null"
    [attr.aria-hidden]="etiqueta ? null : 'true'"
    focusable="false"
    [innerHTML]="contenido"
  ></svg>`,
  styles: [`:host{display:inline-flex;align-items:center;justify-content:center;line-height:0;flex-shrink:0}svg{display:block}`]
})
export class IconoComponent {
  private sanitizer = inject(DomSanitizer);
  private cache = new Map<string, SafeHtml>();

  @Input({ required: true }) nombre = '';
  @Input() tamano: number | string = 22;
  /** Solo si el icono va solo (sin texto al lado): lo anuncia a lectores de pantalla. */
  @Input() etiqueta?: string;

  get contenido(): SafeHtml {
    let c = this.cache.get(this.nombre);
    if (!c) {
      c = this.sanitizer.bypassSecurityTrustHtml(ICONOS[this.nombre] ?? '<circle cx="12" cy="12" r="8"/>');
      this.cache.set(this.nombre, c);
    }
    return c;
  }
}
