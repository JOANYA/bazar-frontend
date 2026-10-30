import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  tipo: 'ok' | 'error' | 'aviso';
  titulo: string;
  texto?: string;
  accion?: { texto: string; fn: () => void };
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly lista = signal<Toast[]>([]);
  private n = 0;

  mostrar(t: Omit<Toast, 'id'>, duracionMs = 4500): void {
    const id = ++this.n;
    // máximo 3 a la vez: lo más viejo se va
    this.lista.update((l) => [...l.slice(-2), { ...t, id }]);
    setTimeout(() => this.cerrar(id), t.accion ? Math.max(duracionMs, 9000) : duracionMs);
  }

  ok(titulo: string, texto?: string): void { this.mostrar({ tipo: 'ok', titulo, texto }); }
  aviso(titulo: string, texto?: string): void { this.mostrar({ tipo: 'aviso', titulo, texto }); }
  error(titulo: string, texto?: string): void { this.mostrar({ tipo: 'error', titulo, texto }, 7000); }

  cerrar(id: number): void {
    this.lista.update((l) => l.filter((x) => x.id !== id));
  }
}
