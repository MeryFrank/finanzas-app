// Textos en español para fechas y la línea "actualizado el ...".
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** '2026-10-27' o instante ISO -> '27 oct' (con año si no es el actual) */
export function shortDate(value, nowIso) {
  if (!value) return '';
  const d = String(value).length > 10 ? new Date(value) : new Date(value + 'T12:00:00');
  const now = new Date(nowIso);
  const y = d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MESES[d.getMonth()]}${y}`;
}

/**
 * @param {ReturnType<import('./store.js').freshness>} f
 * @param {string} nowIso
 * @returns {{text:string, stale:boolean}}
 */
export function freshnessText(f, nowIso) {
  if (!f.updatedAt) return { text: '*sin datos todavía · importa un CSV en Datos', stale: false };
  let text = `*actualizado el ${shortDate(f.updatedAt, nowIso)}`;
  if (f.lastDataDate) text += ` · último dato ${shortDate(f.lastDataDate, nowIso)}`;
  if (f.stale) text += ' · hay datos sin actualizar';
  return { text, stale: f.stale };
}

/** Texto de resultado de una importación. */
export function importMessage(r) {
  if (!r.ok) return `${r.file}: ${r.error}`;
  if (r.format === 'degiro-portfolio') return `${r.file}: ${r.label} · ${r.added} posiciones actualizadas`;
  return `${r.file}: ${r.label} · ${r.added} nuevos, ${r.already} ya estaban`;
}
