// Pantalla Gastos: anillos por grupo frente al presupuesto, gasto por tipo y detalle por grupo y subcategoría.
import { esc } from './html.js';
import { eur, infoBtn, infoSheet, periodControls, CHEVRON_DOWN } from './ui.js';
import { expenseSummary, defaultPeriod, yearsWithData, periodRange, pendingMovements, MONTHS_SHORT, MONTHS_FULL, TIPO_NAME, TIPO_COLOR } from '../core/analysis.js';

export const GASTOS_INFO = {
  anillos: { t: 'Cómo leer los anillos', what: 'Cada anillo es un grupo de gasto (con sus subcategorías dentro). Cuanto más completo está, más has gastado respecto a su presupuesto. Un anillo completo y en rojo significa que te has pasado. Si aún no has puesto presupuesto, el anillo muestra qué parte del gasto total es de ese grupo.', how: 'Gastado ÷ presupuesto del grupo. En los periodos de 3 meses o Accum. el presupuesto se multiplica por los meses del periodo.' },
  presupuesto: { t: 'Presupuesto del periodo', what: 'Lo que te has marcado como límite de gasto, repartido por grupos. Puedes cambiarlo en "Editar presupuesto".', how: 'Suma de los presupuestos de los grupos × meses del periodo.' },
  tipos: { t: 'Tipos de gasto', what: 'Cada categoría tiene un tipo. Fijo: se repite cada mes y es difícil de recortar (alquiler, suscripciones, cuota del gimnasio). Variable necesario: lo necesitas pero cambia según el uso (supermercado, transporte público, farmacia). Discrecional: podrías prescindir de ello (restaurantes, ocio, viajes, compras no esenciales).', how: 'Se suma el gasto del periodo de las categorías de cada tipo. Los gastos de categorías sin tipo definido aparecen aparte. El tipo se cambia en Datos > Categorías.' }
};

const RADII = [100, 89, 78, 67, 56, 45, 34, 23];

/** Estado de la pantalla (año, mes, periodo, grupo abierto); empieza en el último mes con datos. */
export function gastosState(ctx) {
  const ui = ctx.ui;
  if (!ui.gastos) ui.gastos = { ...defaultPeriod(ctx.session.data, ctx.nowIso), per: 'm', open: null, info: null };
  return ui.gastos;
}

function rings(groups, total, noBudget) {
  return RADII.map((r, i) => {
    const g = groups[i];
    const circ = 2 * Math.PI * r;
    const frac = noBudget ? (total > 0 ? g.spent / total : 0) : (g.budget > 0 ? Math.min(g.spent / g.budget, 1) : (g.spent > 0 ? 1 : 0));
    const over = !noBudget && g.over;
    return `<circle cx="110" cy="110" r="${r}" fill="none" stroke="#e6f4ee" stroke-width="7"/>${frac > 0 ? `<circle cx="110" cy="110" r="${r}" fill="none" stroke="${over ? '#d03e27' : g.color}" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(frac * circ).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 110 110)"/>` : ''}`;
  }).join('');
}

