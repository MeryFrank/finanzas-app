// Resumen: las cifras del mes más reciente con datos, calculadas con las mismas funciones que el resto de pantallas.
import { defaultPeriod, expenseSummary, incomeSummary, pendingMovements, MONTHS_FULL } from './analysis.js';
import { savingsSeries, cuadre } from './savings.js';
import { portfolioTotals, investedInMonth } from './portfolio.js';
import { realParams, project, dateOf } from './independence.js';
import { fundPosition } from './csv/revolutFund.js';

/** @param {import('./store.js').AppData} data @param {string} nowIso */
export function summarize(data, nowIso) {
  const { year, month } = defaultPeriod(data, nowIso);
  const sel = { year, month, per: 'm' };
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  const ahorroCuenta = data.fundEvents.length ? fundPosition(data.fundEvents).valueEurCents : 0;
  const invertido = portfolioTotals(data).value;
  const inc = incomeSummary(data, sel);
  const exp = expenseSummary(data, sel);
  const ser = savingsSeries(data, year)[month];

  // aviso de cuadre: el primer mes que no cuadra (más de 1 €) o, si no, el acumulado
  const cq = cuadre(data, year);
  let warn = '';
  const bad = cq.rows.find((r) => r.diff !== null && Math.abs(r.diff) >= 100);
  if (bad) warn = `${MONTHS_FULL[bad.m]} no cuadra (diferencia de ${Math.round(bad.diff / 100)} €).`;
  else if (cq.total && Math.abs(cq.total.diff) >= 100) warn = `El acumulado no cuadra (diferencia de ${Math.round(cq.total.diff / 100)} €).`;

  // independencia
  const p = realParams(data, new Date(nowIso).getFullYear());
  let indep = { needAge: p.age === null, date: null, years: null };
  if (p.age !== null) {
    const r = project(p);
    if (r.reached !== null) { const d = dateOf(new Date(nowIso), r.reached); indep = { needAge: false, date: d, years: r.reached / 12 }; }
    else indep = { needAge: false, date: null, years: null };
  }
  return {
    year, month, patrimonio: ahorroCuenta + invertido, ahorroCuenta, invertido,
    ingresos: inc.total, ingresosObj: inc.budgetTotal, gasto: exp.total, presupuesto: exp.budgetTotal,
    ahorrado: ser.has ? ser.net : 0, ahorroObj: data.savingsTarget > 0 ? data.savingsTarget * 100 : 0,
    invertidoMes: investedInMonth(data, key), invertidoObj: data.portfolioSettings.monthlyEur > 0 ? data.portfolioSettings.monthlyEur * 100 : 0,
    pendientes: pendingMovements(data).length, warn, indep
  };
}
