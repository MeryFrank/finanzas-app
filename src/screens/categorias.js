// Datos › Categorías: tipo de cada subcategoría (único sitio donde se edita) y categorías propias.
import { esc } from './html.js';
import { infoBtn, infoSheet, sheet } from './ui.js';
import { GASTOS_INFO } from './gastos.js';
import { GROUP_STYLE, TIPO_NAME, TIPO_COLOR } from '../core/analysis.js';
import { expenseCatalog, EXPENSE_GROUPS } from '../core/categories.js';

const TDESC = { F: 'Se repite cada mes y cuesta recortarlo', V: 'Lo necesitas, pero cambia según el uso', D: 'Podrías prescindir de ello' };
const GIDS = Object.keys(EXPENSE_GROUPS);

export function catState(ctx) {
  if (!ctx.ui.cats) ctx.ui.cats = { edit: null, nw: null, info: false, msg: '' };
  return ctx.ui.cats;
}

const tipoOpts = (cur, act) => ['F', 'V', 'D'].map((k) => `<button class="tipo-opt" data-act="${act}" data-k="${k}" aria-pressed="${cur === k}" style="border-color:${cur === k ? TIPO_COLOR[k] : '#cfe8de'};background:${cur === k ? TIPO_COLOR[k] + '26' : '#fff'}"><span class="tdot" style="background:${TIPO_COLOR[k]}" aria-hidden="true"></span><span class="tcol"><strong>${TIPO_NAME[k]}</strong><span class="note">${TDESC[k]}</span></span></button>`).join('');

export function renderCategorias(ctx) {
  const st = catState(ctx);
  const cat = expenseCatalog(ctx.session.data.categories).filter((c) => c.id !== 'sin-clasificar');
  const cnt = { F: 0, V: 0, D: 0 };
  cat.forEach((c) => { cnt[c.tipo]++; });
  const counts = [['F', 'Fijos'], ['V', 'Variables necesarios'], ['D', 'Discrecionales']].map(([k, n]) => `<div class="kpi" style="background:${TIPO_COLOR[k]}22"><span class="kpi-n">${cnt[k]}</span><span class="kpi-l">${n}</span></div>`).join('');
  const list = GIDS.map((g) => {
    const items = cat.filter((c) => c.group === g);
    if (!items.length) return '';
    const s = GROUP_STYLE[g];
    return `<div class="cat-head"><span class="emoji sm" style="background:${s.color}2b" aria-hidden="true">${s.emoji}</span><span class="grow">${esc(EXPENSE_GROUPS[g])}</span><span class="cat-count">${items.length} ${items.length === 1 ? 'categoría' : 'categorías'}</span></div>`
      + items.map((c) => `<button class="cat-row" data-act="edit" data-id="${esc(c.id)}" aria-label="Cambiar el tipo de ${esc(c.name)}"><span class="cat-name"><span class="ell">${esc(c.name)}</span>${c.custom ? '<span class="own">Propia</span>' : ''}</span><span class="tipo-pill" style="background:${TIPO_COLOR[c.tipo]}22"><span class="tdot sm" style="background:${TIPO_COLOR[c.tipo]}" aria-hidden="true"></span>${TIPO_NAME[c.tipo]}</span></button>`).join('');
  }).join('');

  let sh = '';
  const byId = new Map(cat.map((c) => [c.id, c]));
  if (st.nw) {
    const n = st.nw;
    const chips = GIDS.map((g) => { const s = GROUP_STYLE[g]; const on = n.group === g; return `<button class="gchip" data-act="new-group" data-id="${g}" aria-pressed="${on}" style="border-color:${on ? s.color : '#cfe8de'};background:${on ? s.color + '2b' : '#fff'};color:${on ? '#052e26' : '#4a665d'}">${s.emoji} ${esc(EXPENSE_GROUPS[g])}</button>`; }).join('');
    sh = sheet('Nueva categoría', `<label class="fld">Nombre<input id="cname" type="text" maxlength="30" autocomplete="off" enterkeyhint="done" value="${esc(n.name)}" aria-label="Nombre de la categoría"></label>
<span class="lbl">Grupo</span><div class="wrap">${chips}</div>
<span class="lbl">Tipo de gasto</span>${tipoOpts(n.tipo, 'new-tipo')}
<div class="err-t">${esc(n.err || '')}</div>
<div class="btn-row"><button class="btn secondary" data-act="close-sheet">Cancelar</button><button class="btn" data-act="save-new">Guardar</button></div>`, { label: 'Nueva categoría' });
  } else if (st.edit && byId.has(st.edit)) {
    const c = byId.get(st.edit);
    sh = sheet(`«${c.name}»`, `<div class="note">Grupo: ${esc(EXPENSE_GROUPS[c.group])}</div>${tipoOpts(c.tipo, 'set-tipo')}${c.custom ? '<button class="btn-del" data-act="delete">Eliminar esta categoría</button>' : ''}`, { label: 'Cambiar el tipo' });
  } else if (st.info) sh = infoSheet(GASTOS_INFO.tipos);

  return {
    back: { href: '#/datos', label: 'Datos' },
    title: 'Categorías',
    below: '*grupos, subcategorías y tipo de gasto',
    html: `<section class="card stack-sm"><span class="card-title">Tipos de gasto${infoBtn('tipos', 'Qué son los tipos de gasto')}</span><div class="kpis">${counts}</div><div class="note">*el tipo se cambia solo aquí; en Gastos se muestra pero no se edita</div></section>
<button class="btn" data-act="new">Nueva categoría</button>
<div class="center-t okmsg">${esc(st.msg)}</div>
<section class="card cat-list">${list}</section>
<p class="note">*los 8 grupos son fijos (son los anillos de Gastos); las categorías nuevas se crean dentro de uno de ellos</p>`,
    sheet: sh
  };
}

