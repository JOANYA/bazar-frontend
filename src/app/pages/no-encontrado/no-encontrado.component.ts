import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '../../shared/logo.component';

@Component({
  selector: 'app-no-encontrado',
  standalone: true,
  imports: [RouterLink, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="caja">
      <app-logo [tamano]="64" />
      <h1>Esta página no existe</h1>
      <p>Puede que el enlace esté mal escrito. Vuelve al mostrador y sigue vendiendo.</p>
      <a class="btn btn-primario btn-grande" routerLink="/mostrador">Ir al mostrador</a>
    </div>
  `,
  styles: [`.caja{min-height:100dvh;display:grid;place-content:center;justify-items:center;gap:14px;text-align:center;padding:24px}h1{margin:0;font-size:2rem}p{margin:0;color:var(--tinta-2);max-width:34ch}`]
})
export class NoEncontradoComponent {}
