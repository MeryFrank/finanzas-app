import { columnIndex, norm } from './detect.js';
import { parseAmount, parseCents } from '../money.js';

const cell = (row, i) => (i == null || i < 0 ? '' : String(row[i] ?? '').trim());
const DMY = /^(\d{2})-(\d{2})-(\d{4})$/;
/** dd-mm-aaaa -> AAAA-MM-DD (o null) */
export const dmyToIso = (s) => { const m = String(s).match(DMY); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
const addDays = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

/**
 * @typedef {Object} Position
 * @property {string} isin identificador estable (el nombre llega truncado)
 * @property {string} name
 * @property {number} quantityE4 participaciones x 10.000
 * @property {number|null} closePriceE4 precio de cierre en divisa local x 10.000
 * @property {string} currency divisa del precio
 * @property {number} valueEurCents valor en euros
 *
 * @typedef {Object} Trade
 * @property {string} key clave de duplicado (Order ID)
 * @property {string} date AAAA-MM-DD
 * @property {string} isin
 * @property {string} name
 * @property {'compra'|'venta'} side
 * @property {number} quantityE4 siempre positivo
 * @property {number|null} priceE4 precio en divisa local x 10.000
 * @property {string} currency
 * @property {number} totalEurCents importe total en euros, positivo, con comisiones y cambio de divisa
 * @property {number} feesCents comisiones + coste de cambio de divisa, positivo
 *
 * @typedef {'dividendo'|'retencion'|'interes'|'comision'|'promocion'|'aportacion'|'retirada'|'otro'} EventType
 * @typedef {Object} InvestmentEvent  rendimiento de la inversión: nunca ingreso ni gasto del día a día
 * @property {string} key
 * @property {string} date
 * @property {EventType} type
 * @property {string} isin '' si no aplica
 * @property {string} product
 * @property {string} currency
 * @property {number} amountMinor importe con signo en la divisa original (centésimas)
 * @property {number|null} amountEurCents con signo; null si no se pudo convertir
 * @property {string} rawDescription
 */

/**
 * DEGIRO - Portfolio. Cabecera: Product, Symbol/ISIN, Amount, Closing, Local value, (importe local), Value in EUR.
 * La fila sin ISIN es el efectivo.
 * @param {string[][]} rows
 * @returns {{positions: Position[], cashCents: number|null, skipped: {invalid:number}}}
 */
export function parseDegiroPortfolio(rows) {
  const ix = columnIndex(rows[0]);
  const lv = ix['local value'];
  const positions = [];
  let cashCents = null;
  let invalid = 0;
  for (const row of rows.slice(1)) {
    const name = cell(row, ix.product);
    const isin = cell(row, ix['symbol/isin']);
    const eur = parseCents(cell(row, ix['value in eur']));
    if (!name || eur === null) { invalid++; continue; }
    if (!isin) { cashCents = (cashCents ?? 0) + eur; continue; }
    positions.push({
      isin,
      name,
      quantityE4: parseAmount(cell(row, ix.amount), 4) ?? 0,
      closePriceE4: parseAmount(cell(row, ix.closing), 4),
      currency: (cell(row, lv) || 'EUR').toUpperCase(),
      valueEurCents: eur
    });
  }
  return { positions, cashCents, skipped: { invalid } };
}

/**
 * DEGIRO - Transactions. Las columnas sin nombre son la divisa que sigue a Price y a Local value.
 * Compra = cantidad positiva y total negativo. La venta se asume con cantidad negativa (sin comprobar: por ahora no habrá ventas).
 * @param {string[][]} rows
 * @returns {{trades: Trade[], skipped: {invalid:number}}}
 */
export function parseDegiroTransactions(rows) {
  const ix = columnIndex(rows[0]);
  const feeCol = ix['transaction and/or third party fees eur'];
  const trades = [];
  let invalid = 0;
  for (const row of rows.slice(1)) {
    const date = dmyToIso(cell(row, ix.date));
    const qty = parseAmount(cell(row, ix.quantity), 4);
    const total = parseCents(cell(row, ix['total eur']));
    const orderId = cell(row, ix['order id']);
    if (!date || qty === null || total === null || !orderId) { invalid++; continue; }
    const fx = parseCents(cell(row, ix['autofx fee'])) ?? 0;
    const fees = parseCents(cell(row, feeCol)) ?? 0;
    trades.push({
      key: `degiro-trade|${orderId}`,
      date,
      isin: cell(row, ix.isin),
      name: cell(row, ix.product),
      side: qty < 0 ? 'venta' : 'compra',
      quantityE4: Math.abs(qty),
      priceE4: parseAmount(cell(row, ix.price), 4),
      currency: (cell(row, ix.price + 1) || 'EUR').toUpperCase(),
      totalEurCents: Math.abs(total),
      feesCents: Math.abs(fx) + Math.abs(fees)
    });
  }
  return { trades, skipped: { invalid } };
}

/**
 * DEGIRO - Estado de cuenta. Cabecera: Date, Time, Value date, Product, ISIN, Description, FX, Change, (importe), Balance, (saldo), Order Id.
 * Solo se extrae el rendimiento de la inversión: dividendos, retenciones, intereses, comisiones, promociones y aportaciones.
 * Se ignoran el cambio de divisa, los movimientos con el fondo monetario, las compras (ya están en Transactions) y las comisiones de cada compra
 * (ya incluidas en el total de la compra).
 * @param {string[][]} rows
 * @returns {{events: InvestmentEvent[], skipped: {internal:number, invalid:number}}}
 */
export function parseDegiroStatement(rows) {
  const ix = columnIndex(rows[0]);
  const chg = ix.change;
  const parsed = [];
  let invalid = 0;
  for (const row of rows.slice(1)) {
    const date = dmyToIso(cell(row, ix.date));
    if (!date) { invalid++; continue; }
    parsed.push({
      row,
      date,
      time: cell(row, ix.time),
      desc: cell(row, ix.description),
      d: norm(cell(row, ix.description)),
      currency: (cell(row, chg) || '').toUpperCase(),
      amount: parseCents(cell(row, chg + 1)),
      fx: parseAmount(cell(row, ix.fx), 4),
      orderId: cell(row, ix['order id'])
    });
  }
  // Tipos de cambio por divisa y fecha (unidades de divisa por 1 EUR, x 10.000), de las filas "FX Debit/Credit" en divisa extranjera.
  const rates = parsed.filter((p) => /^fx (debit|credit)$/.test(p.d) && p.fx && p.currency !== 'EUR');
  const toEur = (p) => {
    if (p.currency === 'EUR') return p.amount;
    for (let k = 0; k <= 3; k++) {
      const day = addDays(p.date, k);
      const r = rates.find((x) => x.currency === p.currency && x.date === day);
      if (r) { const v = Math.round(Math.abs(p.amount) / (r.fx / 10000)); return p.amount < 0 ? -v : v; }
    }
    return null;
  };
  const events = [];
  let internal = 0;
  const seen = new Map();
  for (const p of parsed) {
    if (p.amount === null) { internal++; continue; } // traspasos con el importe dentro del texto
    let type = null;
    if (p.d === 'dividend') type = 'dividendo';
    else if (p.d === 'dividend tax') type = 'retencion';
    else if (/interest/.test(p.d)) type = 'interes';
    else if (/exchange connection fee/.test(p.d)) type = 'comision';
    else if (/rebate|promotion/.test(p.d)) type = 'promocion';
    else if (/deposit/.test(p.d)) type = 'aportacion';
    else if (/withdraw/.test(p.d)) type = 'retirada';
    else if (/^fx (debit|credit)$|cash sweep|^transfer (to|from) |^buy |^sell |transaction and\/or third party fees/.test(p.d)) { internal++; continue; }
    else type = 'otro';
    const isin = cell(p.row, ix.isin);
    const base = ['degiro-event', p.date, p.time, p.desc, isin, p.currency, p.amount, cell(p.row, ix.balance + 1)].join('|');
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    events.push({
      key: n > 1 ? `${base}#${n}` : base,
      date: p.date,
      type,
      isin,
      product: cell(p.row, ix.product),
      currency: p.currency || 'EUR',
      amountMinor: p.amount,
      amountEurCents: toEur(p),
      rawDescription: p.desc
    });
  }
  return { events, skipped: { internal, invalid } };
}

/** Rendimiento neto en euros de una lista de eventos (dividendos + retenciones + intereses + comisiones + promociones). */
export function netReturnCents(events) {
  return events
    .filter((e) => ['dividendo', 'retencion', 'interes', 'comision', 'promocion'].includes(e.type))
    .reduce((a, e) => a + (e.amountEurCents ?? 0), 0);
}
