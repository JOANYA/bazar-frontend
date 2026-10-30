import { HttpParams } from '@angular/common/http';

/** Arma query params ignorando lo vacío (undefined, null, ''). */
export function parametros(obj: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    p = p.set(k, String(v));
  }
  return p;
}