export async function actCategorias(name, el, ctx) {
  const st = catState(ctx);
  const nameInput = document.getElementById('cname');
  if (st.nw && nameInput) st.nw.name = nameInput.value;
  if (name === 'edit') { st.edit = el.dataset.id; st.msg = ''; }
  else if (name === 'info') st.info = true;
  else if (name === 'close-sheet') { st.edit = null; st.nw = null; st.info = false; }
  else if (name === 'new') { st.nw = { name: '', group: null, tipo: null, err: '' }; st.msg = ''; }
  else if (name === 'new-group') { st.nw.group = el.dataset.id; st.nw.err = ''; }
  else if (name === 'new-tipo') { st.nw.tipo = el.dataset.k; st.nw.err = ''; }
  else if (name === 'save-new') {
    const n = st.nw;
    if (!n.name.trim()) { n.err = 'Escribe un nombre.'; return true; }
    if (!n.group) { n.err = 'Elige un grupo.'; return true; }
    if (!n.tipo) { n.err = 'Elige un tipo de gasto.'; return true; }
    try { await ctx.session.addCategory({ name: n.name, group: n.group, tipo: n.tipo }); }
    catch (e) { n.err = /existe/.test(e.message) ? 'Ya existe una categoría con ese nombre.' : e.message; return true; }
    st.msg = `Categoría «${n.name.trim()}» creada en ${EXPENSE_GROUPS[n.group]}.`; st.nw = null;
  } else if (name === 'set-tipo') {
    const c = expenseCatalog(ctx.session.data.categories).find((x) => x.id === st.edit);
    await ctx.session.setTipo(st.edit, el.dataset.k);
    st.msg = `Tipo de «${c.name}»: ${TIPO_NAME[el.dataset.k]}.`; st.edit = null;
  } else if (name === 'delete') {
    const c = expenseCatalog(ctx.session.data.categories).find((x) => x.id === st.edit);
    const moved = await ctx.session.deleteCategory(st.edit);
    st.msg = `Categoría «${c.name}» eliminada.${moved ? ` ${moved} movimiento${moved === 1 ? '' : 's'} vuelve${moved === 1 ? '' : 'n'} a sin clasificar.` : ''}`; st.edit = null;
  } else return false;
  return true;
}
