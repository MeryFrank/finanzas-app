// Movimientos de gasto: filtros por mes, grupo y subcategoría, gráfico frente al presupuesto y lista con nombre editable y reclasificación.
import { esc } from './html.js';
import { eur, eur2, periodControls, sheet } from './ui.js';
import { gastosState, actGastos } from './gastos.js';
import { pickerHtml, labelOf, parseChoice, NO_COUNT } from './clasificar.js';
import { yearOf, monthOf, periodRange, spendOf, yearsWithData, GROUP_STYLE, TIPO_COLOR, MONTHS_FULL, MONTHS_SHORT } from '../core/analysis.js';
import { expenseCatalog, EXPENSE_GROUPS, INCOME_CATEGORIES } from '../core/categories.js';

const ORIGIN = { 'revolut-card': 'Tarjeta', 'revolut-account': 'Cuenta' };
const CHART_H = 160;
const GIDS = Object.keys(EXPENSE_GROUPS);

/** Estado de la pantalla. Al llegar desde Gastos (ui.mov) parte del grupo o la subcategoría tocados. */
export function movState(ctx) {
  const ui = ctx.ui;
  if (!ui.movs) {
    const f = ui.mov || {};
    const catalog = expenseCatalog(ctx.session.data.categories);
    const subOff = {};
    if (f.group && f.sub) catalog.filter((c) => c.group === f.group && c.id !== f.sub).forEach((c) => { subOff[c.id] = true; });
    ui.movs = { sel: Object.fromEntries(GIDS.map((g) => [g, f.group ? g === f.group : true])), subOff, refine: false, cm: 'mes', grp: null, tapM: null, menu: null, edit: null, pick: null, confirm: null, msg: '' };
  }
  return ui.movs;
}

const groupOf = (m, byId) => { const c = byId.get(m.categoryId); return c ? c.group : 'otros'; };
const subOf = (m, byId) => { const c = byId.get(m.categoryId); return c ? c.id : 'sin-clasificar'; };

const modeBtns = (items, cur, act, key = 'id') => items.map(([id, n]) => `<button class="seg-btn" data-act="${act}" data-${key}="${id}" aria-pressed="${id === cur}">${n}</button>`).join('');

