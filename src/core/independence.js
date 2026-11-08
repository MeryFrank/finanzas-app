// Independencia financiera: capital necesario, tasa de retiro segura y proyección a 40 años. Lógica pura, importes en euros de hoy.
import { portfolioTotals, annualizedReturn } from './portfolio.js';

export const AGE_END = 90;
export const YEARS = 40;
export const DEFAULT_RETURN = 6; // referencia (%) mientras la cartera tenga menos de 12 meses de historial
export const DEFAULT_INDEPENDENCE = { age: null, ageYear: null, retirementMonthly: 1500, taxPct: 15, ipc: 2.5 };

/** Tasa de retiro segura: lo que se puede retirar cada año sin quedarse sin dinero a los 90 años. */
export function safeRate(realReturn, age) {
  const T = Math.max(1, AGE_END - age);
  return Math.abs(realReturn) < 1e-6 ? 1 / T : realReturn / (1 - Math.pow(1 + realReturn, -T));
}

/** Edad actual a partir de la edad guardada y el año en que se escribió; null si no se ha indicado. */
export function currentAge(data, year) {
  const i = data.independence;
  return Number.isFinite(i.age) && Number.isFinite(i.ageYear) ? i.age + (year - i.ageYear) : null;
}

/** Parámetros del escenario real: todo sale de los datos de la app. */
export function realParams(data, year) {
  const ann = annualizedReturn(data);
  return {
    ret: ann.ok ? Math.round(Math.min(12, Math.max(0, ann.annual * 100)) * 10) / 10 : DEFAULT_RETURN,
    retFromData: ann.ok,
    inf: data.independence.ipc,
    inv: data.portfolioSettings.monthlyEur,
    tax: data.independence.taxPct,
    retirada: data.independence.retirementMonthly,
    start: portfolioTotals(data).value / 100,
    age: currentAge(data, year)
  };
}

/**
 * Proyección mes a mes (hasta 60 años) con aportación mensual y rentabilidad real.
 * @param {{ret:number, inf:number, inv:number, tax:number, retirada:number, start:number, age:number}} p porcentajes en %, importes en euros
 * @param {{m:number, a:number}[]} [extras] ingresos puntuales: mes desde hoy e importe
 */
export function project(p, extras = []) {
  const r = (1 + p.ret / 100) / (1 + p.inf / 100) - 1;
  const mr = Math.pow(1 + r, 1 / 12) - 1;
  const w = (m) => safeRate(r, p.age + m / 12);
  const need = (m) => p.retirada * 12 / (1 - p.tax / 100) / w(m);
  let cap = p.start; let reached = null; let capReached = 0;
  const series = []; const needS = [];
  for (let m = 0; m <= 720; m++) {
    for (const e of extras) if (e.m === m) cap += e.a;
    if (m % 12 === 0 && m <= YEARS * 12) { series.push(cap); needS.push(need(m)); }
    if (reached === null && cap >= need(m)) { reached = m; capReached = cap; }
    cap = cap * (1 + mr) + p.inv;
  }
  const net = 1 - p.tax / 100;
  return { r, series, needS, reached, capReached, w, need, maxMonthly: (capital, m) => capital * w(m) * net / 12, base: null };
}

/** Mes y año de hoy + m meses. */
export function dateOf(now, m) {
  const t = now.getMonth() + m;
  return { month: ((t % 12) + 12) % 12, year: now.getFullYear() + Math.floor(t / 12) };
}
