// Piezas de interfaz comunes (misma apariencia que la maqueta). Todo texto externo pasa por esc().
import { esc } from './html.js';

/** Importe en euros enteros: 1.234 € */
export const eur = (cents) => (cents < 0 ? '-' : '') + Math.abs(Math.round(cents / 100)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
/** Importe con céntimos: 1.234,56 € */
export const eur2 = (cents) => (cents < 0 ? '-' : '') + (Math.abs(cents) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';

const INFO_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>';
const CLOSE_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>';
export const CHEVRON_DOWN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

/** Botón (i) de información. */
export const infoBtn = (key, label) => `<button class="info-btn" data-act="info" data-key="${esc(key)}" aria-label="${esc(label)}">${INFO_SVG}</button>`;

/** Hoja inferior (como la maqueta). `body` ya es HTML. */
export const sheet = (title, body, { closeAct = 'close-sheet', label = title, role = 'dialog' } = {}) => `
<div class="sheet-bg"><div class="sheet" role="${role}" aria-label="${esc(label)}">
  <div class="sheet-head"><h2>${esc(title)}</h2><button class="sheet-close" data-act="${closeAct}" aria-label="Cerrar">${CLOSE_SVG}</button></div>
  ${body}
</div></div>`;

/** Hoja de información con "Qué es" y "Cómo se calcula". */
export const infoSheet = (info) => sheet(info.t, `<p class="sheet-text">${esc(info.what)}</p>${info.how ? `<div class="how"><div class="how-t">Cómo se calcula</div><p>${esc(info.how)}</p></div>` : ''}`);

/** Chips de meses y selector de periodo (Mes / 3 meses / Accum.), con selector de año si hay varios. */
export function periodControls({ year, month, per, years }, monthNames) {
  const yearSel = years.length > 1
    ? `<div class="year-sel"><button class="chip-sm" data-act="year" data-d="-1" ${year <= years[0] ? 'disabled' : ''} aria-label="Año anterior">‹</button><span>${year}</span><button class="chip-sm" data-act="year" data-d="1" ${year >= years[years.length - 1] ? 'disabled' : ''} aria-label="Año siguiente">›</button></div>` : '';
  const months = monthNames.map((n, i) => `<button class="month" data-act="month" data-i="${i}" aria-pressed="${i === month}">${n}</button>`).join('');
  const pers = [['m', 'Mes'], ['3m', '3 meses'], ['ytd', 'Accum.']].map(([id, n]) => `<button class="seg-btn" data-act="per" data-id="${id}" aria-pressed="${id === per}">${n}</button>`).join('');
  return `${yearSel}<div class="months">${months}</div><div class="seg">${pers}</div>`;
}