export function renderMovimientos(ctx) {
  const st = movState(ctx);
  const per = gastosState(ctx);
  const data = ctx.session.data;
  const catalog = expenseCatalog(data.categories);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const names = data.names || {};
  const [lo, hi] = periodRange(per.month, per.per);
  const selGroups = GIDS.filter((g) => st.sel[g]);
  const allOn = selGroups.length === GIDS.length;
  const inSel = (m) => st.sel[groupOf(m, byId)] && !st.subOff[subOf(m, byId)];
  const refined = selGroups.some((g) => catalog.some((c) => c.group === g && st.subOff[c.id]));
  const yearMovs = data.movements.filter((m) => spendOf(m) !== 0 && yearOf(m) === per.year && inSel(m));

  // Gráfico
  const monthly = Array.from({ length: 12 }, () => 0);
  yearMovs.forEach((m) => { monthly[monthOf(m)] += spendOf(m); });
  const budMonth = refined ? 0 : selGroups.reduce((a, g) => a + Math.round((data.budget[g] || 0) * 100), 0);
  const acu = st.cm === 'acu';
  let rs = 0;
  const sv = acu ? monthly.map((v) => (rs += v)) : monthly;
  const bv = monthly.map((_, i) => (acu ? budMonth * (i + 1) : budMonth));
  const mx = Math.max(1, ...sv, ...bv);
  const cols = MONTHS_SHORT.map((n, m) => {
    const inR = m >= lo && m <= hi;
    const h = (v) => Math.round(Math.max(0, v) / mx * CHART_H);
    return `<button class="col" data-act="tap-month" data-i="${m}" aria-label="${MONTHS_FULL[m]}" style="background:${st.tapM === m ? '#e6f4ee' : 'transparent'}"><span style="width:46%;height:${h(sv[m])}px;min-height:${sv[m] > 0 ? 2 : 0}px;background:${inR ? '#047857' : '#b7ddcd'};border-radius:3px 3px 0 0"></span><span style="width:46%;height:${h(bv[m])}px;min-height:${bv[m] > 0 ? 2 : 0}px;background:${inR ? '#a7e3c9' : '#e3f2ec'};border-radius:3px 3px 0 0"></span></button>`;
  }).join('');
  const tm = st.tapM;
  const tapText = tm == null ? '*toca una columna para ver sus valores'
    : `${MONTHS_FULL[tm]}${acu ? ' (acumulado)' : ''}: gasto ${eur(sv[tm])} · presupuesto ${bv[tm] > 0 ? eur(bv[tm]) : 'sin definir'}${bv[tm] > 0 ? ' · ' + (sv[tm] <= bv[tm] ? 'quedan ' + eur(bv[tm] - sv[tm]) : 'te pasas ' + eur(sv[tm] - bv[tm])) : ''}`;

  // Lista
  const list = yearMovs.filter((m) => monthOf(m) >= lo && monthOf(m) <= hi).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const total = list.reduce((a, m) => a + spendOf(m), 0);
  const grouped = st.grp != null ? st.grp : per.per !== 'm';
  let lastM = -1;
  const rows = list.map((m) => {
    let head = '';
    if (grouped && hi > lo && monthOf(m) !== lastM) {
      lastM = monthOf(m);
      const sub = list.filter((x) => monthOf(x) === lastM).reduce((a, x) => a + spendOf(x), 0);
      head = `<div class="mon-head"><span>${MONTHS_FULL[lastM]}</span><span>${eur(sub)}</span></div>`;
    }
    const gst = GROUP_STYLE[groupOf(m, byId)];
    const c = byId.get(m.categoryId);
    const d = Number(m.date.slice(8, 10));
    const nm = names[m.key];
    const v = spendOf(m);
    return `${head}<div class="tx" style="background:${gst.color}26;border-left-color:${gst.color}"><span class="tx-e" aria-hidden="true">${gst.emoji}</span><div class="tx-m"><span class="tx-n">${esc(nm || m.description)}</span><span class="tx-s">${d} ${MONTHS_SHORT[monthOf(m)].toLowerCase()} · ${ORIGIN[m.source] || esc(m.source)}${c && c.id !== 'sin-clasificar' ? ' · ' + esc(c.name) : ''}${nm ? `<span class="tx-old"> · antes: ${esc(m.description)}</span>` : ''}</span></div><span class="tx-a" style="color:${v < 0 ? '#047857' : '#052e26'}">${v > 0 ? '-' : '+'}${eur2(Math.abs(m.amountCents))}</span><button class="tx-menu" data-act="menu" data-key="${esc(m.key)}" aria-label="Más opciones de ${esc(nm || m.description)}"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg></button></div>`;
  }).join('');

  // Filtros
  const chips = GIDS.map((g) => { const on = st.sel[g]; const s = GROUP_STYLE[g]; return `<button class="gchip" data-act="toggle-sel" data-id="${g}" aria-pressed="${on}" style="border-color:${on ? s.color : '#cfe8de'};background:${on ? s.color + '2b' : '#fff'};color:${on ? '#052e26' : '#4a665d'}"><span aria-hidden="true">${s.emoji}</span>${esc(EXPENSE_GROUPS[g])}</button>`; }).join('');
  const incl = catalog.filter((c) => st.sel[c.group] && !st.subOff[c.id]);
  const tipoMode = (k) => incl.length > 0 && incl.every((x) => x.tipo === k);
  const tipoBtns = [['', 'Todas'], ['F', 'Solo fijos'], ['V', 'Solo variables'], ['D', 'Solo discrecionales']].map(([k, n]) => {
    const on = k === '' ? !refined : refined && tipoMode(k);
    return `<button class="tchip" data-act="tipo" data-k="${k}" aria-pressed="${on}" style="background:${on ? '#047857' : '#fff'};border-color:${on ? '#047857' : '#cfe8de'};color:${on ? '#fff' : '#355a4f'}">${n}</button>`;
  }).join('');
  const subItems = selGroups.map((g) => {
    const s = GROUP_STYLE[g];
    return `<span class="sub-head">${esc(EXPENSE_GROUPS[g])}</span>` + catalog.filter((c) => c.group === g).map((c) => { const on = !st.subOff[c.id]; return `<button class="gchip sm" data-act="toggle-sub" data-id="${esc(c.id)}" aria-pressed="${on}" style="border-color:${on ? s.color : '#cfe8de'};background:${on ? s.color + '2b' : '#fff'};color:${on ? '#052e26' : '#4a665d'}"><span class="dot" style="background:${TIPO_COLOR[c.tipo]}" aria-hidden="true"></span>${esc(c.name)}</button>`; }).join('');
  }).join('');
  const refineOpen = selGroups.length > 0 && st.refine;
  const refineBlock = selGroups.length ? `<button class="refine" data-act="toggle-refine" aria-expanded="${refineOpen}"><span>${refined ? 'Afinar por subcategoría · filtro activo' : 'Afinar por subcategoría'}</span><span aria-hidden="true" style="display:inline-block;transform:${refineOpen ? 'rotate(90deg)' : 'none'}">›</span></button>` : '';
  const refinePanel = refineOpen ? `<div class="card stack-sm"><div class="row-scroll">${tipoBtns}</div><div class="wrap">${subItems}</div><div class="note">${refined ? '*con subcategorías filtradas no hay presupuesto que comparar: se fija por grupo' : '*todas las subcategorías de los grupos elegidos están incluidas'}</div></div>` : '';

  const periodLabel = per.per === 'm' ? MONTHS_FULL[per.month] : `${MONTHS_SHORT[lo]}–${MONTHS_SHORT[hi]}`;

  // Hojas
  const byKey = new Map(data.movements.map((m) => [m.key, m]));
  const dn = (m) => names[m.key] || m.description;
  let sh = '';
  if (st.confirm) {
    const m = byKey.get(st.confirm.key);
    sh = `<div class="sheet-bg"><div class="sheet" role="alertdialog" aria-label="Confirmar cambio"><h2>¿Estás segura?</h2><p class="sheet-text">Vas a mover «${esc(dn(m))}» de ${esc(labelOf(m, catalog) || 'Sin clasificar')} a ${esc(st.confirm.label)}.</p><div class="btn-row"><button class="btn secondary" data-act="close-sheet">Cancelar</button><button class="btn" data-act="apply">Sí, cambiar</button></div></div></div>`;
  } else if (st.pick) {
    const m = byKey.get(st.pick);
    const cur = m.kind === 'gasto' ? 'gasto:' + m.categoryId : m.kind === 'ingreso' ? 'ingreso:' + m.categoryId : m.kind;
    sh = sheet('Elegir categoría', pickerHtml(catalog, cur, 'mchoose'));
  } else if (st.edit) {
    const m = byKey.get(st.edit);
    sh = `<div class="sheet-bg"><div class="sheet" role="dialog" aria-label="Editar nombre"><h2>Editar nombre</h2><label for="nombre" class="note">Nombre original: ${esc(m.description)}</label><input id="nombre" type="text" maxlength="80" value="${esc(dn(m))}" autocomplete="off"><div class="btn-row"><button class="btn secondary" data-act="close-sheet">Cancelar</button><button class="btn" data-act="save-name">Guardar</button></div></div></div>`;
  } else if (st.menu) {
    const m = byKey.get(st.menu);
    sh = sheet(dn(m), '<button class="menu-item" data-act="to-edit">Editar nombre</button><button class="menu-item" data-act="to-pick">Reclasificar</button>', { label: 'Opciones del movimiento' });
  }

  return {
    back: { href: '#/gastos', label: 'Gastos' },
    title: 'Movimientos',
    below: `${periodLabel} · Gastos`,
    html: `${periodControls({ ...per, years: yearsWithData(data) }, MONTHS_SHORT)}
<div class="card-head"><span class="card-title">Grupos</span><button class="link-btn" data-act="toggle-all">${allOn ? 'Quitar todas' : 'Seleccionar todas'}</button></div>
<div class="row-scroll">${chips}</div>
${refineBlock}${refinePanel}
<section class="card stack-sm">
  <div class="card-head"><span class="card-title">Gasto frente a presupuesto · ${acu ? 'acumulado' : 'por mes'}</span><span class="note">Total seleccionado: ${eur(total)}</span></div>
  <div class="seg sm">${modeBtns([['mes', 'Cada mes'], ['acu', 'Acumulado']], st.cm, 'chart-mode')}</div>
  <div class="chart"><div class="gl top"></div><div class="gl mid"></div><span class="max">${eur(mx)}</span><div class="cols">${cols}</div></div>
  <div class="chart-m">${MONTHS_SHORT.map((n) => `<span>${n.charAt(0)}</span>`).join('')}</div>
  <div class="legend"><span><i style="background:#047857"></i>Gasto seleccionado</span><span><i style="background:#a7e3c9"></i>Presupuesto de las categorías elegidas</span></div>
  <div class="tap">${esc(tapText)}</div>
</section>
<div class="card-head"><span class="note">${list.length} ${list.length === 1 ? 'movimiento' : 'movimientos'} · ${eur(total)}</span><button class="link-btn tog" data-act="toggle-grp" aria-pressed="${grouped}"><span class="switch" style="background:${grouped ? '#047857' : '#b7ddcd'}"><span style="left:${grouped ? '16px' : '2px'}"></span></span>Agrupar por mes</button></div>
${st.msg ? `<div class="okbox">${esc(st.msg)}</div>` : ''}
${list.length === 0 ? '<div class="card"><p class="note pad-sm">No hay movimientos con estos filtros.</p></div>' : ''}
<div class="txs">${rows}</div>`,
    sheet: sh
  };
}

