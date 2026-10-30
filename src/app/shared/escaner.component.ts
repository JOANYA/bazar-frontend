import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, Output, ViewChild, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconoComponent } from './icono.component';

interface DetectorCodigos {
  detect(origen: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
interface Controles { stop(): void }

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf'];

/**
 * Lector de códigos de barras con la cámara del celular o la tablet.
 *  1) Usa el detector nativo del navegador (BarcodeDetector) cuando existe: es rápido y no pesa nada.
 *  2) Si no existe (Safari / iPhone), carga ZXing solo en ese momento.
 *  3) Siempre queda la opción de escribir el código a mano.
 * Modo continuo: no se cierra al leer, para pasar varios productos seguidos.
 */
@Component({
  selector: 'app-escaner',
  standalone: true,
  imports: [FormsModule, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pantalla" role="dialog" aria-modal="true" aria-label="Escáner de códigos de barras">
      <header>
        <div>
          <h2>{{ titulo }}</h2>
          <p>Apunta al código de barras del producto</p>
        </div>
        <button type="button" class="listo" (click)="cerrar.emit()">Listo</button>
      </header>

      <div class="visor">
        <video #video playsinline muted autoplay></video>
        @if (estado() === 'activo') {
          <div class="marco"><i></i><i></i><i></i><i></i><span class="linea"></span></div>
        }
        @if (estado() === 'iniciando') { <div class="msg">Abriendo la cámara…</div> }
        @if (estado() === 'error') {
          <div class="msg error">
            <app-icono nombre="camara" [tamano]="36" />
            <p>{{ error() }}</p>
            <small>Puedes escribir el código aquí abajo.</small>
          </div>
        }
      </div>

      @if (ultimo) { <div class="ultimo" [class.mal]="ultimoMal">{{ ultimo }}</div> }

      <form class="manual" (submit)="$event.preventDefault(); enviarManual()">
        <input type="text" inputmode="numeric" autocomplete="off" placeholder="O escribe el código y pulsa Enter"
               [ngModel]="manual()" (ngModelChange)="manual.set($event)" name="codigo" aria-label="Código de barras" />
        <button type="submit" [disabled]="manual().trim().length < 3">Buscar</button>
      </form>
    </div>
  `,
  styles: [`
    :host{position:fixed;inset:0;z-index:150;display:block}
    .pantalla{position:absolute;inset:0;background:#1d100e;color:var(--crema-50);display:flex;flex-direction:column;
      padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));gap:14px}
    header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    h2{margin:0;font-family:var(--f-display);font-size:1.5rem}
    header p{margin:2px 0 0;opacity:.7;font-size:.92rem}
    .listo{background:var(--oro-400);color:var(--granate-900);border:0;border-radius:999px;font-weight:800;padding:0 26px;min-height:52px;font-family:inherit;font-size:1.05rem;cursor:pointer}
    .visor{position:relative;flex:1;min-height:0;border-radius:var(--r-xl);overflow:hidden;background:#000;display:grid;place-items:center}
    video{width:100%;height:100%;object-fit:cover}
    .marco{position:absolute;inset:0;margin:auto;width:min(78%,420px);height:min(34%,200px)}
    .marco i{position:absolute;width:34px;height:34px;border:4px solid var(--oro-400)}
    .marco i:nth-child(1){top:0;left:0;border-right:0;border-bottom:0;border-radius:12px 0 0 0}
    .marco i:nth-child(2){top:0;right:0;border-left:0;border-bottom:0;border-radius:0 12px 0 0}
    .marco i:nth-child(3){bottom:0;left:0;border-right:0;border-top:0;border-radius:0 0 0 12px}
    .marco i:nth-child(4){bottom:0;right:0;border-left:0;border-top:0;border-radius:0 0 12px 0}
    .linea{position:absolute;left:6%;right:6%;height:3px;background:var(--granate-500);box-shadow:0 0 14px var(--granate-500);animation:barre 1.8s ease-in-out infinite alternate}
    @keyframes barre{from{top:12%}to{top:86%}}
    .msg{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:8px;text-align:center;padding:24px;opacity:.9}
    .msg p{margin:0;font-weight:600}
    .msg.error{color:var(--oro-300)}
    .ultimo{background:#2f6b2f;color:#fff;padding:12px 16px;border-radius:var(--r-lg);font-weight:700;text-align:center;animation:pop .2s}
    .ultimo.mal{background:var(--granate-600)}
    @keyframes pop{from{transform:scale(.96);opacity:.4}}
    .manual{display:flex;gap:10px}
    .manual input{flex:1;min-height:54px;border-radius:var(--r-lg);border:2px solid #4a3530;background:#2a1a17;color:var(--crema-50);padding:0 16px;font:inherit;font-size:1.05rem}
    .manual input:focus{outline:none;border-color:var(--oro-400)}
    .manual button{min-height:54px;padding:0 22px;border-radius:var(--r-lg);border:0;background:var(--crema-200);color:var(--tinta);font-weight:800;font-family:inherit;cursor:pointer}
    .manual button:disabled{opacity:.4}
    @media (prefers-reduced-motion:reduce){.linea{animation:none;top:50%}}
  `]
})
export class EscanerComponent implements AfterViewInit, OnDestroy {
  @Input() titulo = 'Escanear producto';
  /** Texto de respuesta del padre tras cada lectura ("Aceite Primor agregado"). */
  @Input() ultimo: string | null = null;
  @Input() ultimoMal = false;
  @Output() leido = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('video', { static: true }) video!: ElementRef<HTMLVideoElement>;

  readonly estado = signal<'iniciando' | 'activo' | 'error'>('iniciando');
  readonly error = signal('');
  readonly manual = signal('');

  private stream?: MediaStream;
  private temporizador?: ReturnType<typeof setInterval>;
  private controles?: Controles;
  private detenido = false;
  private ultimoCodigo = '';
  private ultimoMs = 0;

  async ngAfterViewInit(): Promise<void> {
    await this.iniciar();
  }

  ngOnDestroy(): void {
    this.detener();
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    this.cerrar.emit();
  }

  enviarManual(): void {
    const c = this.manual().trim();
    if (c.length < 3) return;
    this.manual.set('');
    this.leido.emit(c);
  }

  private async iniciar(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      return this.fallar(
        window.isSecureContext
          ? 'Este navegador no permite usar la cámara.'
          : 'La cámara solo funciona con conexión segura (https).'
      );
    }
    try {
      const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => DetectorCodigos }).BarcodeDetector;
      if (Detector) {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (this.detenido) return this.detener();
        const v = this.video.nativeElement;
        v.srcObject = this.stream;
        await v.play();
        const detector = new Detector({ formats: FORMATOS });
        this.estado.set('activo');
        this.temporizador = setInterval(async () => {
          if (v.readyState < 2) return;
          try {
            const r = await detector.detect(v);
            if (r.length) this.emitir(r[0].rawValue);
          } catch { /* un cuadro malo no detiene la lectura */ }
        }, 220);
      } else {
        // Safari / iPhone: ZXing se descarga solo si hace falta.
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        if (this.detenido) return;
        const lector = new BrowserMultiFormatReader();
        this.controles = await lector.decodeFromVideoDevice(undefined, this.video.nativeElement, (resultado) => {
          if (resultado) this.emitir(resultado.getText());
        });
        this.estado.set('activo');
      }
    } catch (e) {
      const nombre = (e as { name?: string })?.name;
      this.fallar(
        nombre === 'NotAllowedError'
          ? 'Falta el permiso de la cámara. Actívalo en el navegador y vuelve a abrir el escáner.'
          : nombre === 'NotFoundError'
            ? 'No se encontró ninguna cámara en este equipo.'
            : 'No se pudo abrir la cámara.'
      );
    }
  }

  /** Evita leer el mismo código diez veces mientras el producto sigue frente a la cámara. */
  private emitir(codigo: string): void {
    const ahora = Date.now();
    if (codigo === this.ultimoCodigo && ahora - this.ultimoMs < 2200) return;
    this.ultimoCodigo = codigo;
    this.ultimoMs = ahora;
    navigator.vibrate?.(60);
    this.leido.emit(codigo);
  }

  private fallar(msg: string): void {
    this.error.set(msg);
    this.estado.set('error');
  }

  private detener(): void {
    this.detenido = true;
    if (this.temporizador) clearInterval(this.temporizador);
    try { this.controles?.stop(); } catch { /* ya detenido */ }
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}
