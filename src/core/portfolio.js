// Cartera: posiciones con precios, crecimiento frente a lo aportado, rentabilidad anualizada (Dietz modificado) y peso por tipo de activo.
// Lógica pura, importes en céntimos. El valor histórico no se puede reconstruir (no hay precios pasados): se guarda una foto en cada
// importación de la cartera o cambio de precios, y el gráfico se va llenando con el uso. Lo aportado sí sale de las compras.

/** Tipos de activo y a qué clase cuentan. */
export const ASSET_TYPES = [
  ['Acción', 'variable', 'renta variable'], ['ETF o fondo indexado', 'variable', 'renta variable'],
  ['Bono', 'fija', 'renta fija'], ['Depósito', 'fija', 'renta fija'], ['Fondo híbrido', 'hibrido', 'híbrido']
];
export const CLASS_NAME = { fija: 'Renta fija', variable: 'Renta variable', hibrido: 'Híbrido' };
export const classOf = (kind) => (ASSET_TYPES.find((t) => t[0] === kind) || [])[1] || 'variable';

const monthKey = (iso) => iso.slice(0, 7);
const monthsBetween = (a, b) => (Number(b.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + Number(b.slice(5, 7)) - Number(a.slice(5, 7));
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const signedTrade = (t) => (t.side === 'compra' ? t.totalEurCents : -t.totalEurCents);

/** Posiciones actuales con el precio a mano si lo hay, el coste de las compras importadas y el crecimiento. */
export function positionsNow(data) {
  const cost = new Map();
  for (const t of data.trades) cost.set(t.isin, (cost.get(t.isin) || 0) + signedTrade(t));
  return data.portfolio.positions.filter((p) => p.isin && p.quantityE4 > 0).map((p) => {
    const shares = p.quantityE4 / 10000;
    const manual = data.prices[p.isin] > 0 ? data.prices[p.isin] : null;
    const valueCents = manual ? Math.round(shares * manual * 100) : p.valueEurCents;
    const costCents = Math.max(0, cost.get(p.isin) || 0);
    return { isin: p.isin, name: p.name, kind: data.assetTypes[p.isin] || null, shares, priceEur: valueCents / 100 / shares, manualPrice: !!manual, valueCents, costCents, growth: costCents > 0 ? valueCents / costCents - 1 : null };
  }).sort((a, b) => b.valueCents - a.valueCents);
}

/** Valor total y ganancia (solo de las posiciones con coste conocido por las compras importadas). */
export function portfolioTotals(data) {
  const pos = positionsNow(data);
  const value = pos.reduce((a, p) => a + p.valueCents, 0);
  const known = pos.filter((p) => p.costCents > 0);
  const cost = known.reduce((a, p) => a + p.costCents, 0);
  const gain = known.reduce((a, p) => a + p.valueCents, 0) - cost;
  return { value, cost, gain, gainPct: cost > 0 ? gain / cost : null, positions: pos.length };
}

/** Activos con posición pero sin tipo elegido. */
export const untypedPositions = (data) => positionsNow(data).filter((p) => !p.kind);

/** Añade (o sustituye, si es la misma fecha) la foto de hoy al historial. Devuelve el historial nuevo. */
export function recordSnapshot(data, date) {
  const positions = positionsNow(data);
  if (!positions.length) return data.portfolioHistory;
  const snap = { date, valueCents: positions.reduce((a, p) => a + p.valueCents, 0), positions: positions.map((p) => ({ isin: p.isin, name: p.name, quantityE4: Math.round(p.shares * 10000), valueCents: p.valueCents })) };
  return [...data.portfolioHistory.filter((h) => h.date !== date), snap].sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Última foto de cada mes (AAAA-MM -> foto). */
export function monthlySnapshots(data) {
  const m = new Map();
  for (const h of data.portfolioHistory) m.set(monthKey(h.date), h);
  return m;
}

/** Aportado acumulado (compras - ventas) hasta una fecha. */
export const aportadoAt = (data, isoDate) => data.trades.filter((t) => t.date <= isoDate).reduce((a, t) => a + signedTrade(t), 0);

const WINDOW = { '1m': 1, '3m': 3, '6m': 6, '12m': 12, acum: Infinity };

/**
 * Valor y aportado por mes en el periodo elegido, y crecimiento neto = (valor final - inicial) - aportaciones del periodo.
 * @param {'1m'|'3m'|'6m'|'12m'|'acum'} per
 */
export function growthChart(data, per) {
  const snaps = monthlySnapshots(data);
  const keys = [...snaps.keys()].sort();
  const firstTrade = data.trades.reduce((a, t) => (!a || t.date < a ? t.date : a), '');
  if (!keys.length) return { months: [], net: null, netPct: null, points: 0 };
  const lastKey = keys[keys.length - 1];
  let startKey = firstTrade && monthKey(firstTrade) < keys[0] ? monthKey(firstTrade) : keys[0];
  const back = WINDOW[per];
  if (Number.isFinite(back) && monthsBetween(startKey, lastKey) > back) {
    const d = new Date(Date.UTC(Number(lastKey.slice(0, 4)), Number(lastKey.slice(5, 7)) - 1 - back, 1));
    startKey = d.toISOString().slice(0, 7);
  }
  const months = [];
  for (let k = startKey; k <= lastKey;) {
    const snap = snaps.get(k);
    const end = `${k}-31`;
    months.push({ key: k, value: snap ? snap.valueCents : null, aportado: aportadoAt(data, end) });
    const d = new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)), 1));
    k = d.toISOString().slice(0, 7);
  }
  const withValue = months.filter((m) => m.value !== null);
  let net = null; let netPct = null;
  if (withValue.length >= 2) {
    const a = withValue[0]; const b = withValue[withValue.length - 1];
    net = (b.value - a.value) - (b.aportado - a.aportado);
    netPct = a.value > 0 ? net / a.value : null;
  }
  return { months, net, netPct, points: withValue.length };
}

