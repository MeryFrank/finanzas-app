// Datos › Editar precios a mano: el precio actual de cada participación (en euros).
import { esc } from './html.js';
import { eur } from './ui.js';
import { positionsNow, portfolioTotals } from '../core/portfolio.js';

export function renderPrecios(ctx) {
  const data = ctx.session.data;
  const pos = positionsNow(data);
  const st = ctx.ui.precios || (ctx.ui.precios = { saved: false });
  const rows = pos.map((p) => `<label class="px-row"><span class="pos-m"><span class="pos-n">${esc(p.name)}</span><span class="note">${p.shares.toLocaleString('es-ES', { maximumFractionDigits: 4 })} part. · <span data-val="${esc(p.isin)}">${eur(p.valueCents)}</span></span></span><span class="px-in"><input type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" name="p-${esc(p.isin)}" data-shares="${p.shares}" value="${p.priceEur.toFixed(2).replace('.', ',')}" aria-label="Precio de ${esc(p.name)}">€</span></label>`).join('');
  return {
    back: { href: '#/datos', label: 'Datos' }, title: 'Editar precios', below: '*precio actual de cada participación',
    html: pos.length ? `<section class="card stack-sm"><span class="note">Valor total con estos precios</span><span class="big" id="prices-total">${eur(portfolioTotals(data).value)}</span></section>
<form class="stack" data-form="prices"><div class="card list-card">${rows}</div><button class="btn" type="submit">Guardar precios</button><div class="okmsg center-t" role="status">${st.saved ? 'Precios guardados' : ''}</div></form>` : '<section class="card"><p class="note">Todavía no hay posiciones: importa la cartera de DEGIRO en Datos.</p></section>',
    sheet: ''
  };
}
