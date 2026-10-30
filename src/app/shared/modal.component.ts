import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, inject } from '@angular/core';
import { IconoComponent } from './icono.component';

/**
 * Ventana emergente. En pantallas grandes es una tarjeta centrada; en el celular sube
 * desde abajo como una hoja, al alcance del pulgar. Se cierra con Esc o tocando afuera.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="velo" (click)="cerrar.emit()"></div>
    <section class="hoja" role="dialog" aria-modal="true" [attr.aria-label]="titulo" [style.--ancho]="ancho + 'px'">
      <header>
        <h2>{{ titulo }}</h2>
        <button type="button" class="btn-icono" (click)="cerrar.emit()" aria-label="Cerrar">
          <app-icono nombre="cerrar" [tamano]="22" />
        </button>
      </header>
      <div class="cuerpo"><ng-content /></div>
      <footer class="pie"><ng-content select="[pie]" /></footer>
    </section>
  `,
  styles: [`
    :host{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px}
    .velo{position:absolute;inset:0;background:rgba(42,24,21,.52);backdrop-filter:blur(3px);animation:vel .18s ease}
    .hoja{position:relative;width:min(var(--ancho,560px),100%);max-height:calc(100dvh - 32px);display:flex;flex-direction:column;
      background:var(--crema-50);border-radius:var(--r-xl);box-shadow:var(--sombra-alta);animation:subir .22s cubic-bezier(.2,.8,.2,1);
      border:1px solid var(--linea)}
    header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 8px}
    h2{margin:0;font-family:var(--f-display);font-size:1.45rem;font-weight:700;color:var(--granate-800);letter-spacing:-.01em}
    .cuerpo{padding:8px 20px 16px;overflow-y:auto;overscroll-behavior:contain}
    .pie{padding:12px 20px calc(16px + env(safe-area-inset-bottom));border-top:1px solid var(--linea);display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
    .pie:empty{display:none}
    @keyframes vel{from{opacity:0}}
    @keyframes subir{from{transform:translateY(18px);opacity:0}}
    @media (max-width:640px){
      :host{place-items:end center;padding:0}
      .hoja{width:100%;border-radius:var(--r-xl) var(--r-xl) 0 0;max-height:92dvh}
      @keyframes subir{from{transform:translateY(100%)}}
    }
  `]
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input({ required: true }) titulo = '';
  @Input() ancho = 560;
  @Output() cerrar = new EventEmitter<void>();

  private previo: Element | null = null;

  ngAfterViewInit(): void {
    this.previo = document.activeElement;
    document.body.style.overflow = 'hidden';
    // Foco al primer campo para poder escribir sin tocar nada.
    setTimeout(() => {
      const campo = this.el.nativeElement.querySelector<HTMLElement>('[autofocus], input:not([type=hidden]), textarea');
      campo?.focus();
    }, 60);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    (this.previo as HTMLElement | null)?.focus?.();
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    this.cerrar.emit();
  }
}
