// Cartera: valor, crecimiento frente a lo aportado, ganancia por mes y peso por tipo; Posiciones y detalle de cada posición.
import { esc } from './html.js';
import { eur, eur2, infoBtn, infoSheet, sheet } from './ui.js';
import { positionsNow, portfolioTotals, growthChart, annualizedReturn, allocation, untypedPositions, positionHistory, ASSET_TYPES, CLASS_NAME, classOf } from '../core/portfolio.js';
import { MONTHS_SHORT, MONTHS_FULL } from '../core/analysis.js';

export const CARTERA_INFO = {
  valor: { t: 'Valor actual', what: 'Lo que valen hoy tus posiciones con los últimos precios. Toca la tarjeta para ver cada posición.', how: 'Participaciones × precio actual, sumado para todas las posiciones. Ganancia = valor actual − coste de compra de las posiciones cuyas compras has importado.' },
  rentab: { t: 'Rentabilidad anualizada', what: 'Cuánto ha ganado tu cartera al año, teniendo en cuenta cuándo metiste cada aportación. Es bruta: no descuenta impuestos ni comisiones y no incluye dividendos.', how: 'Método de Dietz modificado: ganancia ÷ capital medio invertido, llevado a un año. Con menos de 12 meses de historial sale una cifra poco fiable, por eso se muestra n/d.' },
  grafico: { t: 'Crecimiento de la cartera', what: 'La línea verde es el valor de tu cartera; la azul discontinua, lo que has aportado. La distancia entre las dos es lo que ha crecido tu cartera por sí sola, que es el crecimiento neto. El valor de cada mes se guarda cuando importas la cartera o cambias los precios, así que el gráfico se va llenando con el uso.', how: 'Crecimiento neto = (valor final − valor inicial) − aportaciones del periodo. El porcentaje se calcula sobre el valor inicial.' },
  peso: { t: 'Peso cartera', what: 'Cuánto pesa cada tipo de activo en tu cartera: renta fija (bonos y depósitos), renta variable (acciones y ETF) o híbrido. El objetivo y tu aportación mensual se cambian en Datos.', how: 'Valor de cada tipo ÷ valor total. Para llegar al objetivo de renta fija sin vender: (objetivo × valor total − renta fija) ÷ (1 − objetivo). Los meses son esa cifra ÷ tu aportación mensual.' }
};
const PERS = [['1m', '1M'], ['3m', '3M'], ['6m', '6M'], ['12m', '12M'], ['acum', 'Accum.']];
const pct1 = (r) => (r >= 0 ? '+' : '-') + (Math.abs(r) * 100).toFixed(1).replace('.', ',') + ' %';
const sgn = (c) => (c >= 0 ? '+' : '-') + eur(Math.abs(c));
const mname = (key) => MONTHS_SHORT[Number(key.slice(5, 7)) - 1];
const mfull = (key) => MONTHS_FULL[Number(key.slice(5, 7)) - 1];

export const carteraState = (ctx) => ctx.ui.cartera || (ctx.ui.cartera = { per: 'acum', pt: null, info: null, newOpen: false, pos: null, ppos: 'acum', tapG: null });
const segs = (per) => `<div class="seg five">${PERS.map(([id, n]) => `<button class="seg-btn" data-act="cper" data-id="${id}" aria-pressed="${id === per}">${n}</button>`).join('')}</div>`;
const back = (href, label) => ({ href, label });

function typeSheet(p) {
  return sheet('Nuevo activo detectado', `<p class="sheet-text">«${esc(p.name)}». ¿Qué tipo de activo es? Sirve para calcular el peso de renta fija y renta variable.</p>${ASSET_TYPES.map(([n, , sub]) => `<button class="menu-item col" data-act="set-type" data-isin="${esc(p.isin)}" data-kind="${esc(n)}"><strong>${n}</strong><span class="note">${sub}</span></button>`).join('')}`, { label: 'Tipo de activo' });
}

