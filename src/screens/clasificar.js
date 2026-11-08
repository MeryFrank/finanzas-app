// Clasificar movimientos pendientes: elegir categoría (grupo › subcategoría), confirmar y aplicar a los iguales.
import { esc } from './html.js';
import { eur2, sheet } from './ui.js';
import { pendingMovements, GROUP_STYLE, MONTHS_SHORT } from '../core/analysis.js';
import { expenseCatalog, EXPENSE_GROUPS, INCOME_CATEGORIES, INCOME_GROUPS } from '../core/categories.js';
import { needsReview, sameCount } from '../core/classify.js';

export const NO_COUNT = [
  ['traspaso', 'Traspaso entre cuentas propias'],
  ['reembolso-compartido', 'Reembolso compartido (bizum o transferencia)'],
  ['ahorro-inversion', 'Ahorro o inversión']
];
const ORIGIN = { 'revolut-card': 'Tarjeta', 'revolut-account': 'Cuenta' };

/** 'gasto:supermercado' -> {kind, categoryId} */
export const parseChoice = (s) => { const [kind, id] = String(s).split(':'); return id ? { kind, categoryId: id } : { kind }; };

/** Etiqueta de la clasificación actual de un movimiento, o null si está pendiente. */
export function labelOf(m, catalog) {
  if (needsReview(m)) return null;
  if (m.kind === 'gasto' || m.kind === 'devolucion') {
    const c = catalog.find((x) => x.id === m.categoryId);
    return c ? `${EXPENSE_GROUPS[c.group]} › ${c.name}` : null;
  }
  if (m.kind === 'ingreso') { const c = INCOME_CATEGORIES.find((x) => x.id === m.categoryId); return c ? c.name : 'Ingreso'; }
  const n = NO_COUNT.find((x) => x[0] === m.kind);
  return n ? n[1] : null;
}

export function clasificarState(ctx) {
  const ui = ctx.ui;
  if (!ui.clasificar || ui.clasificar.visit !== ui.visit) {
    ui.clasificar = { visit: ui.visit, keys: pendingMovements(ctx.session.data).map((m) => m.key), pick: null, confirm: null };
  }
  return ui.clasificar;
}

export function pickerHtml(catalog, current, act = 'choose') {
  const sel = (v) => (v === current ? '600' : '400');
  const groups = Object.keys(EXPENSE_GROUPS).map((gid) => {
    const st = GROUP_STYLE[gid];
    const items = catalog.filter((c) => c.group === gid && c.id !== 'sin-clasificar');
    return items.length ? `<div class="pick-group"><span class="pick-head">${esc(EXPENSE_GROUPS[gid])}</span>${items.map((c) => `<button class="pick" style="font-weight:${sel('gasto:' + c.id)}" data-act="${act}" data-choice="gasto:${esc(c.id)}"><span class="emoji" style="background:${st.color}2b" aria-hidden="true">${st.emoji}</span>${esc(c.name)}</button>`).join('')}</div>` : '';
  }).join('');
  const inc = `<div class="pick-group"><span class="pick-head">Ingresos</span>${INCOME_CATEGORIES.map((c) => `<button class="pick" style="font-weight:${sel('ingreso:' + c.id)}" data-act="${act}" data-choice="ingreso:${esc(c.id)}"><span class="emoji" style="background:${c.group === 'nomina' ? '#2e8a472b' : '#0ea5e92b'}" aria-hidden="true">${c.group === 'nomina' ? '💼' : '↩️'}</span>${esc(c.name)}</button>`).join('')}</div>`;
  const no = `<div class="pick-group"><span class="pick-head">No cuenta como gasto ni ingreso</span>${NO_COUNT.map(([k, n]) => `<button class="pick" style="font-weight:${sel(k)}" data-act="${act}" data-choice="${k}"><span class="emoji" style="background:#94a3b82b" aria-hidden="true">🔁</span>${esc(n)}</button>`).join('')}</div>`;
  return groups + inc + no;
}

