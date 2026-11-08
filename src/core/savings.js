// Ahorro: el saldo es el fondo monetario de Revolut (la "cuenta remunerada"); además el cuadre de cuentas del mes.
// Lógica pura, importes en céntimos. Saldo = participaciones x último precio; aportado = compras - ventas; remuneración = el resto.
import { fundPosition } from './csv/revolutFund.js';
import { spendOf, incomeOf, yearOf, monthOf } from './analysis.js';

const e4c = (v) => Math.round(Math.abs(v) / 100);
const pad = (n) => String(n + 1).padStart(2, '0');

/** Aportación neta al fondo de un conjunto de eventos: compras - ventas (céntimos). */
export const netContribution = (events) => events.reduce((a, e) => a + (e.type === 'compra' ? e4c(e.valueE4) : e.type === 'venta' ? -e4c(e.valueE4) : 0), 0);

/** Mes (0-11) y año del último dato del fondo, o null. */
export function lastFundMonth(data) {
  const last = data.fundEvents.reduce((a, e) => (e.date > a ? e.date : a), '');
  return last ? { year: Number(last.slice(0, 4)), month: Number(last.slice(5, 7)) - 1 } : null;
}

/**
 * Saldo, aportado y remuneración al final de cada mes del año; `net` = aportación neta del mes.
 * Los meses posteriores al último dato salen con has=false.
 */
export function savingsSeries(data, year) {
  const last = lastFundMonth(data);
  const ev = data.fundEvents;
  return Array.from({ length: 12 }, (_, m) => {
    const upTo = ev.filter((e) => e.date <= `${year}-${pad(m)}-31`);
    const inMonth = ev.filter((e) => e.date.startsWith(`${year}-${pad(m)}`));
    const has = !!last && (year < last.year || (year === last.year && m <= last.month)) && upTo.length > 0;
    const saldo = has ? fundPosition(upTo).valueEurCents : 0;
    const aportado = has ? netContribution(upTo) : 0;
    return { m, has, saldo, aportado, remun: has ? saldo - aportado : 0, net: netContribution(inMonth) };
  });
}

/** Años con datos del fondo, de menor a mayor. */
export const fundYears = (data) => [...new Set(data.fundEvents.map((e) => Number(e.date.slice(0, 4))))].sort();

/**
 * Cuadre: ingresos - gasto - ahorro - invertido. Debe dar 0; si no, hay dinero sin clasificar o movido sin explicar.
 * Solo salen los meses con actividad. El primer mes con datos no se comprueba (se parte de un saldo inicial).
 * @returns {{rows:{m:number, ingresos:number, gasto:number, ahorro:number, invertido:number, diff:number|null}[], total:{ingresos:number,gasto:number,ahorro:number,invertido:number,diff:number}|null}}
 */
export function cuadre(data, year) {
  const rows = [];
  for (let m = 0; m < 12; m++) {
    const key = `${year}-${pad(m)}`;
    const mov = data.movements.filter((x) => yearOf(x) === year && monthOf(x) === m);
    const ingresos = mov.reduce((a, x) => a + incomeOf(x), 0);
    const gasto = mov.reduce((a, x) => a + spendOf(x), 0);
    const ahorro = netContribution(data.fundEvents.filter((e) => e.date.startsWith(key)));
    const invertido = data.trades.filter((t) => t.date.startsWith(key)).reduce((a, t) => a + (t.side === 'compra' ? t.totalEurCents : -t.totalEurCents), 0);
    if (!(ingresos || gasto || ahorro || invertido)) continue; // mes sin actividad: nada que comprobar
    rows.push({ m, ingresos, gasto, ahorro, invertido, diff: ingresos - gasto - ahorro - invertido });
  }
  // el primer mes con actividad de todos los datos parte de un saldo inicial y no se comprueba
  const firstKey = [...data.movements.filter((x) => spendOf(x) || incomeOf(x)).map((x) => x.date), ...data.fundEvents.filter((e) => e.type === 'compra' || e.type === 'venta').map((e) => e.date), ...data.trades.map((t) => t.date)].map((d) => d.slice(0, 7)).sort()[0];
  if (rows.length && firstKey === `${year}-${pad(rows[0].m)}`) rows[0].diff = null;
  const counted = rows.filter((r) => r.diff !== null);
  const sum = (k) => counted.reduce((a, r) => a + r[k], 0);
  const total = counted.length ? { ingresos: sum('ingresos'), gasto: sum('gasto'), ahorro: sum('ahorro'), invertido: sum('invertido'), diff: sum('diff') } : null;
  return { rows, total };
}
