// Resumen: patrimonio, ingresos, gasto, ahorrado, invertido, independencia y avisos del mes.
import { eur, infoBtn, infoSheet } from './ui.js';
import { summarize } from '../core/summary.js';
import { MONTHS_FULL, MONTHS_SHORT } from '../core/analysis.js';
import { gastosState } from './gastos.js';

export const RESUMEN_INFO = {
  patrimonio: { t: 'Patrimonio neto', what: 'Todo lo que tienes: el dinero de tu cuenta remunerada y lo que tienes invertido.', how: 'Ahorro en cuenta + valor actual de la inversión. Las deudas pendientes, como la tarjeta de crédito antes de pagarla, no se restan todavía.' },
  ingresos: { t: 'Ingresos este mes', what: 'Todo lo que ha entrado este mes: nómina, transferencias y reembolsos. Si no has puesto objetivo, sale "sin objetivo"; puedes crear uno en Ingresos.', how: 'Suma de los movimientos clasificados como ingreso este mes.' },
  gasto: { t: 'Gasto del mes', what: 'Todo lo que has gastado este mes, comparado con tu presupuesto.', how: 'Suma de los gastos del mes por categoría. No cuenta los traspasos entre tus cuentas ni lo que inviertes.' },
  ahorro: { t: 'Ahorrado este mes', what: 'Lo que has dejado este mes en tu cuenta remunerada. No suma a la independencia financiera. Si no has puesto objetivo, sale "sin objetivo"; puedes crear uno en Ahorro.', how: 'Lo que entra en el fondo durante el mes menos lo que sale.' },
  invertido: { t: 'Invertido este mes', what: 'Dinero que has aportado este mes a tu cartera (fondos, ETF o acciones). Es el que construye tu independencia financiera.', how: 'Suma de las compras del mes en la cartera, comparada con tu aportación mensual de Datos.' },
  indep: { t: 'Independencia financiera', what: 'El momento en que tu inversión es suficiente para cubrir lo que necesitas retirar cada mes, sin depender de un sueldo.', how: 'Se proyecta tu inversión con tu aportación mensual y la rentabilidad real, y se compara con el capital necesario. Solo cuenta lo invertido, no el ahorro en cuenta.' }
};
const comma = (n) => String(n).replace('.', ',');
const card = (href, act, label, inner) => `<a class="card k kcard" href="${href}" ${act ? `data-act="${act}"` : ''} aria-label="${label}">${inner}</a>`;

