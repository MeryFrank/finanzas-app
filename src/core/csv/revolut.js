import { columnIndex, norm } from './detect.js';
import { parseCents } from '../money.js';

const ISO_DATE = /^(\d{4}-\d{2}-\d{2})/;
const cell = (row, i) => (i == null ? '' : String(row[i] ?? '').trim());

/** Añade sufijo #n a claves repetidas dentro del mismo archivo. */
function uniqueKeys(movements) {
  const seen = new Map();
  for (const m of movements) {
    const n = (seen.get(m.key) || 0) + 1;
    seen.set(m.key, n);
    if (n > 1) m.key = `${m.key}#${n}`;
  }
}

/**
 * Revolut - Tarjeta de crédito: Type, Started Date, Completed Date, Description, Amount, Fee, Balance.
 * @param {string[][]} rows con la cabecera en la primera fila
 * @returns {{movements: import('../model.js').Movement[], skipped: {pending:number, invalid:number}}}
 */
export function parseRevolutCard(rows) {
  const ix = columnIndex(rows[0]);
  const skipped = { pending: 0, invalid: 0 };
  const movements = [];
  for (const row of rows.slice(1)) {
    const start = cell(row, ix['started date']);
    const end = cell(row, ix['completed date']);
    const amount = parseCents(cell(row, ix['amount']));
    const fee = parseCents(cell(row, ix['fee'])) ?? 0;
    const date = (start.match(ISO_DATE) || [])[1];
    if (!date || amount === null) { skipped.invalid++; continue; }
    if (!end) { skipped.pending++; continue; }
    const type = cell(row, ix.type);
    const description = cell(row, ix.description);
    const net = amount - fee;
    let kind = 'por-revisar';
    if (net === 0) kind = 'ignorar';
    else if (/^card_payment$/i.test(type)) kind = net < 0 ? 'gasto' : 'devolucion';
    else if (/^transfer$/i.test(type) && /^to [a-z]{3}$/i.test(description)) kind = 'traspaso'; // pago de la tarjeta desde la cuenta
    movements.push({
      key: ['revolut-card', start, end, description, cell(row, ix.amount), cell(row, ix.balance)].join('|'),
      source: 'revolut-card',
      date,
      description,
      amountCents: net,
      balanceCents: parseCents(cell(row, ix.balance)),
      currency: 'EUR',
      kind,
      categoryId: null,
      rawType: type
    });
  }
  uniqueKeys(movements);
  return { movements, skipped };
}

/**
 * Revolut - Cuenta bancaria (cabecera en español):
 * Tipo, Producto, Fecha de inicio, Fecha de finalización, Descripción, Importe, Comisión, Divisa, State, Saldo.
 * @param {string[][]} rows
 */
export function parseRevolutAccount(rows) {
  const ix = columnIndex(rows[0]);
  const skipped = { pending: 0, invalid: 0 };
  const movements = [];
  for (const row of rows.slice(1)) {
    const start = cell(row, ix['fecha de inicio']);
    const amount = parseCents(cell(row, ix.importe));
    const fee = parseCents(cell(row, ix.comision)) ?? 0;
    const date = (start.match(ISO_DATE) || [])[1];
    if (!date || amount === null) { skipped.invalid++; continue; }
    if (!/^(completado|completed)$/i.test(cell(row, ix.state))) { skipped.pending++; continue; }
    const type = cell(row, ix.tipo);
    const description = cell(row, ix.descripcion);
    const currency = (cell(row, ix.divisa) || 'EUR').toUpperCase();
    const net = amount - fee;
    const t = norm(type);
    const d = norm(description);
    let kind = 'por-revisar';
    let categoryId = null;
    if (net === 0) kind = 'ignorar';
    else if (currency !== 'EUR') kind = 'por-revisar'; // no se puede sumar con euros
    else if (t === 'recargas') kind = /^pago de |apple pay|recarga/.test(d) ? 'traspaso' : 'por-revisar';
    else if (t === 'transferir') {
      if (/^to [a-z]{3}$/.test(d)) kind = 'traspaso'; // pago de la tarjeta de crédito
      else if (/fondos? monetarios?/.test(d)) kind = 'ahorro-inversion';
      else if (/^transferencia (a|de) /.test(d)) kind = 'reembolso-compartido';
    } else if (t === 'pago con tarjeta' || t === 'pago de revolut') kind = net < 0 ? 'gasto' : 'por-revisar';
    else if (t === 'reembolso de tarjeta') kind = 'devolucion';
    else if (t === 'cobro') { kind = 'gasto'; categoryId = 'comisiones'; }
    movements.push({
      key: ['revolut-account', start, description, cell(row, ix.importe), cell(row, ix.saldo)].join('|'),
      source: 'revolut-account',
      date,
      description,
      amountCents: net,
      balanceCents: parseCents(cell(row, ix.saldo)),
      currency,
      kind,
      categoryId,
      rawType: type
    });
  }
  uniqueKeys(movements);
  return { movements, skipped };
}
