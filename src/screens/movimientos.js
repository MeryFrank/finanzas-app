// Movimientos de gasto del periodo elegido en Gastos, filtrados por grupo o subcategoría. (La versión completa con gráfico llega después.)
import { esc } from './html.js';
import { eur, eur2 } from './ui.js';
import { gastosState } from './gastos.js';
import { yearOf, monthOf, periodRange, spendOf, MONTHS_FULL, MONTHS_SHORT } from '../core/analysis.js';
import { expenseCatalog, EXPENSE_GROUPS } from '../core/categories.js';

export function renderMovimientos(ctx) {
  const st = gastosState(ctx);
  const f = ctx.ui.mov || { group: null, sub: null };
  const catalog = expenseCatalog(ctx.session.data.categories);
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const [lo, hi] = periodRange(st.month, st.per);
  const list = ctx.session.data.movements
    .filter((m) => spendOf(m) !== 0 && yearOf(m) === st.year && monthOf(m) >= lo && monthOf(m) <= hi)
    .filter((m) => { const c = byId.get(m.categoryId); return (!f.group || (c ? c.group : 'otros') === f.group) && (!f.sub || (c ? c.id : 'sin-clasificar') === f.sub); })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = list.reduce((a, m) => a + spendOf(m), 0);
  const where = [f.group ? EXPENSE_GROUPS[f.group] : 'Todos los grupos', f.sub && byId.get(f.sub) ? byId.get(f.sub).name : null].filter(Boolean).join(' › ');
  const period = st.per === 'm' ? MONTHS_FULL[st.month] : `${MONTHS_SHORT[lo]}–${MONTHS_SHORT[hi]}`;
  const rows = list.map((m, i) => { const c = byId.get(m.categoryId); const d = Number(m.date.slice(8, 10)); return `<div class="mov-row${i === 0 ? ' first' : ''}"><div class="cls-name"><span class="cls-n">${esc(m.description)}</span><span class="note">${d} ${MONTHS_SHORT[monthOf(m)].toLowerCase()} · ${esc(c ? c.name : 'Sin clasificar')}</span></div><span class="cls-amt" style="color:${spendOf(m) < 0 ? '#047857' : '#052e26'}">${spendOf(m) > 0 ? '-' : '+'}${eur2(Math.abs(m.amountCents))}</span></div>`; }).join('');
  return {
    back: { href: '#/gastos', label: 'Gastos' },
    title: 'Movimientos',
    below: `${where} · ${period}`,
    html: `<div class="card"><div class="card-head"><span class="card-title">${list.length} movimientos</span><span class="note">${eur(total)}</span></div></div>
<div class="card list-card tight">${rows || '<p class="note pad-sm">No hay movimientos con este filtro.</p>'}</div>
<p class="note">*cambia el mes o el periodo en Gastos; la vista con gráfico y filtros por tipo llega en el siguiente paso</p>`,
    sheet: ''
  };
}
export const actMovimientos = () => false;
