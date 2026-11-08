// Pantalla Ahorro: saldo del fondo monetario, objetivo mensual, evolución, ahorro de cada mes y cuadre de cuentas.
import { esc } from './html.js';
import { eur, infoBtn, infoSheet } from './ui.js';
import { savingsSeries, cuadre, fundYears, lastFundMonth } from '../core/savings.js';
import { pendingMovements, MONTHS_SHORT, MONTHS_FULL } from '../core/analysis.js';
import { parseBudget } from './presupuesto.js';

export const AHORRO_INFO = {
  saldo: { t: 'Saldo de la cuenta remunerada', what: 'Todo el dinero que tienes ahora en tu fondo monetario. Es tu colchón: no suma a la independencia financiera.', how: 'Participaciones del fondo × último precio conocido. Incluye lo que has aportado más la remuneración acumulada.' },
  objetivo: { t: 'Objetivo mensual de ahorro', what: 'Es opcional. Si escribes una cantidad, la app compara lo que ahorras cada mes con ella y lo marca en los gráficos. Si lo dejas vacío, aparece "sin objetivo".', how: '' },
  saldoGraf: { t: 'Evolución del saldo', what: 'Cada barra es el saldo al final de un mes. La parte azul es lo que has aportado tú; la verde, lo que ha generado la remuneración del fondo.', how: 'Aportado = compras − ventas acumuladas. Remuneración = saldo − aportado.' },
  mensual: { t: 'Ahorro de cada mes', what: 'Lo que has aportado al fondo cada mes, menos lo que has retirado. Si un mes retiras más de lo que aportas, la barra baja de la línea del cero y sale en rojo. Si hay objetivo, la línea roja discontinua lo marca: las barras verdes lo cumplen y las amarillas se quedan por debajo.', how: 'Ahorro del mes = compras − ventas de participaciones del mes.' },
  cuadre: { t: 'Cuadre de cuentas', what: 'Comprueba que todo el dinero que entra tiene un destino: lo que ingresas se reparte entre gasto, ahorro e inversión, y la diferencia debe ser 0. Se comprueba mes a mes y en el acumulado (sin contar el primer mes, que parte de un saldo inicial).', how: 'Diferencia = ingresos − gasto − ahorro − invertido. Si no es 0, suele haber movimientos sin clasificar, dinero que sigue en la cuenta corriente o aportaciones que aún no has importado.' }
};

const state = (ctx) => ctx.ui.ahorro || (ctx.ui.ahorro = { year: null, info: null, tapB: null, tapA: null });
const n0 = (c) => eur(c).replace(' €', '');