/**
 * Rentabilidad anualizada por el método de Dietz modificado. Solo con 12 meses o más entre la primera y la última foto.
 * @returns {{ok:true, annual:number} | {ok:false, months:number}}
 */
export function annualizedReturn(data) {
  const h = data.portfolioHistory;
  if (h.length < 2) return { ok: false, months: h.length ? 1 : 0 };
  const first = h[0]; const last = h[h.length - 1];
  const days = daysBetween(first.date, last.date);
  if (days < 365) return { ok: false, months: monthsBetween(first.date, last.date) + 1 };
  const flows = data.trades.filter((t) => t.date > first.date && t.date <= last.date);
  const F = flows.reduce((a, t) => a + signedTrade(t), 0);
  const W = flows.reduce((a, t) => a + signedTrade(t) * (days - daysBetween(first.date, t.date)) / days, 0);
  const denom = first.valueCents + W;
  if (denom <= 0) return { ok: false, months: monthsBetween(first.date, last.date) + 1 };
  const R = (last.valueCents - first.valueCents - F) / denom;
  return { ok: true, annual: Math.pow(1 + R, 365 / days) - 1 };
}

/** Peso por clase de activo y lo que falta para llegar al objetivo de renta fija sin vender. */
export function allocation(data) {
  const pos = positionsNow(data);
  const total = pos.reduce((a, p) => a + p.valueCents, 0);
  const cls = { fija: 0, variable: 0, hibrido: 0 };
  pos.forEach((p) => { cls[classOf(p.kind)] += p.valueCents; });
  const tgt = (data.portfolioSettings.targetFixedPct || 0) / 100;
  let needCents = 0;
  if (total > 0 && cls.fija / total < tgt && tgt < 1) needCents = Math.round((tgt * total - cls.fija) / (1 - tgt));
  const monthly = data.portfolioSettings.monthlyEur > 0 ? data.portfolioSettings.monthlyEur * 100 : 0;
  return { total, cls, share: total > 0 ? { fija: cls.fija / total, variable: cls.variable / total, hibrido: cls.hibrido / total } : { fija: 0, variable: 0, hibrido: 0 }, targetFixedPct: data.portfolioSettings.targetFixedPct, needCents, months: needCents > 0 && monthly > 0 ? Math.max(1, Math.round(needCents / monthly)) : null };
}

/** Evolución de una posición por mes: participaciones, valor, precio y variación del precio respecto al mes anterior. */
export function positionHistory(data, isin) {
  const rows = [];
  for (const [key, snap] of [...monthlySnapshots(data).entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    const p = snap.positions.find((x) => x.isin === isin);
    if (!p) continue;
    const shares = p.quantityE4 / 10000;
    rows.push({ key, shares, valueCents: p.valueCents, priceEur: shares > 0 ? p.valueCents / 100 / shares : null });
  }
  return rows.map((r, i) => ({ ...r, ret: i > 0 && rows[i - 1].priceEur && r.priceEur ? r.priceEur / rows[i - 1].priceEur - 1 : null }));
}

/** Invertido en un mes (AAAA-MM): compras - ventas de DEGIRO. */
export const investedInMonth = (data, key) => data.trades.filter((t) => t.date.startsWith(key)).reduce((a, t) => a + signedTrade(t), 0);
