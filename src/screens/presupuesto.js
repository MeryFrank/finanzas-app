// Presupuesto mensual por grupo de gasto.
import { esc } from './html.js';
import { eur, infoBtn, infoSheet } from './ui.js';
import { GROUP_STYLE, MONTHS_FULL } from '../core/analysis.js';
import { EXPENSE_GROUPS } from '../core/categories.js';

const INFO = { presupuesto: { t: 'Presupuesto mensual', what: 'Lo máximo que quieres gastar cada mes, repartido por grupos. Los anillos de Gastos comparan lo que gastas con estas cifras. Puedes cambiarlas cuando quieras; se recomienda revisarlas cada 6 meses.', how: 'Presupuesto total = suma de los presupuestos de todos los grupos.' } };

/** "mayo 2027": seis meses después de guardar el presupuesto. */
export function nextReview(savedAtIso) {
  if (!savedAtIso) return null;
  const d = new Date(savedAtIso);
  d.setMonth(d.getMonth() + 6);
  return `${MONTHS_FULL[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
}

/** Texto -> euros enteros no negativos (acepta coma o punto). */
export const parseBudget = (text) => { const v = parseFloat(String(text).replace(',', '.')); return Number.isFinite(v) && v > 0 ? Math.round(v) : 0; };

export function renderPresupuesto(ctx) {
  const data = ctx.session.data;
  const st = ctx.ui.presupuesto || (ctx.ui.presupuesto = { info: false, saved: false });
  const total = Object.keys(EXPENSE_GROUPS).reduce((a, g) => a + (data.budget[g] || 0), 0);
  const review = nextReview(data.budgetSavedAt);
  const rows = Object.entries(EXPENSE_GROUPS).map(([gid, name]) => `<label class="bud-row"><span class="grp-name"><span class="dot" style="background:${GROUP_STYLE[gid].color}"></span>${esc(name)}</span><span class="bud-in"><input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" name="b-${gid}" value="${data.budget[gid] || 0}" aria-label="Presupuesto mensual de ${esc(name)}">€</span></label>`).join('');
  return {
    back: { href: '#/gastos', label: 'Gastos' },
    title: 'Presupuesto mensual',
    below: '*lo que quieres gastar como máximo cada mes',
    html: `
<section class="card stack-sm"><span class="card-title">Presupuesto total del mes${infoBtn('presupuesto', 'Qué es el presupuesto')}</span><span class="big" id="budget-total">${eur(total * 100)}</span><span class="note">Suma de los grupos de abajo</span></section>
<div class="yellow">${review ? `Próxima revisión del presupuesto: <strong>${review}</strong>. Se revisa cada 6 meses y aparece en el proceso mensual de Datos.` : 'Todavía no has guardado un presupuesto. Se recomienda revisarlo cada 6 meses.'}</div>
<form class="card list-card" data-form="budget"><div class="card-title pad">Por grupo</div>${rows}
<button class="btn" type="submit" style="margin:10px 0 6px">Guardar presupuesto</button>
<div class="okmsg center-t" role="status">${st.saved ? 'Presupuesto guardado' : ''}</div></form>`,
    sheet: st.info ? infoSheet(INFO.presupuesto) : ''
  };
}

export function actPresupuesto(name, el, ctx) {
  const st = ctx.ui.presupuesto || (ctx.ui.presupuesto = { info: false, saved: false });
  if (name === 'info') st.info = true;
  else if (name === 'close-sheet') st.info = false;
  else return false;
  return true;
}