export function renderAhorro(ctx) {
  const st = state(ctx);
  const data = ctx.session.data;
  const years = fundYears(data);
  const last = lastFundMonth(data);
  if (st.year == null) st.year = last ? last.year : Number(ctx.nowIso.slice(0, 4));
  const series = savingsSeries(data, st.year);
  const withData = series.filter((x) => x.has);
  const cur = withData.length ? withData[withData.length - 1] : null;
  const obj = data.savingsTarget > 0 ? data.savingsTarget * 100 : 0;
  const net = cur ? cur.net : 0;
  const yearSel = years.length > 1 ? `<div class="year-sel"><button class="chip-sm" data-act="year" data-d="-1" ${st.year <= years[0] ? 'disabled' : ''} aria-label="Año anterior">‹</button><span>${st.year}</span><button class="chip-sm" data-act="year" data-d="1" ${st.year >= years[years.length - 1] ? 'disabled' : ''} aria-label="Año siguiente">›</button></div>` : '';

  // Evolución del saldo
  const mxb = Math.max(1, ...series.map((x) => x.saldo));
  const bal = series.map((x) => `<button class="col stack" data-act="tap-bal" data-i="${x.m}" aria-label="${MONTHS_FULL[x.m]}" style="background:${st.tapB === x.m ? '#e6f4ee' : 'transparent'}"><span style="display:block;height:${x.has && x.remun > 0 ? Math.max(3, Math.round(x.remun / mxb * 130)) : 0}px;background:#10b981;border-radius:3px 3px 0 0"></span><span style="display:block;height:${x.has ? Math.round(Math.max(0, x.aportado) / mxb * 130) : 0}px;background:#2c4b7a"></span></button>`).join('');
  const tb = st.tapB != null ? series[st.tapB] : null;
  const tapBal = !tb ? '*toca una columna para ver sus valores' : !tb.has ? `${MONTHS_FULL[tb.m]}: todavía sin datos` : `${MONTHS_FULL[tb.m]}: saldo ${eur(tb.saldo)} · ahorrado ${eur(tb.aportado)} · remuneración ${eur(tb.remun)}`;

  // Ahorro de cada mes
  const vals = series.map((x) => (x.has ? x.net : 0));
  const HM = 120;
  const maxPos = Math.max(obj, ...vals, 1);
  const maxNeg = Math.max(0, ...vals.map((v) => -v));
  const scale = HM / (maxPos + maxNeg);
  const zeroY = maxPos * scale;
  const okMonths = withData.filter((x) => obj && x.net >= obj).length;
  const monthly = series.map((x) => {
    const v = vals[x.m]; const h = x.has && v !== 0 ? Math.max(2, Math.abs(v) * scale) : 0; const neg = v < 0;
    const bg = neg ? '#d03e27' : obj ? (v >= obj ? '#059669' : '#ebb53a') : '#2c4b7a';
    return `<button class="col rel" data-act="tap-mon" data-i="${x.m}" aria-label="${MONTHS_FULL[x.m]}" style="background:${st.tapA === x.m ? '#e6f4ee' : 'transparent'}"><span style="position:absolute;left:14%;right:14%;top:${(neg ? zeroY : zeroY - h).toFixed(1)}px;height:${h.toFixed(1)}px;background:${bg};border-radius:3px"></span></button>`;
  }).join('');
  const ta = st.tapA != null ? series[st.tapA] : null;
  const tapMon = !ta ? '*toca una columna para ver sus valores' : !ta.has ? `${MONTHS_FULL[ta.m]}: todavía sin datos` : `${MONTHS_FULL[ta.m]}: ${ta.net < 0 ? 'has retirado ' + eur(-ta.net) + ' del fondo' : 'ahorrado ' + eur(ta.net)}${obj && ta.net >= 0 ? (ta.net >= obj ? ' · objetivo cumplido' : ' · te faltan ' + eur(obj - ta.net)) : ''}`;

  // Cuadre
  const cq = cuadre(data, st.year);
  const okd = (d) => Math.abs(d) < 100;
  const cell = (r) => (r.diff === null ? '<span style="color:#4a665d">n/a</span>' : okd(r.diff) ? '<span style="color:#047857">✓</span>' : `<span style="color:#b9341f">${n0(r.diff)}</span>`);
  const cuadreRows = cq.rows.map((r) => `<div class="cq-row"><span class="l">${MONTHS_SHORT[r.m]}</span><span>${n0(r.ingresos)}</span><span>${n0(r.gasto)}</span><span>${n0(r.ahorro)}</span><span>${n0(r.invertido)}</span>${cell(r)}</div>`).join('')
    + (cq.total ? `<div class="cq-row tot"><span class="l">Acum.</span><span>${n0(cq.total.ingresos)}</span><span>${n0(cq.total.gasto)}</span><span>${n0(cq.total.ahorro)}</span><span>${n0(cq.total.invertido)}</span>${cell({ diff: cq.total.diff })}</div>` : '');
  const pend = pendingMovements(data).length;

  const empty = !data.fundEvents.length;
  return {
    above: 'Cuenta remunerada',
    html: `${yearSel}
<div class="kpi2">
  <div class="card k"><span class="kt">Saldo${infoBtn('saldo', 'Qué es el saldo')}</span><span class="kv">${cur ? eur(cur.saldo) : 'Sin datos'}</span><span class="note">${cur ? `*incluye ${eur(cur.remun)} de remuneración` : '*importa el CSV del fondo monetario en Datos'}</span></div>
  <div class="card k"><span class="kt sp">Ahorrado este mes</span><span class="kv">${cur ? eur(net) : '–'}</span><div class="prog"><div style="width:${obj && net > 0 ? Math.min(100, Math.round(net / obj * 100)) : 0}%"></div></div><span class="note" style="color:${obj && net >= obj ? '#047857' : '#4a665d'};font-weight:500">${obj ? (net >= obj ? `Objetivo ${eur(obj)} · cumplido` : `Objetivo ${eur(obj)} · te faltan ${eur(obj - net)}`) : '*sin objetivo por ahora'}</span></div>
</div>
<section class="card stack-sm"><span class="card-title">Objetivo mensual de ahorro${infoBtn('objetivo', 'Qué es el objetivo de ahorro')}</span>
  <label class="obj-row">Objetivo (€ al mes)<span class="bud-in"><input id="objah" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-change="save-target" placeholder="Sin objetivo" value="${data.savingsTarget || ''}" style="width:110px" aria-label="Objetivo mensual de ahorro">€</span></label>
  <div class="note">${obj ? `*has cumplido el objetivo en ${okMonths} de ${withData.length} meses` : '*sin objetivo por ahora; se puede crear cuando quieras'}</div></section>
<section class="card stack-sm"><span class="card-title">Evolución del saldo${infoBtn('saldoGraf', 'Cómo leer la evolución del saldo')}</span>
  <div class="bars h140">${bal}</div><div class="chart-m">${MONTHS_SHORT.map((n) => `<span>${n.charAt(0)}</span>`).join('')}</div>
  <div class="legend"><span><i style="background:#2c4b7a"></i>Lo que has ahorrado ${cur ? eur(cur.aportado) : '0 €'}</span><span><i style="background:#10b981"></i>Remuneración ${cur ? eur(cur.remun) : '0 €'}</span></div>
  <div class="tap">${esc(tapBal)}</div></section>
<section class="card stack-sm"><span class="card-title">Ahorro de cada mes${infoBtn('mensual', 'Cómo leer el ahorro de cada mes')}</span>
  <div style="position:relative;height:${HM}px"><div class="gl" style="top:${zeroY.toFixed(1)}px;border-top:1px solid #94b8aa"></div>${obj ? `<div class="gl" style="top:${(zeroY - obj * scale).toFixed(1)}px;border-top:2px dashed #b9341f"></div>` : ''}<div class="cols">${monthly}</div></div>
  <div class="chart-m">${MONTHS_SHORT.map((n) => `<span>${n.charAt(0)}</span>`).join('')}</div>
  <div class="tap">${esc(tapMon)}</div>
  <div class="note">${obj ? `*línea roja: objetivo de ${eur(obj)} al mes` : '*sin objetivo, por eso no hay línea de referencia'}</div></section>
<section class="card stack-sm"><span class="card-title">Cuadre de cuentas${infoBtn('cuadre', 'Qué es el cuadre de cuentas')}</span>
  ${cq.rows.length ? `<div class="cq"><div class="cq-row head"><span class="l">Mes</span><span>Ingresos</span><span>Gasto</span><span>Ahorro</span><span>Invert.</span><span>Dif.</span></div>${cuadreRows}</div>` : '<p class="note">*todavía no hay datos para comprobar</p>'}
  ${pend > 0 ? `<a class="banner" href="#/gastos/clasificar"><span>${pend === 1 ? '1 movimiento sin clasificar' : pend + ' movimientos sin clasificar'}</span><span aria-hidden="true">→</span></a>` : ''}</section>`,
    sheet: st.info ? infoSheet(AHORRO_INFO[st.info]) : ''
  };
}

export async function actAhorro(name, el, ctx) {
  const st = state(ctx);
  if (name === 'year') st.year += Number(el.dataset.d);
  else if (name === 'info') st.info = el.dataset.key;
  else if (name === 'close-sheet') st.info = null;
  else if (name === 'tap-bal') st.tapB = st.tapB === Number(el.dataset.i) ? null : Number(el.dataset.i);
  else if (name === 'tap-mon') st.tapA = st.tapA === Number(el.dataset.i) ? null : Number(el.dataset.i);
  else if (name === 'save-target') await ctx.session.setSavingsTarget(parseBudget(el.value));
  else return false;
  return true;
}
