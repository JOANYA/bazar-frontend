/** Utilidades de formato pensadas para Perú (soles, hora del negocio). */

const NUM = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const soles = (n: number | null | undefined): string => `S/ ${NUM.format(Number(n) || 0)}`;

/** Redondeo a céntimos para evitar 0.1 + 0.2 = 0.30000000000000004. */
export const redondear = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** El backend manda 'YYYY-MM-DD HH:mm:ss' ya en hora del negocio: se lee sin convertir zonas. */
function partes(s: string): { y: number; m: number; d: number; hh: number; mm: number } {
  const [f, h = '00:00:00'] = s.replace('T', ' ').split(' ');
  const [y, m, d] = f.split('-').map(Number);
  const [hh, mm] = h.split(':').map(Number);
  return { y, m, d, hh: hh || 0, mm: mm || 0 };
}

export function hora(s: string | null | undefined): string {
  if (!s) return '';
  const { hh, mm } = partes(s);
  const sufijo = hh >= 12 ? 'p. m.' : 'a. m.';
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${h12}:${String(mm).padStart(2, '0')} ${sufijo}`;
}

export function fechaCorta(s: string | null | undefined): string {
  if (!s) return '';
  const { y, m, d } = partes(s);
  const dia = DIAS[new Date(y, m - 1, d).getDay()];
  return `${dia} ${d} ${MESES[m - 1]}`;
}

export function fechaLarga(s: string | null | undefined): string {
  if (!s) return '';
  const { y, m, d } = partes(s);
  const dia = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][new Date(y, m - 1, d).getDay()];
  const mes = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'][m - 1];
  return `${dia} ${d} de ${mes}`;
}

/** "Hoy 9:41 p. m." / "ayer" / "jue 22 oct" */
export function cuandoRelativo(s: string | null | undefined, hoy: string): string {
  if (!s) return '';
  const dia = s.slice(0, 10);
  if (dia === hoy) return `Hoy ${hora(s)}`;
  return `${fechaCorta(s)} · ${hora(s)}`;
}

export function inicial(nombre: string): string {
  const t = (nombre || '?').trim();
  const m = t.match(/[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/);
  return (m ? m[0] : '?').toUpperCase();
}

/** Color estable por nombre (5 combinaciones de la paleta). */
export function claseColor(nombre: string): string {
  let h = 0;
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0;
  return 'tono-' + (h % 5);
}

/** Número peruano → formato internacional para WhatsApp (51 + 9 dígitos). */
export function telefonoWa(tel: string | null | undefined): string | null {
  if (!tel) return null;
  const d = tel.replace(/\D/g, '');
  if (d.length === 9) return '51' + d;
  if (d.length >= 10 && d.length <= 15) return d;
  return null;
}

export const enlaceWhatsApp = (tel: string | null | undefined, texto: string): string | null => {
  const n = telefonoWa(tel);
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : null;
};

/** Convierte lo que escribe la señora ("2,5", " 3.50 ") en número; null si no es válido. */
export function aNumero(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  const t = v.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Mensaje legible para cualquier error que salga de una petición. */
export function mensajeError(e: unknown, porDefecto = 'Algo salió mal. Inténtalo de nuevo.'): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message || porDefecto;
  }
  return porDefecto;
}
