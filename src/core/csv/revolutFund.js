import { columnIndex, norm } from './detect.js';
import { parseAmount } from '../money.js';

const cell = (row, i) => (i == null ? '' : String(row[i] ?? '').trim());

// Meses abreviados tal como salen en el extracto (en español, con "sept" de cuatro letras) y sus equivalentes en inglés.
const MONTHS = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7, ago: 8, aug: 8,
  sep: 9, sept: 9, oct: 10, nov: 11, dic: 12, dec: 12
};

/**
 * "27 oct 2026, 2:25:35" -> { date: '2026-10-27', time: '02:25:35' }
 * @param {string} text
 */
export function parseFundDate(text) {
  const m = String(text).trim().match(/^(\d{1,2})\s+([a-zA-Záéíóú]+)\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const mon = MONTHS[norm(m[2])];
  if (!mon) return null;
  const p = (n) => String(n).padStart(2, '0');
  return { date: `${m[3]}-${p(mon)}-${p(m[1])}`, time: `${p(m[4])}:${m[5]}:${m[6] || '00'}` };
}

/**
 * @typedef {'compra'|'venta'|'rendimiento'|'comision'|'rendimiento-reinvertido'|'rendimiento-retirado'|'otro'} FundEventType
 * @typedef {Object} FundEvent  fondo monetario de Revolut: es ahorro/inversión, nunca gasto ni ingreso
 * @property {string} key
 * @property {string} date AAAA-MM-DD
 * @property {string} time HH:MM:SS
 * @property {FundEventType} type
 * @property {number} valueE4 importe en euros x 10.000, con el signo del extracto
 * @property {number|null} priceE4 precio por participación x 10.000 (solo compras y ventas)
 * @property {number|null} sharesE4 participaciones x 10.000, positivas (solo compras y ventas)
 * @property {string} rawDescription
 */

/**
 * Revolut - Fondo monetario. Cabecera: Date, Description, "Value, EUR", Price per share, Quantity of shares.
 * Fecha con mes abreviado en español, importe con coma decimal y entre comillas, precio con punto.
 * @param {string[][]} rows
 * @returns {{events: FundEvent[], skipped: {invalid:number}}}
 */
export function parseRevolutFund(rows) {
  const ix = columnIndex(rows[0]);
  const events = [];
  const seen = new Map();
  let invalid = 0;
  for (const row of rows.slice(1)) {
    const when = parseFundDate(cell(row, ix.date));
    const value = parseAmount(cell(row, ix['value, eur']), 4);
    if (!when || value === null) { invalid++; continue; }
    const desc = cell(row, ix.description);
    const d = norm(desc);
    let type = 'otro';
    if (/^buy\b/.test(d)) type = 'compra';
    else if (/^sell\b/.test(d)) type = 'venta';
    else if (/^return paid\b/.test(d)) type = 'rendimiento';
    else if (/^service fee\b/.test(d)) type = 'comision';
    else if (/^return reinvested\b/.test(d)) type = 'rendimiento-reinvertido';
    else if (/^return withdrawn\b/.test(d)) type = 'rendimiento-retirado';
    const shares = parseAmount(cell(row, ix['quantity of shares']), 4);
    const base = ['revolut-fund', when.date, when.time, desc, cell(row, ix['value, eur'])].join('|');
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    events.push({
      key: n > 1 ? `${base}#${n}` : base,
      date: when.date,
      time: when.time,
      type,
      valueE4: value,
      priceE4: parseAmount(cell(row, ix['price per share']), 4),
      sharesE4: shares === null ? null : Math.abs(shares),
      rawDescription: desc
    });
  }
  return { events, skipped: { invalid } };
}

const e4ToCents = (v) => Math.sign(v) * Math.round(Math.abs(v) / 100);

/**
 * Posición actual: participaciones = compras - ventas, valoradas al último precio conocido.
 * (No se suma el rendimiento pendiente: el saldo de ahorro es el capital en participaciones.)
 * @param {FundEvent[]} events
 * @returns {{sharesE4:number, lastPriceE4:number|null, valueEurCents:number}}
 */
export function fundPosition(events) {
  let shares = 0;
  let last = null;
  for (const e of events) {
    if (e.type === 'compra') shares += e.sharesE4 ?? 0;
    else if (e.type === 'venta') shares -= e.sharesE4 ?? 0;
    else continue;
    if (e.priceE4 != null && (!last || `${e.date} ${e.time}` > last.at)) last = { at: `${e.date} ${e.time}`, price: e.priceE4 };
  }
  const price = last ? last.price : 10000;
  return { sharesE4: shares, lastPriceE4: last ? last.price : null, valueEurCents: e4ToCents(Math.round((shares * price) / 10000)) };
}

/**
 * Rendimiento de la inversión por mes (AAAA-MM), en céntimos: rendimiento pagado - comisión de servicio.
 * Reinvertir o retirar el rendimiento es mover dinero, no rendimiento nuevo.
 * @param {FundEvent[]} events
 * @returns {Record<string, {returnCents:number, feeCents:number, netCents:number}>}
 */
export function fundReturnByMonth(events) {
  /** @type {Record<string,{r:number,f:number}>} */
  const acc = {};
  for (const e of events) {
    if (e.type !== 'rendimiento' && e.type !== 'comision') continue;
    const k = e.date.slice(0, 7);
    acc[k] ||= { r: 0, f: 0 };
    if (e.type === 'rendimiento') acc[k].r += e.valueE4; else acc[k].f += e.valueE4;
  }
  const out = {};
  for (const [k, v] of Object.entries(acc)) out[k] = { returnCents: e4ToCents(v.r), feeCents: e4ToCents(v.f), netCents: e4ToCents(v.r + v.f) };
  return out;
}
