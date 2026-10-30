import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Marca del bazar: un toldo de tienda de barrio, a rayas crema y oro, sobre granate. */
@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg viewBox="0 0 40 40" [attr.width]="tamano" [attr.height]="tamano" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="bv-toldo">
          <path d="M6 11h28v7a4.667 4.667 0 0 1-9.333 0 4.667 4.667 0 0 1-9.334 0 4.667 4.667 0 0 1-9.333 0z" />
        </clipPath>
      </defs>
      <rect width="40" height="40" rx="10" fill="#6E1424" />
      <g clip-path="url(#bv-toldo)">
        <rect x="6" y="10" width="28" height="12" fill="#FBF3DF" />
        <rect x="10.67" y="10" width="4.67" height="12" fill="#DDB24A" />
        <rect x="20" y="10" width="4.67" height="12" fill="#DDB24A" />
        <rect x="29.33" y="10" width="4.67" height="12" fill="#DDB24A" />
      </g>
      <path d="M10 24.5v8.5h20V24.5" fill="none" stroke="#FBF3DF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <rect x="17.5" y="26.5" width="5" height="6.5" rx="1" fill="#DDB24A" />
    </svg>
  `,
  styles: [`:host{display:inline-flex;line-height:0}`]
})
export class LogoComponent {
  @Input() tamano = 40;
}