export async function actMovimientos(name, el, ctx) {
  const st = movState(ctx);
  const data = ctx.session.data;
  const catalog = expenseCatalog(data.categories);
  if (!['save-name', 'apply'].includes(name)) st.msg = '';
  const clear = () => { st.menu = null; st.edit = null; st.pick = null; st.confirm = null; };
  if (['month', 'per', 'year'].includes(name)) { actGastos(name, el, ctx); st.tapM = null; }
  else if (name === 'toggle-sel') { st.sel[el.dataset.id] = !st.sel[el.dataset.id]; st.msg = ''; }
  else if (name === 'toggle-all') { const on = !GIDS.every((g) => st.sel[g]); GIDS.forEach((g) => { st.sel[g] = on; }); st.subOff = {}; }
  else if (name === 'toggle-refine') st.refine = !st.refine;
  else if (name === 'toggle-sub') { if (st.subOff[el.dataset.id]) delete st.subOff[el.dataset.id]; else st.subOff[el.dataset.id] = true; }
  else if (name === 'tipo') {
    const k = el.dataset.k;
    st.subOff = {};
    if (k) catalog.filter((c) => st.sel[c.group] && c.tipo !== k).forEach((c) => { st.subOff[c.id] = true; });
  }
  else if (name === 'chart-mode') st.cm = el.dataset.id;
  else if (name === 'tap-month') st.tapM = st.tapM === Number(el.dataset.i) ? null : Number(el.dataset.i);
  else if (name === 'toggle-grp') { const per = gastosState(ctx); st.grp = !(st.grp != null ? st.grp : per.per !== 'm'); }
  else if (name === 'menu') { clear(); st.menu = el.dataset.key; }
  else if (name === 'close-sheet') clear();
  else if (name === 'to-edit') { st.edit = st.menu; st.menu = null; }
  else if (name === 'to-pick') { st.pick = st.menu; st.menu = null; }
  else if (name === 'save-name') {
    await ctx.session.rename(st.edit, document.getElementById('nombre').value);
    clear(); st.msg = 'Nombre actualizado.';
  } else if (name === 'mchoose') {
    const choice = parseChoice(el.dataset.choice);
    const label = choice.kind === 'gasto' ? labelOf({ kind: 'gasto', categoryId: choice.categoryId }, catalog)
      : choice.kind === 'ingreso' ? INCOME_CATEGORIES.find((c) => c.id === choice.categoryId).name
      : NO_COUNT.find((n) => n[0] === choice.kind)[1];
    st.confirm = { key: st.pick, choice, label };
    st.pick = null;
  } else if (name === 'apply') {
    await ctx.session.reclassify(st.confirm.key, st.confirm.choice);
    st.msg = `Movimiento cambiado a ${st.confirm.label}.`;
    clear();
  } else return false;
  return true;
}
