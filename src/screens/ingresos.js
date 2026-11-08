// Pantalla Ingresos: anillos por grupo (nómina, reembolsos), objetivo opcional y detalle.
import { esc } from './html.js';
import { eur, infoBtn, infoSheet, periodControls } from './ui.js';
import { gastosState, actGastos, RADII } from './gastos.js';
import { incomeSummary, defaultPeriod, yearsWithData, periodRange, pendingMovements, MONTHS_SHORT, MONTHS_FULL } from '../core/analysis.js';

export const INGRESOS_INFO = {
  anillos: { t: 'Cómo leer los anillos', what: 'Cada anillo es una categoría de ingreso. Si has puesto un objetivo, muestra cuánto del objetivo llevas; si no, qué parte del total representa.', how: 'Ingresos de la categoría ÷ objetivo del periodo (o ÷ ingresos totales si no hay objetivo). En los periodos de 3 meses o Accum. el objetivo se multiplica por los meses del periodo.' },
  objetivo: { t: 'Objetivo de ingresos', what: 'Un objetivo mensual opcional de ingresos, por categoría. Si no has puesto ninguno, aparece "sin objetivo"; puedes crearlo en "Editar objetivo".', how: 'Objetivo mensual × meses del periodo.' }
};

export function renderIngresos(ctx) {
  const st = gastosState(ctx);
  const ui = ctx.ui.ingresos || (ctx.ui.ingresos = { info: null });
  const data = ctx.session.data;
  const sum = incomeSummary(data, st);
  const [lo, hi] = periodRange(st.month, st.per);
  const hasTarget = sum.budgetTotal > 0;
  const periodLabel = st.per === 'm' ? MONTHS_FULL[st.month] : `${MONTHS_SHORT[lo]}–${MONTHS_SHORT[hi]}`;
  const rings = RADII.map((r, i) => {
    const g = sum.groups[i];
    const circ = 2 * Math.PI * r;
    const frac = g ? (g.budget > 0 ? Math.min(g.spent / g.budget, 1) : sum.total > 0 ? g.spent / sum.total : 0) : 0;
    return `<circle cx="110" cy="110" r="${r}" fill="none" stroke="#e6f4ee" stroke-width="7"/>${frac > 0 ? `<circle cx="110" cy="110" r="${r}" fill="none" stroke="${g.color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(frac * circ).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 110 110)"/>` : ''}`;
  }).join('');
  let note = '*sin objetivo por ahora'; let delta = '';
  if (hasTarget) {
    const diff = sum.budgetTotal - sum.total;
    note = `*de ${eur(sum.budgetTotal)} de objetivo`;
    delta = `<span class="delta" style="color:${diff > 0 ? '#b9341f' : '#047857'}">${diff > 0 ? '*te faltan ' + eur(diff) : '*objetivo superado en ' + eur(-diff)}</span>`;
  }
  const prev = sum.prevTotal != null ? `<span class="note">*mes anterior (${MONTHS_SHORT[st.month - 1]}): ${eur(sum.prevTotal)}</span>` : '';
  const rows = sum.groups.map((g) => `<a class="grp-row grp-main" href="#/ingresos/movimientos" data-act="go-mov" data-group="${g.id}"><span class="grp-name"><span class="emoji" style="background:${g.color}2b" aria-hidden="true">${g.emoji}</span>${esc(g.name)}</span><span class="grp-amt" style="color:#355a4f">${g.budget > 0 ? `${Math.round(g.spent / 100)} / ${Math.round(g.budget / 100)} €` : eur(g.spent)}<span class="chev" aria-hidden="true">›</span></span></a>`).join('');
  const pend = pendingMovements(data).length;
  const banner = pend > 0 ? `<a class="banner" href="#/gastos/clasificar"><span>${pend === 1 ? '1 movimiento sin clasificar' : pend + ' movimientos sin clasificar'}</span><span aria-hidden="true">→</span></a>` : '';
  return {
    above: 'Nómina y reembolsos',
    html: `${periodControls({ ...st, years: yearsWithData(data) }, MONTHS_SHORT)}
<section class="card center">
  <div class="card-head"><span class="card-title">Ingresos por categoría${infoBtn('anillos', 'Cómo leer los anillos')}</span><span class="note">${periodLabel}</span></div>
  <svg width="230" height="230" viewBox="0 0 220 220" role="img" aria-label="Anillos concéntricos por categoría" style="display:block">${rings}</svg>
  <div class="ring-total"><span class="big">${eur(sum.total)}</span><span class="note inline">${note}${infoBtn('objetivo', 'Qué es el objetivo')}</span>${delta}${prev}</div>
</section>
<section class="card list-card">
  <div class="card-head pad"><span class="card-title">Detalle</span><a class="link" href="#/ingresos/movimientos" data-act="go-mov">Ver movimientos ›</a></div>
  ${rows}
  <a class="link-row" href="#/ingresos/objetivo">Editar objetivo ›</a>
</section>
${banner}`,
    sheet: ui.info ? infoSheet(INGRESOS_INFO[ui.info]) : ''
  };
}

export function actIngresos(name, el, ctx) {
  const ui = ctx.ui.ingresos || (ctx.ui.ingresos = { info: null });
  if (['month', 'per', 'year'].includes(name)) return actGastos(name, el, ctx);
  if (name === 'info') ui.info = el.dataset.key;
  else if (name === 'close-sheet') ui.info = null;
  else if (name === 'go-mov') { ctx.ui.mov = { type: 'ingreso', group: el.dataset.group || null }; ctx.ui.movs = null; }
  else return false;
  return true;
}
