// Detecta el formato por la cabecera, nunca por el nombre del archivo.
const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();

const FORMATS = [
  {
    id: 'revolut-card',
    label: 'Revolut - Tarjeta de crédito',
    required: ['type', 'started date', 'completed date', 'description', 'amount', 'fee', 'balance'],
    forbidden: ['product']
  },
  {
    id: 'revolut-account',
    label: 'Revolut - Cuenta bancaria',
    required: ['tipo', 'producto', 'fecha de inicio', 'descripcion', 'importe', 'comision', 'divisa', 'state', 'saldo'],
    forbidden: []
  }
];

/**
 * @param {string[]} headerRow
 * @returns {{id:string,label:string}|null}
 */
export function detectFormat(headerRow) {
  const h = headerRow.map(norm);
  for (const f of FORMATS) {
    if (f.required.every((c) => h.includes(c)) && f.forbidden.every((c) => !h.includes(c))) return { id: f.id, label: f.label };
  }
  return null;
}

/** Posiciones de las columnas por nombre (sin acentos ni mayúsculas). */
export function columnIndex(headerRow) {
  const idx = {};
  headerRow.forEach((c, i) => { if (!(norm(c) in idx)) idx[norm(c)] = i; });
  return idx;
}
export { norm };