export function renderResumen(ctx) {
  const st = ctx.ui.resumen || (ctx.ui.resumen = { info: null });
  const s = summarize(ctx.session.data, ctx.nowIso);
  const hasData = s.patrimonio || s.ingresos || s.gasto || s.invertidoMes;
  const wA = s.patrimonio > 0 ? Math.round(s.ahorroCuenta / s.patrimonio * 100) : 0;
  const gPct = s.presupuesto > 0 ? Math.min(100, Math.round(s.gasto / s.presupuesto * 100)) : 0;
  const gDiff = s.presupuesto - s.gasto;
  const iPct = s.invertidoObj > 0 ? Math.min(100, Math.round(s.invertidoMes / s.invertidoObj * 100)) : 0;
  const note = (v, obj) => (obj ? (v >= obj ? `*objetivo de ${eur(obj)} · cumplido` : `*objetivo de ${eur(obj)} · te faltan ${eur(obj - v)}`) : '*sin objetivo por ahora');
  const info = (k, l) => infoBtn(k, l);
  const ind = s.indep;
  const indepDate = ind.needAge ? 'Indica tu edad' : ind.date ? `${MONTHS_SHORT[ind.date.month]} ${ind.date.year}` : 'No alcanzable';
  const indepSub = ind.needAge ? 'Hace falta para calcular la independencia' : ind.years != null ? `Faltan ${comma(ind.years.toFixed(1))} años` : 'Con los datos actuales no se alcanza';

  const html = !hasData ? `<section class="card"><p>Todavía no hay datos.</p><p class="note">*importa tus CSV en Datos y aquí verás el resumen del mes</p></section>` : `
${s.warn ? `<a class="banner warnb" href="#/ahorro"><span><strong>Las cuentas no cuadran.</strong> ${s.warn}</span><span aria-hidden="true">→</span></a>` : ''}
<section class="card stack-sm"><div class="card-head"><span class="kt">Patrimonio neto${info('patrimonio', 'Qué es el patrimonio neto')}</span></div><div class="big">${eur(s.patrimonio)}</div>
  <div class="bar"><span style="flex:none;width:${wA}%;background:#2c4b7a"></span><span style="flex:none;width:${100 - wA}%;background:#2e8a47"></span></div>
  <div class="legend"><span><i style="background:#2c4b7a"></i>Ahorro en cuenta ${eur(s.ahorroCuenta)}</span><span><i style="background:#2e8a47"></i>Inversión ${eur(s.invertido)}</span></div></section>
<div class="rel">${card('#/ingresos', 'go-per', 'Ver ingresos', `<span class="kt">Ingresos este mes</span><span class="kv">${eur(s.ingresos)}</span><span class="note" style="color:${s.ingresosObj && s.ingresos >= s.ingresosObj ? '#047857' : 'inherit'}">${note(s.ingresos, s.ingresosObj)}</span>`)}${info('ingresos', 'Qué son los ingresos del mes')}</div>
<div class="rel">${card('#/gastos', 'go-per', 'Ver gastos', `<div class="card-head"><span class="kt">Gasto del mes</span><span class="note" style="margin-right:36px">${s.presupuesto ? 'Presupuesto ' + eur(s.presupuesto) : 'Sin presupuesto'}</span></div><span class="kv">${eur(s.gasto)}</span>${s.presupuesto ? `<div class="bar"><span style="flex:none;width:${gPct}%;background:${s.gasto > s.presupuesto ? '#d03e27' : '#14b8a6'}"></span></div><span class="note">${gDiff >= 0 ? `*${gPct} % del presupuesto · te quedan ${eur(gDiff)}` : `*te has pasado ${eur(-gDiff)} del presupuesto`}</span>` : '<span class="note">*sin presupuesto por ahora</span>'}`)}${info('gasto', 'Qué es el gasto del mes')}</div>
<div class="kpi2">
  <div class="rel">${card('#/ahorro', '', 'Ver ahorro', `<span class="kt">Ahorrado este mes</span><span class="kv">${eur(s.ahorrado)}</span><span class="note" style="color:${s.ahorroObj && s.ahorrado >= s.ahorroObj ? '#047857' : 'inherit'}">${note(s.ahorrado, s.ahorroObj)}</span>`)}${info('ahorro', 'Qué es lo ahorrado este mes')}</div>
  <div class="rel">${card('#/cartera', '', 'Ver cartera', `<span class="kt">Invertido este mes</span><span class="kv">${eur(s.invertidoMes)}</span>${s.invertidoObj ? `<div class="bar"><span style="flex:none;width:${iPct}%;background:#2e8a47"></span></div><span class="note">Objetivo ${eur(s.invertidoObj)} · ${s.invertidoMes >= s.invertidoObj ? 'cumplido' : 'te faltan ' + eur(s.invertidoObj - s.invertidoMes)}</span>` : '<span class="note">*sin objetivo: indica tu aportación mensual en Datos</span>'}`)}${info('invertido', 'Qué es lo invertido este mes')}</div>
</div>
<a class="meta-hero" href="#/meta" style="${ind.date ? 'background:linear-gradient(135deg,#047857,#0f766e);color:#fff' : 'background:#b9341f;color:#fff'};text-decoration:none"><span class="mh-l" style="justify-content:space-between"><span>Independencia financiera</span><span>Ver →</span></span><span class="mh-d">${indepDate}</span><span style="font-size:13px;opacity:.9">${indepSub}</span></a>
${s.pendientes ? `<a class="banner" href="#/gastos/clasificar"><span>Clasificación pendiente · <strong>${s.pendientes} por revisar</strong></span><span aria-hidden="true">→</span></a>` : ''}`;
  return { below: hasData ? undefined : undefined, above: `${MONTHS_FULL[s.month]} ${s.year}`, html, sheet: st.info ? infoSheet(RESUMEN_INFO[st.info]) : '' };
}

export function actResumen(name, el, ctx) {
  const st = ctx.ui.resumen || (ctx.ui.resumen = { info: null });
  if (name === 'info') st.info = el.dataset.key;
  else if (name === 'close-sheet') st.info = null;
  else if (name === 'go-per') { const s = summarize(ctx.session.data, ctx.nowIso); const g = gastosState(ctx); g.year = s.year; g.month = s.month; g.per = 'm'; }
  else return false;
  return true;
}