export function renderGastos(ctx) {
  const st = gastosState(ctx);
  const data = ctx.session.data;
  const sum = expenseSummary(data, st);
  const [lo, hi] = periodRange(st.month, st.per);
  const noBudget = sum.budgetTotal === 0;
  const periodLabel = st.per === 'm' ? MONTHS_FULL[st.month] : `${MONTHS_SHORT[lo]}–${MONTHS_SHORT[hi]}`;
  let budgetNote = '*sin presupuesto por ahora';
  let delta = '';
  if (!noBudget) {
    const diff = sum.budgetTotal - sum.total;
    budgetNote = `*de ${eur(sum.budgetTotal)} de presupuesto`;
    delta = `<span class="delta" style="color:${diff >= 0 ? '#047857' : '#b9341f'}">${diff >= 0 ? '*te quedan ' + eur(diff) : '*te has pasado ' + eur(-diff)}</span>`;
  }
  const prev = sum.prevTotal != null ? `<span class="note">*mes anterior (${MONTHS_SHORT[st.month - 1]}): ${eur(sum.prevTotal)}</span>` : '';

  const tipoKeys = ['F', 'V', 'D'].concat(sum.tipoSums[''] > 0 ? [''] : []);
  const tipoTot = tipoKeys.reduce((a, k) => a + Math.max(0, sum.tipoSums[k]), 0);
  const segs = tipoKeys.map((k) => `<span style="flex:none;width:${(tipoTot > 0 ? Math.max(0, sum.tipoSums[k]) / tipoTot * 100 : 0).toFixed(1)}%;background:${TIPO_COLOR[k]}"></span>`).join('');
  const tipoRows = tipoKeys.map((k) => `<div class="tipo-row"><span class="tipo-l"><span class="dot" style="background:${TIPO_COLOR[k]}"></span>${TIPO_NAME[k]}</span><span><strong>${eur(sum.tipoSums[k])}</strong><span class="note"> · ${tipoTot > 0 ? Math.round(Math.max(0, sum.tipoSums[k]) / tipoTot * 100) : 0} %</span></span></div>`).join('');

  const rows = sum.groups.map((g) => {
    const open = st.open === g.id;
    const amount = noBudget ? eur(g.spent) : `${Math.round(g.spent / 100)} / ${Math.round(g.budget / 100)} €`;
    const head = `<div class="grp-row"><a class="grp-main" href="#/gastos/movimientos" data-act="go-mov" data-group="${g.id}"><span class="grp-name"><span class="emoji" style="background:${g.color}2b" aria-hidden="true">${g.emoji}</span>${esc(g.name)}${g.over && !noBudget ? `<span class="over-pill">+${Math.round((g.spent - g.budget) / 100)} €</span>` : ''}</span><span class="grp-amt" style="color:${g.over && !noBudget ? '#b9341f' : '#355a4f'};font-weight:${g.over && !noBudget ? 600 : 400}">${amount}<span class="chev" aria-hidden="true">›</span></span></a><button class="grp-toggle" data-act="toggle-group" data-id="${g.id}" aria-label="Ver subcategorías de ${esc(g.name)}" aria-expanded="${open}"><span style="display:flex;transform:${open ? 'rotate(180deg)' : 'none'}">${CHEVRON_DOWN}</span></button></div>`;
    const subs = open ? g.subs.map((s) => `<a class="sub-row" href="#/gastos/movimientos" data-act="go-mov" data-group="${g.id}" data-sub="${s.id}"><span class="sub-l"><span class="dot sm" style="background:${TIPO_COLOR[s.tipo]}"></span><span class="ell">${esc(s.name)}</span><span class="note keep">· ${TIPO_NAME[s.tipo]}</span></span><span class="sub-amt">${eur(s.spent)}<span class="chev" aria-hidden="true">›</span></span></a>`).join('') : '';
    return head + subs;
  }).join('');

  const pend = pendingMovements(data).length;
  const banner = pend > 0 ? `<a class="banner" href="#/gastos/clasificar"><span>${pend === 1 ? '1 movimiento sin clasificar' : pend + ' movimientos sin clasificar'}</span><span aria-hidden="true">→</span></a>` : '';
  const info = st.info ? infoSheet(GASTOS_INFO[st.info]) : '';

  return {
    above: 'Presupuesto frente a gasto real',
    html: `
${periodControls({ ...st, years: yearsWithData(data) }, MONTHS_SHORT)}
<section class="card center">
  <div class="card-head"><span class="card-title">Gasto por grupo${infoBtn('anillos', 'Cómo leer los anillos')}</span><span class="note">${periodLabel}</span></div>
  <svg width="230" height="230" viewBox="0 0 220 220" role="img" aria-label="Anillos concéntricos por grupo" style="display:block">${rings(sum.groups, sum.total, noBudget)}</svg>
  <div class="ring-total"><span class="big">${eur(sum.total)}</span><span class="note inline">${budgetNote}${infoBtn('presupuesto', 'Qué es el presupuesto')}</span>${delta}${prev}</div>
</section>
<section class="card stack-sm">
  <div class="card-head"><span class="card-title">Gasto por tipo${infoBtn('tipos', 'Qué son los tipos de gasto')}</span><span class="note">${periodLabel}</span></div>
  <div class="bar">${segs}</div>
  ${tipoRows}
  <div class="note">*el tipo de cada categoría se cambia solo en Datos › Categorías</div>
</section>
<section class="card list-card">
  <div class="card-head pad"><span class="card-title">Detalle</span><a class="link" href="#/gastos/movimientos" data-act="go-mov">Ver movimientos ›</a></div>
  ${rows}
  <a class="link-row" href="#/gastos/presupuesto">Editar presupuesto ›</a>
</section>
${banner}`,
    sheet: info
  };
}

export function actGastos(name, el, ctx) {
  const st = gastosState(ctx);
  if (name === 'month') st.month = Number(el.dataset.i);
  else if (name === 'per') st.per = el.dataset.id;
  else if (name === 'year') st.year += Number(el.dataset.d);
  else if (name === 'toggle-group') st.open = st.open === el.dataset.id ? null : el.dataset.id;
  else if (name === 'info') st.info = el.dataset.key;
  else if (name === 'close-sheet') st.info = null;
  else if (name === 'go-mov') { ctx.ui.mov = { group: el.dataset.group || null, sub: el.dataset.sub || null }; ctx.ui.movs = null; }
  else return false;
  return true;
}