export function renderClasificar(ctx) {
  const st = clasificarState(ctx);
  const data = ctx.session.data;
  const catalog = expenseCatalog(data.categories);
  const byKey = new Map(data.movements.map((m) => [m.key, m]));
  const pending = pendingMovements(data).length;
  const rows = st.keys.map((k) => byKey.get(k)).filter(Boolean).map((m, idx) => {
    const lbl = labelOf(m, catalog);
    const d = Number(m.date.slice(8, 10));
    return `<div class="cls-row${idx === 0 ? ' first' : ''}">
  <div class="cls-top"><div class="cls-name"><span class="cls-n">${esc(m.description)}</span><span class="note">${d} ${MONTHS_SHORT[Number(m.date.slice(5, 7)) - 1].toLowerCase()} · ${ORIGIN[m.source] || esc(m.source)}</span></div><span class="cls-amt" style="color:${m.amountCents > 0 ? '#047857' : '#052e26'}">${m.amountCents < 0 ? '-' : '+'}${eur2(Math.abs(m.amountCents))}</span></div>
  <button class="cls-btn${lbl ? ' done' : ''}" data-act="open-pick" data-key="${esc(m.key)}" aria-label="Elegir categoría de ${esc(m.description)}"><span>${lbl ? esc(lbl) : 'Elegir categoría'}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>
</div>`;
  }).join('');
  let sh = '';
  if (st.pick) {
    const m = byKey.get(st.pick);
    sh = sheet('Elegir categoría', pickerHtml(catalog, m && m.kind === 'gasto' ? 'gasto:' + m.categoryId : m && m.kind === 'ingreso' ? 'ingreso:' + m.categoryId : m ? m.kind : ''), { label: 'Elegir categoría' });
  } else if (st.confirm) {
    const m = byKey.get(st.confirm.key);
    const same = sameCount(data, st.confirm.key) - 1;
    const text = `Vas a clasificar «${m ? esc(m.description) : ''}» como ${esc(st.confirm.label)}${st.confirm.choice.kind === 'gasto' ? ' (gasto)' : st.confirm.choice.kind === 'ingreso' ? ' (ingreso)' : ''}.${same > 0 ? ` También se clasificarán ${same} movimiento${same === 1 ? '' : 's'} pendiente${same === 1 ? '' : 's'} con la misma descripción.` : ''}${st.confirm.choice.kind === 'gasto' || st.confirm.choice.kind === 'ingreso' ? ' La app recordará esta descripción para los próximos extractos.' : ''}`;
    sh = `<div class="sheet-bg"><div class="sheet" role="alertdialog" aria-label="Confirmar cambio"><h2>¿Estás segura?</h2><p class="sheet-text">${text}</p><div class="btn-row"><button class="btn secondary" data-act="close-sheet">Cancelar</button><button class="btn" data-act="apply">Sí, cambiar</button></div></div></div>`;
  }
  return {
    back: { href: '#/gastos', label: 'Gastos' },
    title: 'Clasificar movimientos',
    below: pending === 0 ? 'Sin movimientos pendientes' : pending === 1 ? '1 movimiento pendiente' : `${pending} movimientos pendientes`,
    html: `${pending === 0 ? '<div class="okbox">Todo clasificado. No queda ningún movimiento pendiente.</div>' : ''}
<div class="card list-card tight">${rows}</div>
<p class="note">*puedes clasificar cada movimiento como gasto o como ingreso; cada cambio pide confirmación</p>`,
    sheet: sh
  };
}

export async function actClasificar(name, el, ctx) {
  const st = clasificarState(ctx);
  if (name === 'open-pick') st.pick = el.dataset.key;
  else if (name === 'close-sheet') { st.pick = null; st.confirm = null; }
  else if (name === 'choose') {
    const choice = parseChoice(el.dataset.choice);
    const catalog = expenseCatalog(ctx.session.data.categories);
    const label = choice.kind === 'gasto' ? labelOf({ kind: 'gasto', categoryId: choice.categoryId }, catalog)
      : choice.kind === 'ingreso' ? INCOME_CATEGORIES.find((c) => c.id === choice.categoryId).name
      : NO_COUNT.find((n) => n[0] === choice.kind)[1];
    st.confirm = { key: st.pick, choice, label };
    st.pick = null;
  } else if (name === 'apply') {
    await ctx.session.classify(st.confirm.key, st.confirm.choice);
    st.confirm = null;
  } else return false;
  return true;
}
