// Objetivo mensual de ingresos (opcional), por grupo.
import { esc } from './html.js';
import { eur, infoBtn, infoSheet } from './ui.js';
import { INCOME_STYLE } from '../core/analysis.js';
import { INCOME_GROUPS } from '../core/categories.js';
import { nextReview } from './presupuesto.js';

const INFO = { t: 'Objetivo mensual de ingresos', what: 'Lo mínimo que quieres ingresar cada mes, por categoría. Es opcional: si dejas una categoría en 0, no tiene objetivo. Los anillos de Ingresos y el Resumen comparan lo que ingresas con estas cifras.', how: 'Objetivo total = suma de los objetivos de las categorías.' };

export function renderObjetivo(ctx) {
  const data = ctx.session.data;
  const st = ctx.ui.objetivo || (ctx.ui.objetivo = { info: false, saved: false });
  const total = Object.keys(INCOME_GROUPS).reduce((a, g) => a + (data.incomeTarget[g] || 0), 0);
  const review = nextReview(data.incomeTargetSavedAt);
  const rows = Object.entries(INCOME_GROUPS).map(([gid, name]) => `<label class="bud-row"><span class="grp-name"><span class="dot" style="background:${INCOME_STYLE[gid].color}"></span>${esc(name)}</span><span class="bud-in"><input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" name="t-${gid}" data-amount value="${data.incomeTarget[gid] || ''}" placeholder="Sin objetivo" aria-label="Objetivo mensual de ${esc(name)}">€</span></label>`).join('');
  return {
    back: { href: '#/ingresos', label: 'Ingresos' },
    title: 'Objetivo mensual',
    below: '*lo que quieres ingresar como mínimo cada mes; es opcional',
    html: `
<section class="card stack-sm"><span class="card-title">Objetivo total del mes${infoBtn('objetivo', 'Qué es el objetivo')}</span><span class="big" id="budget-total">${total > 0 ? eur(total * 100) : 'Sin objetivo'}</span><span class="note">Suma de las categorías de abajo; si todas están vacías, no hay objetivo</span></section>
<div class="yellow">${review ? `Próxima revisión del objetivo: <strong>${review}</strong>. Se revisa cada 6 meses junto con el presupuesto.` : 'Todavía no has guardado un objetivo. Se recomienda revisarlo cada 6 meses junto con el presupuesto.'}</div>
<form class="card list-card" data-form="target"><div class="card-title pad">Por categoría</div>${rows}
<button class="btn" type="submit" style="margin:10px 0 6px">Guardar objetivo</button>
<div class="okmsg center-t" role="status">${st.saved ? 'Objetivo guardado' : ''}</div></form>`,
    sheet: st.info ? infoSheet(INFO) : ''
  };
}

export function actObjetivo(name, el, ctx) {
  const st = ctx.ui.objetivo || (ctx.ui.objetivo = { info: false, saved: false });
  if (name === 'info') st.info = true;
  else if (name === 'close-sheet') st.info = false;
  else return false;
  return true;
}