export function renderCartera(ctx) {
  const st = carteraState(ctx);
  const data = ctx.session.data;
  const tot = portfolioTotals(data);
  const rent = annualizedReturn(data);
  const g = growthChart(data, st.per);
  const al = allocation(data);
  const un = untypedPositions(data);
  const empty = tot.positions === 0;

  // gráfico de crecimiento
  const W = 334; const H = 130;
  const vals = g.months.map((m) => m.value).filter((v) => v !== null);
  const all = [...vals, ...g.months.map((m) => m.aportado)];
  const mn = (all.length ? Math.min(...all) : 0) * 0.97; const mx = (all.length ? Math.max(...all, 1) : 1) * 1.02;
  const n = g.months.length;
  const X = (i) => (n > 1 ? 6 + i / (n - 1) * (W - 12) : W / 2).toFixed(1);
  const Y = (v) => (H - (v - mn) / Math.max(mx - mn, 1) * H).toFixed(1);
  const valPts = g.months.map((m, i) => (m.value !== null ? `${X(i)},${Y(m.value)}` : null)).filter(Boolean);
  const apoPts = g.months.map((m, i) => `${X(i)},${Y(m.aportado)}`);
  const pt = st.pt != null && st.pt < n ? st.pt : null;
  const sel = pt != null ? g.months[pt] : null;
  const first = g.months.find((m) => m.value !== null);
  const lgNet = sel && sel.value !== null && first ? (sel.value - first.value) - (sel.aportado - first.aportado) : null;
  const chart = n ? `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Valor de la cartera y capital aportado en el periodo elegido">
 ${[32.5, 65, 97.5].map((y) => `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#e6f4ee" stroke-width="1"/>`).join('')}<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#cfe8de" stroke-width="1"/>
 ${valPts.length > 1 ? `<polygon points="${valPts.join(" ")} ${X(n - 1)},${H} ${valPts[0].split(",")[0]},${H}" fill="#2e8a47" fill-opacity="0.14"/><polyline points="${valPts.join(' ')}" fill="none" stroke="#2e8a47" stroke-width="2.5" stroke-linejoin="round"/>` : valPts.length === 1 ? `<circle cx="${valPts[0].split(',')[0]}" cy="${valPts[0].split(',')[1]}" r="5" fill="#2e8a47"/>` : ''}
 <polyline points="${apoPts.join(' ')}" fill="none" stroke="#2c4b7a" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>
 ${sel && sel.value !== null ? `<line x1="${X(pt)}" y1="0" x2="${X(pt)}" y2="${H}" stroke="#355a4f" stroke-width="1" stroke-dasharray="3 3"/><circle cx="${X(pt)}" cy="${Y(sel.value)}" r="5" fill="#2e8a47" stroke="#fff" stroke-width="2"/>` : ''}</svg>` : '<p class="note">*todavía no hay fotos de la cartera: importa las posiciones de DEGIRO en Datos</p>';
  const net = g.net;

  // ganancia o pérdida por mes
  const gv = g.months.map((m) => (m.value !== null ? m.value - m.aportado : null));
  const gnum = gv.filter((v) => v !== null);
  const gmx = Math.max(...gnum, 1) * 1.1; const gmn = Math.min(...gnum, 0) * 1.1; const grng = gmx - gmn; const HG = 100; const zeroG = gmx / grng * HG;
  const gbars = g.months.map((m, i) => { const v = gv[i]; if (v === null) return '<span class="col rel"></span>'; const hp = Math.max(2, Math.abs(v) / grng * HG); return `<button class="col rel" data-act="tap-g" data-i="${i}" aria-label="${mfull(m.key)}" style="background:${st.tapG === i ? '#e6f4ee' : 'transparent'}"><span style="position:absolute;left:14%;right:14%;top:${(v < 0 ? zeroG : zeroG - hp).toFixed(1)}px;height:${hp.toFixed(1)}px;background:${v < 0 ? '#d03e27' : '#2e8a47'};border-radius:3px"></span></button>`; }).join('');
  const tg = st.tapG != null ? g.months[st.tapG] : null;
  const tgText = tg && tg.value !== null ? `${mfull(tg.key)}: ${sgn(tg.value - tg.aportado)} (valor ${eur(tg.value)} − aportado ${eur(tg.aportado)})` : '*toca una barra para ver sus valores';

  // peso
  const pc = (r) => Math.round(r * 100) + ' %';
  const gap = al.total === 0 ? '' : al.needCents > 0 ? `Para llegar al ${al.targetFixedPct} % de renta fija sin vender, faltan ${eur(al.needCents)} en renta fija${al.months ? `: unos ${al.months} ${al.months === 1 ? 'mes' : 'meses'} con ${data.portfolioSettings.monthlyEur} € al mes.` : '. Indica tu aportación mensual en Datos para saber en cuántos meses.'}` : 'Tu renta fija ya está en el objetivo o por encima.';

  const sh = st.info ? infoSheet(CARTERA_INFO[st.info]) : st.newOpen && un.length ? typeSheet(un[0]) : '';
  return {
    html: empty ? `<section class="card"><p>Todavía no hay posiciones.</p><p class="note">*importa el CSV de posiciones de DEGIRO en Datos</p></section>` : `
<div class="kpi2 top">
  <div class="card k"><a class="kcard" href="#/cartera/posiciones" aria-label="Ver posiciones"><span class="kt">Valor actual</span><span class="kv">${eur(tot.value)}</span><span class="note" style="color:${tot.gain >= 0 ? '#047857' : '#b9341f'}">${tot.cost > 0 ? `${sgn(tot.gain)} · ${pct1(tot.gainPct)} total` : '*sin compras importadas'}</span><span class="link-s">Ver posiciones ›</span></a>${infoBtn('valor', 'Qué es el valor actual')}</div>
  <div class="card k"><span class="kt">Rentab. anualizada${infoBtn('rentab', 'Qué es la rentabilidad anualizada')}</span><span class="kv">${rent.ok ? pct1(rent.annual) : 'n/d'}</span><span class="note">${rent.ok ? '*bruta, sin dividendos' : `*se muestra con 12 meses de historial (llevas ${rent.months})`}</span></div>
</div>
<section class="card stack-sm"><span class="card-title">Crecimiento de la cartera${infoBtn('grafico', 'Cómo leer el crecimiento')}</span>${segs(st.per)}
  <div class="neto"><span class="note">Crecimiento neto</span><span class="kv" style="color:${net === null ? 'inherit' : net >= 0 ? '#047857' : '#b9341f'}">${net === null ? 'n/d' : `${sgn(net)}${g.netPct !== null ? ` (${pct1(g.netPct)})` : ''}`}</span><span class="note">${first ? `De ${eur(first.value)} a ${eur(g.months.filter((m) => m.value !== null).pop().value)} de valor · ${eur(g.months[n - 1].aportado - g.months[0].aportado)} aportados` : ''}</span></div>
  ${chart}
  ${n ? `<div class="xl"><span>${mname(g.months[0].key)}</span><span>${mname(g.months[n - 1].key)}</span></div>` : ''}
  ${n > 1 ? `<input type="range" aria-label="Elegir mes del gráfico" min="0" max="${n - 1}" step="1" value="${pt ?? 0}" data-change="chart-pt">` : ''}
  <div class="tap"><strong>${sel ? mfull(sel.key) : 'Toca el gráfico o mueve el control'}</strong>${sel ? `<br>${sel.value !== null ? 'Valor de la cartera: ' + eur(sel.value) : 'Sin foto de ese mes'}<br>Aportado: ${eur(sel.aportado)}${lgNet !== null && first ? `<br>Crecimiento neto desde ${mname(first.key)}: ${sgn(lgNet)}` : ''}` : '<br>*verás los valores de cada mes'}</div>
  <div class="legend"><span><i style="background:#2e8a47"></i>Valor de la cartera</span><span><i style="background:#2c4b7a"></i>Lo que has aportado</span></div>
  <div class="note">*${g.points < 2 ? 'el valor de cada mes se guarda al importar la cartera o cambiar los precios; con dos meses ya hay crecimiento neto' : 'el neto no cuenta tus aportaciones'}</div></section>
${gnum.length ? `<section class="card stack-sm"><div class="card-head"><span class="card-title">Ganancia o pérdida</span><span class="note">valor − aportado</span></div><div style="position:relative;height:${HG}px"><div class="gl" style="top:${zeroG.toFixed(1)}px;border-top:1px solid #94b8aa"></div><div class="cols">${gbars}</div></div><div class="chart-m">${g.months.map((m) => `<span>${mname(m.key).charAt(0)}</span>`).join('')}</div><div class="tap">${esc(tgText)}</div><div class="note">*si la cartera vale menos de lo que has aportado, la barra baja del cero y sale en rojo</div></section>` : ''}
<section class="card stack-sm"><div class="card-head"><span class="card-title">Peso cartera${infoBtn('peso', 'Cómo leer el peso de la cartera')}</span><span class="note">Objetivo ${al.targetFixedPct} / ${100 - al.targetFixedPct}</span></div>
  <div class="bar">${[['fija', '#2c4b7a'], ['variable', '#10b981'], ['hibrido', '#ebb53a']].map(([k, c]) => `<span style="flex:none;width:${(al.share[k] * 100).toFixed(1)}%;background:${c}"></span>`).join('')}</div>
  <div class="legend"><span><i style="background:#2c4b7a"></i>Renta fija ${pc(al.share.fija)}</span><span><i style="background:#10b981"></i>Renta variable ${pc(al.share.variable)}</span><span><i style="background:#ebb53a"></i>Híbrido ${pc(al.share.hibrido)}</span></div>
  <div class="note">*acciones y ETF cuentan como renta variable; bonos y depósitos, como renta fija</div><div class="tap">${esc(gap)}</div></section>
${un.length ? `<button class="banner" data-act="open-new"><span>Nuevo activo detectado</span><span aria-hidden="true">→</span></button>` : ''}`,
    sheet: sh
  };
}

export function renderPosiciones(ctx) {
  const data = ctx.session.data;
  const pos = positionsNow(data);
  const tot = portfolioTotals(data);
  const groups = ['variable', 'fija', 'hibrido'].map((k) => {
    const items = pos.filter((p) => classOf(p.kind) === k);
    return `<section class="card list-card"><div class="card-head pad"><span class="card-title">${CLASS_NAME[k]}</span><span class="note">${eur(items.reduce((a, p) => a + p.valueCents, 0))}</span></div>${items.length ? items.map((p) => `<a class="pos-row" href="#/cartera/posicion" data-act="open-pos" data-isin="${esc(p.isin)}"><span class="pos-m"><strong>${esc(p.name)}</strong><span class="note">${p.kind ? esc(p.kind) : 'Sin tipo'} · ${p.shares.toLocaleString('es-ES', { maximumFractionDigits: 4 })} part.</span></span><span class="pos-v"><span><strong>${eur(p.valueCents)}</strong>${p.growth !== null ? `<span class="note" style="color:${p.growth >= 0 ? '#047857' : '#b9341f'}">${pct1(p.growth)}</span>` : '<span class="note">sin coste</span>'}</span><span class="chev" aria-hidden="true">›</span></span></a>`).join('') : '<p class="note pad-sm">Sin posiciones todavía</p>'}</section>`;
  }).join('');
  return { back: back('#/cartera', 'Cartera'), title: 'Posiciones', below: `Valor total ${eur(tot.value)}`, html: `${groups}<p class="note">*el crecimiento es el acumulado desde la compra, según las compras importadas</p>`, sheet: '' };
}

export function renderPosicion(ctx) {
  const st = carteraState(ctx);
  const data = ctx.session.data;
  const p = positionsNow(data).find((x) => x.isin === st.pos);
  if (!p) return { back: back('#/cartera/posiciones', 'Posiciones'), title: 'Posición', html: '<section class="card"><p class="note">No encuentro esa posición.</p></section>', sheet: '' };
  const hist = positionHistory(data, p.isin);
  const win = { '1m': 1, '3m': 3, '6m': 6, '12m': 12, acum: 99 }[st.ppos];
  const rows = hist.slice(-(win + 1));
  const W = 334;
  const line = (arr, H, key, color) => { if (arr.length < 2) return ''; const mn = Math.min(...arr.map((r) => r[key])) * 0.97; const mx = Math.max(...arr.map((r) => r[key]), 1) * 1.02; const pts = arr.map((r, i) => `${(i / (arr.length - 1) * W).toFixed(1)},${(H - (r[key] - mn) / Math.max(mx - mn, 1e-9) * H).toFixed(1)}`); return `<polygon points="${pts.join(' ')} ${W},${H} 0,${H}" fill="${color}" fill-opacity="0.15"/><polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`; };
  const perf = rows.length >= 2 && rows[0].priceEur ? rows[rows.length - 1].priceEur / rows[0].priceEur - 1 : null;
  const rets = rows.filter((r) => r.ret !== null);
  const rmx = Math.max(...rets.map((r) => Math.abs(r.ret)), 0.001); const HB = 100; const zero = HB / 2;
  const rbars = rets.map((r) => { const h = Math.max(2, Math.abs(r.ret) / rmx * (HB / 2)); return `<span class="col rel"><span style="position:absolute;left:14%;right:14%;top:${(r.ret < 0 ? zero : zero - h).toFixed(1)}px;height:${h.toFixed(1)}px;background:${r.ret < 0 ? '#d03e27' : '#2e8a47'};border-radius:3px"></span></span>`; }).join('');
  const table = [...rows].reverse().map((r) => `<div class="pm-row"><span>${mname(r.key)} ${r.key.slice(0, 4)}</span><span>${r.shares.toLocaleString('es-ES', { maximumFractionDigits: 4 })}</span><span>${eur(r.valueCents)}</span><span style="color:${r.ret === null ? 'inherit' : r.ret >= 0 ? '#047857' : '#b9341f'}">${r.ret === null ? '–' : pct1(r.ret)}</span></div>`).join('');
  return {
    back: back('#/cartera/posiciones', 'Posiciones'), title: p.name, below: p.kind || 'Sin tipo',
    html: `${segs(st.ppos)}
<section class="card stack-sm"><div class="kpis"><div class="kpi"><span class="kpi-l">Valor actual</span><span class="kpi-n sm">${eur(p.valueCents)}</span></div><div class="kpi"><span class="kpi-l">Participaciones</span><span class="kpi-n sm">${p.shares.toLocaleString('es-ES', { maximumFractionDigits: 4 })}</span></div><div class="kpi"><span class="kpi-l">Precio ${st.ppos === 'acum' ? 'acum.' : st.ppos.replace('m', ' meses')}</span><span class="kpi-n sm">${perf === null ? 'n/d' : pct1(perf)}</span></div></div>
 <div class="note">Precio por participación: ${eur2(Math.round(p.priceEur * 100))}${p.manualPrice ? ' (puesto a mano)' : ''}</div></section>
<section class="card stack-sm"><span class="card-title">Valor de la posición</span>${rows.length >= 2 ? `<svg viewBox="0 0 ${W} 120" width="100%" role="img" aria-label="Evolución del valor de la posición"><line x1="0" y1="120" x2="${W}" y2="120" stroke="#cfe8de"/>${line(rows, 120, 'valueCents', '#2e8a47')}</svg><div class="xl"><span>${mname(rows[0].key)}</span><span>${mname(rows[rows.length - 1].key)}</span></div>` : '<p class="note">*el historial de la posición se guarda al importar la cartera cada mes; con dos meses ya se dibuja</p>'}</section>
${rets.length ? `<section class="card stack-sm"><span class="card-title">Variación mensual del precio</span><div style="position:relative;height:${HB}px"><div class="gl" style="top:${zero}px;border-top:1px solid #94b8aa"></div><div class="cols">${rbars}</div></div><div class="chart-m">${rets.map((r) => `<span>${mname(r.key).charAt(0)}</span>`).join('')}</div><div class="note">*los meses en que el precio baja salen por debajo del cero y en rojo</div></section>` : ''}
${rows.length >= 2 ? `<section class="card stack-sm"><span class="card-title">Participaciones</span><svg viewBox="0 0 ${W} 70" width="100%" role="img" aria-label="Evolución del número de participaciones"><line x1="0" y1="70" x2="${W}" y2="70" stroke="#cfe8de"/>${line(rows, 70, 'shares', '#2c4b7a')}</svg></section>` : ''}
${rows.length ? `<section class="card list-card"><div class="card-head pad"><span class="card-title">Mes a mes</span><span class="note">Valor · Rentab.</span></div>${table}<p class="note pad-sm">*la rentabilidad mensual es la variación del precio de un mes al siguiente</p></section>` : ''}`,
    sheet: ''
  };
}

export async function actCartera(name, el, ctx) {
  const st = carteraState(ctx);
  if (name === 'cper') { st.per = el.dataset.id; st.pt = null; st.tapG = null; }
  else if (name === 'info') st.info = el.dataset.key;
  else if (name === 'close-sheet') { st.info = null; st.newOpen = false; }
  else if (name === 'open-new') st.newOpen = true;
  else if (name === 'set-type') { await ctx.session.setAssetType(el.dataset.isin, el.dataset.kind); st.newOpen = untypedPositions(ctx.session.data).length > 0; }
  else if (name === 'chart-pt') st.pt = Number(el.value);
  else if (name === 'tap-g') st.tapG = st.tapG === Number(el.dataset.i) ? null : Number(el.dataset.i);
  else if (name === 'open-pos') { st.pos = el.dataset.isin; st.ppos = 'acum'; }
  else return false;
  return true;
}
export function actPosicion(name, el, ctx) {
  const st = carteraState(ctx);
  if (name === 'cper') st.ppos = el.dataset.id; else return false;
  return true;
}
