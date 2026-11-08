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
  },
  {
    id: 'degiro-portfolio',
    label: 'DEGIRO - Cartera de inversión (posiciones)',
    required: ['product', 'symbol/isin', 'amount', 'closing', 'local value', 'value in eur'],
    forbidden: []
  },
  {
    id: 'degiro-transactions',
    label: 'DEGIRO - Cartera de inversión (compras)',
    required: ['date', 'time', 'product', 'isin', 'quantity', 'price', 'total eur', 'order id'],
    forbidden: []
  },
  {
    id: 'degiro-statement',
    label: 'DEGIRO - Cartera de inversión (estado de cuenta)',
    required: ['date', 'time', 'value date', 'product', 'isin', 'description', 'change', 'balance'],
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
