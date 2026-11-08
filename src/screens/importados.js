// Datos › Movimientos importados: todo lo que hay guardado (también traspasos y pasos a ahorro), solo para consultar.
import { esc } from './html.js';
import { eur2, periodControls } from './ui.js';
import { yearOf, monthOf, yearsWithData, MONTHS_SHORT } from '../core/analysis.js';
import { expenseCatalog, INCOME_CATEGORIES } from '../core/categories.js';

const KIND = { gasto: 'Gasto', devolucion: 'Devolución', ingreso: 'Ingreso', traspaso: 'Traspaso', 'reembolso-compartido': 'Reembolso compartido', 'ahorro-inversion': 'Ahorro o inversión', 'por-revisar': 'Sin clasificar', ignorar: 'Sin efecto' };
const FILTERS = [['all', 'Todos'], ['gasto', 'Gastos'], ['ingreso', 'Ingresos'], ['otros', 'Traspasos y ahorro'], ['por-revisar', 'Sin clasificar']];
const ORIGIN = { 'revolut-card': 'Tarjeta', 'revolut-account': 'Cuenta' };
const LIMIT = 300;
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const state = (ctx) => ctx.ui.imp || (ctx.ui.imp = { kind: 'all', q: '', year: null, month: null });
const matches = (m, k) => k === 'all' || (k === 'gasto' ? m.kind === 'gasto' || m.kind === 'devolucion' : k === 'ingreso' ? m.kind === 'ingreso' : k === 'por-revisar' ? m.kind === 'por-revisar' : !['gasto', 'devolucion', 'ingreso', 'por-revisar'].includes(m.kind));

export function renderImportados(ctx) {
  const st = state(ctx);
  const data = ctx.session.data;
  const years = yearsWithData(data);
  if (st.year == null && years.length) st.year = years[years.length - 1];
  const catalog = new Map(expenseCatalog(data.categories).map((c) => [c.id, c.name]));
  const q = norm(st.q).trim();
  const all = data.movements.filter((m) => matches(m, st.kind) && (st.month == null || (yearOf(m) === st.year && monthOf(m) === st.month)) && (st.month != null || st.year == null || yearOf(m) === st.year) && (!q || norm(data.names[m.key] || m.description).includes(q) || norm(m.description).includes(q)))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const shown = all.slice(0, LIMIT);
  const names = data.names || {};
  const rows = shown.map((m, i) => {
    const cat = m.kind === 'ingreso' ? (INCOME_CATEGORIES.find((c) => c.id === m.categoryId) || {}).name : catalog.get(m.categoryId);
    const d = Number(m.date.slice(8, 10));
    return `<div class="mov-row${i === 0 ? ' first' : ''}"><div class="cls-name"><span class="cls-n">${esc(names[m.key] || m.description)}</span><span class="note">${d} ${MONTHS_SHORT[monthOf(m)].toLowerCase()} ${yearOf(m)} · ${ORIGIN[m.source] || esc(m.source)} · ${KIND[m.kind] || esc(m.kind)}${cat ? ' · ' + esc(cat) : ''}</span></div><span class="cls-amt" style="color:${m.amountCents > 0 ? '#047857' : '#052e26'}">${m.amountCents > 0 ? '+' : ''}${eur2(m.amountCents)}</span></div>`;
  }).join('');
  const chips = FILTERS.map(([id, n]) => `<button class="tchip" data-act="imp-kind" data-id="${id}" aria-pressed="${st.kind === id}" style="background:${st.kind === id ? '#047857' : '#fff'};border-color:${st.kind === id ? '#047857' : '#cfe8de'};color:${st.kind === id ? '#fff' : '#355a4f'}">${n}</button>`).join('');
  const yearSel = years.length > 1 ? `<div class="year-sel"><button class="chip-sm" data-act="imp-year" data-d="-1" ${st.year <= years[0] ? 'disabled' : ''} aria-label="Año anterior">‹</button><span>${st.year}</span><button class="chip-sm" data-act="imp-year" data-d="1" ${st.year >= years[years.length - 1] ? 'disabled' : ''} aria-label="Año siguiente">›</button></div>` : '';
  const months = `<div class="months"><button class="month" data-act="imp-month" data-i="-1" aria-pressed="${st.month == null}">Año</button>${MONTHS_SHORT.map((n, i) => `<button class="month" data-act="imp-month" data-i="${i}" aria-pressed="${st.month === i}">${n}</button>`).join('')}</div>`;
  return {
    back: { href: '#/datos', label: 'Datos' },
    title: 'Movimientos importados',
    below: '*todo lo que hay guardado, solo para consultar; se corrige en Gastos o Ingresos',
    html: `${yearSel}${months}
<div class="row-scroll">${chips}</div>
<input class="search" type="search" enterkeyhint="search" data-search placeholder="Buscar por comercio o nombre" value="${esc(st.q)}" aria-label="Buscar movimientos">
<div class="card-head"><span class="note">${all.length} ${all.length === 1 ? 'movimiento' : 'movimientos'}${all.length > LIMIT ? ` · se muestran los ${LIMIT} más recientes` : ''}</span></div>
${all.length ? `<div class="card list-card tight">${rows}</div>` : '<div class="card"><p class="note pad-sm">No hay movimientos con estos filtros.</p></div>'}`,
    sheet: ''
  };
}

export function actImportados(name, el, ctx) {
  const st = state(ctx);
  if (name === 'imp-kind') st.kind = el.dataset.id;
  else if (name === 'imp-month') st.month = Number(el.dataset.i) < 0 ? null : Number(el.dataset.i);
  else if (name === 'imp-year') st.year += Number(el.dataset.d);
  else if (name === 'search') st.q = el.value.trim();
  else return false;
  return true;
}
