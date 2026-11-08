// Cálculos de Gastos: agrupa los movimientos por periodo, grupo, subcategoría y tipo, y los compara con el presupuesto.
// Lógica pura, sin DOM. Importes en céntimos.
import { EXPENSE_GROUPS, INCOME_GROUPS, INCOME_CATEGORIES, expenseCatalog } from './categories.js';
import { needsReview } from './classify.js';

/** Color y emoji de cada grupo de gasto (igual que la maqueta). */
export const GROUP_STYLE = {
  vivienda: { color: '#ec4899', emoji: '🏠' },
  alimentacion: { color: '#10b981', emoji: '🛒' },
  transporte: { color: '#14b8a6', emoji: '🚆' },
  'ocio-deporte': { color: '#ebb53a', emoji: '🎟️' },
  compras: { color: '#8b5cf6', emoji: '🛍️' },
  suscripciones: { color: '#06b6d4', emoji: '📺' },
  finanzas: { color: '#2c4b7a', emoji: '🏦' },
  otros: { color: '#94a3b8', emoji: '🧾' }
};
export const TIPO_NAME = { F: 'Fijo', V: 'Variable necesario', D: 'Discrecional', '': 'Sin definir' };
export const TIPO_COLOR = { F: '#2c4b7a', V: '#10b981', D: '#ebb53a', '': '#94a3b8' };
export const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const MONTHS_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const yearOf = (m) => Number(m.date.slice(0, 4));
export const monthOf = (m) => Number(m.date.slice(5, 7)) - 1;

/** Meses (0-11) que cubre el periodo: 'm' el mes, '3m' los tres últimos, 'ytd' desde enero. */
export const periodRange = (month, per) => (per === 'ytd' ? [0, month] : per === '3m' ? [Math.max(0, month - 2), month] : [month, month]);

/** Gasto que aporta un movimiento (positivo = gasto; una devolución resta). Los demás tipos no cuentan. */
export const spendOf = (m) => (m.kind === 'gasto' || m.kind === 'devolucion' ? -m.amountCents : 0);

/** Año y mes que se muestran al abrir: los del movimiento más reciente, o los de hoy si no hay. */
export function defaultPeriod(data, nowIso) {
  const latest = data.movements.reduce((a, m) => (m.date > a ? m.date : a), '');
  const d = latest || nowIso.slice(0, 10);
  return { year: Number(d.slice(0, 4)), month: Number(d.slice(5, 7)) - 1 };
}

/** Años con movimientos, de menor a mayor. */
export const yearsWithData = (data) => [...new Set(data.movements.map(yearOf))].sort();

/**
 * @param {import('./store.js').AppData} data
 * @param {{year:number, month:number, per:'m'|'3m'|'ytd'}} sel
 */
export function expenseSummary(data, sel) {
  const catalog = expenseCatalog(data.categories);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const [lo, hi] = periodRange(sel.month, sel.per);
  const nMonths = hi - lo + 1;
  const budget = data.budget || {};
  const sums = new Map(); // id de subcategoría -> céntimos
  const add = (map, id, v) => map.set(id, (map.get(id) || 0) + v);
  for (const m of data.movements) {
    const v = spendOf(m);
    if (!v || yearOf(m) !== sel.year) continue;
    const mo = monthOf(m);
    if (mo < lo || mo > hi) continue;
    add(sums, byId.has(m.categoryId) ? m.categoryId : 'sin-clasificar', v);
  }
  const tipoSums = { F: 0, V: 0, D: 0, '': 0 };
  const groups = Object.keys(EXPENSE_GROUPS).map((gid) => {
    const subs = catalog.filter((c) => c.group === gid).map((c) => ({ id: c.id, name: c.name, tipo: c.tipo, spent: sums.get(c.id) || 0 }));
    const spent = Math.max(0, subs.reduce((a, s) => a + s.spent, 0));
    subs.forEach((s) => { tipoSums[s.tipo] += s.spent; });
    const budgetCents = Math.round((budget[gid] || 0) * 100) * nMonths;
    return { id: gid, name: EXPENSE_GROUPS[gid], ...GROUP_STYLE[gid], spent, budget: budgetCents, over: spent > budgetCents, subs };
  });
  const total = groups.reduce((a, g) => a + g.spent, 0);
  const budgetTotal = groups.reduce((a, g) => a + g.budget, 0);
  let prevTotal = null;
  if (sel.per === 'm' && sel.month > 0) prevTotal = expenseSummary(data, { ...sel, month: sel.month - 1 }).total;
  return { groups, total, budgetTotal, tipoSums, prevTotal, nMonths };
}

/** Movimientos pendientes de clasificar, del más reciente al más antiguo. */
export const pendingMovements = (data) => data.movements.filter(needsReview).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

/** Color y emoji de cada grupo de ingreso (igual que la maqueta). */
export const INCOME_STYLE = { nomina: { color: '#2e8a47', emoji: '💼' }, reembolsos: { color: '#0ea5e9', emoji: '↩️' } };

/** Ingreso que aporta un movimiento (solo los clasificados como ingreso). */
export const incomeOf = (m) => (m.kind === 'ingreso' ? m.amountCents : 0);

/** Grupo de ingreso de un movimiento; si la categoría no se reconoce cuenta como reembolsos. */
export const incomeGroupOf = (m) => { const c = INCOME_CATEGORIES.find((x) => x.id === m.categoryId); return c ? c.group : 'reembolsos'; };

/**
 * Ingresos del periodo por grupo, frente al objetivo opcional.
 * @param {import('./store.js').AppData} data
 * @param {{year:number, month:number, per:'m'|'3m'|'ytd'}} sel
 */
export function incomeSummary(data, sel) {
  const [lo, hi] = periodRange(sel.month, sel.per);
  const nMonths = hi - lo + 1;
  const target = data.incomeTarget || {};
  const sums = {};
  for (const m of data.movements) {
    const v = incomeOf(m);
    if (!v || yearOf(m) !== sel.year || monthOf(m) < lo || monthOf(m) > hi) continue;
    const g = incomeGroupOf(m);
    sums[g] = (sums[g] || 0) + v;
  }
  const groups = Object.keys(INCOME_GROUPS).map((id) => ({ id, name: INCOME_GROUPS[id], ...INCOME_STYLE[id], spent: Math.max(0, sums[id] || 0), budget: Math.round((target[id] || 0) * 100) * nMonths }));
  const total = groups.reduce((a, g) => a + g.spent, 0);
  const budgetTotal = groups.reduce((a, g) => a + g.budget, 0);
  const prevTotal = sel.per === 'm' && sel.month > 0 ? incomeSummary(data, { ...sel, month: sel.month - 1 }).total : null;
  return { groups, total, budgetTotal, prevTotal, nMonths };
}
