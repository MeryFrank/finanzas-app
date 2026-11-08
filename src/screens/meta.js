// Meta: fecha de independencia financiera, capital necesario, tasa de retiro segura y proyección a 40 años.
import { esc } from './html.js';
import { eur, infoBtn, infoSheet } from './ui.js';
import { realParams, project, dateOf, currentAge, YEARS } from '../core/independence.js';
import { MONTHS_SHORT } from '../core/analysis.js';

export const META_INFO = {
  calc: { t: 'Cómo se calcula la independencia financiera', what: 'Es el mes en que lo que tienes invertido llega al capital necesario para poder retirar cada mes la cantidad que has fijado, sin depender de un sueldo. El ahorro en la cuenta remunerada no cuenta.', how: '1) Retirada mensual × 12 ÷ (1 − impuestos) = lo que tendrías que retirar en bruto al año. 2) Ese importe ÷ tasa de retiro segura (calculada hasta los 90 años) = capital necesario en ese momento. 3) Se proyecta tu inversión mes a mes con tu aportación mensual y la rentabilidad real (rentabilidad − inflación). 4) La fecha es el primer mes en que la inversión supera el capital necesario.' },
  fecha: { t: 'Fecha de independencia', what: 'El momento en el que tu inversión llega al capital necesario y podrías vivir de las retiradas, sin depender de un sueldo. Solo cuenta lo que inviertes: el ahorro en cuenta remunerada no suma.', how: 'Se proyecta tu inversión mes a mes con tu aportación y la rentabilidad real (descontada la inflación) y se busca el primer mes en que supera el capital necesario.' },
  necesario: { t: 'Capital necesario', what: 'El dinero que tienes que tener invertido el día que dejes de trabajar para que las retiradas anuales cubran la retirada mensual que has fijado, incluidos los impuestos de esas retiradas.', how: 'Retirada mensual × 12 ÷ (1 − impuestos) ÷ tasa de retiro. Está en euros de hoy.' },
  grafico: { t: 'Cómo leer el gráfico', what: 'La línea verde es tu inversión proyectada en los próximos 40 años, en euros de hoy. La línea azul discontinua es el capital necesario. Donde se cruzan está tu fecha de independencia.', how: '' },
  rentab: { t: 'Rentabilidad anual (bruta)', what: 'Lo que ganan tus inversiones cada año antes de impuestos y comisiones, y sin descontar la inflación. Es un supuesto: en el escenario real viene de la rentabilidad anualizada de tu cartera (con menos de 12 meses de historial se usa una referencia del 6 %); en el escenario de prueba puedes cambiarla.', how: 'La rentabilidad real que se aplica al crecimiento es la bruta menos la inflación: (1 + rentabilidad) ÷ (1 + inflación) − 1.' },
  inflacion: { t: 'Inflación anual', what: 'La subida media anual de los precios. Hace que tu gasto futuro cueste más euros, por eso los importes se muestran en euros de hoy. En el escenario real viene del IPC que escribes una vez al año en Datos.', how: 'Se resta de la rentabilidad bruta para obtener la rentabilidad real.' },
  inversion: { t: 'Inversión mensual', what: 'Lo que aportas cada mes a fondos, ETF o acciones. Es lo único que suma a tu independencia financiera; el dinero que dejas en la cuenta remunerada no cuenta. En el escenario real viene de tu aportación mensual en Datos.', how: 'Se añade cada mes al capital invertido y crece con la rentabilidad real.' },
  retirada: { t: 'Retirada mensual deseada', what: 'El dinero neto que quieres poder sacar cada mes de tus inversiones cuando seas independiente, en euros de hoy. Es lo que más importa: cambiarla mueve tu fecha de independencia. La tasa de retiro la calcula la app sola y marca el máximo que puedes retirar.', how: 'Se multiplica por 12 y se divide entre (1 − impuestos) para obtener lo que habría que retirar en bruto al año.' },
  retiro: { t: 'Tasa de retiro segura', what: 'El porcentaje de tu capital que puedes retirar cada año (al mes, ese porcentaje ÷ 12) sin quedarte sin dinero antes de los 90 años. No la eliges tú: la app la calcula con la rentabilidad real y los años que faltan hasta los 90. Cuanto antes te retires, más años hay que cubrir y más baja es la tasa; por eso el capital necesario baja con el tiempo.', how: 'Tasa = r ÷ (1 − (1 + r)^−años), con r la rentabilidad real y años = 90 − tu edad al retirarte. Capital necesario = retirada anual bruta ÷ tasa. Máximo mensual = capital × tasa × (1 − impuestos) ÷ 12. Supone ir gastando el capital hasta los 90.' },
  extra: { t: 'Ingresos extra', what: 'Dinero puntual que podrías invertir en una fecha concreta: una paga extra, una herencia, la venta de algo, un bonus. Elige el año, el mes y el importe, y la fecha de independencia se recalcula al momento. Solo existe en el escenario de prueba, para jugar con distintos casos.', how: 'El importe (en euros de hoy) se suma a lo que tienes invertido en el mes elegido y a partir de ahí crece con la rentabilidad real. Se supone que lo inviertes entero.' },
  impuestos: { t: 'Impuestos sobre las retiradas', what: 'Parte de lo que retiras que se va en impuestos. En España tributan las ganancias, no todo lo retirado, con tipos aproximados entre el 19 % y el 28 % en el ahorro. El 15 % es un tipo medio de ejemplo.', how: 'Gasto anual ÷ (1 − impuestos) es lo que tendrías que retirar en bruto.' },
  edad: { t: 'Tu edad', what: 'Sirve para calcular cuántos años hay que cubrir hasta los 90 y, con ellos, la tasa de retiro segura. Se guarda cifrada en tu móvil y sube un año cada año.', how: '' }
};
const comma = (n) => String(n).replace('.', ',');
const fmt = (v) => eur(Math.round(v) * 100);

export const metaState = (ctx) => ctx.ui.meta || (ctx.ui.meta = { esc: 'Real', pt: null, info: null, dret: null, dtax: null, p: null, extras: [], xy: null, xm: 6, xa: 10000 });

export function renderMeta(ctx) {
  const st = metaState(ctx);
  const data = ctx.session.data;
  const now = new Date(ctx.nowIso);
  const real = st.esc === 'Real';
  const base = realParams(data, now.getFullYear());
  const sheetHtml = st.info ? infoSheet(META_INFO[st.info]) : '';
  if (base.age === null) {
    return { sheet: sheetHtml, html: `<section class="card stack"><h2>Tu edad</h2><p class="sheet-text">Para calcular la independencia necesito saber cuántos años tienes: de ella depende la tasa de retiro segura hasta los 90 años.</p><label class="obj-row">Edad<span class="bud-in"><input type="text" inputmode="numeric" autocomplete="off" data-change="m-age" placeholder="Años" style="width:90px" aria-label="Tu edad en años"></span></label><p class="note">*se guarda cifrada en tu móvil y sube sola cada año</p></section>` };
  }
  if (!real && !st.p) st.p = { ret: base.ret, inf: base.inf, inv: base.inv, tax: base.tax, retirada: base.retirada };
  const saved = { retirada: base.retirada, tax: base.tax };
  const draftRet = st.dret ?? saved.retirada; const draftTax = st.dtax ?? saved.tax;
  const hasDraft = real && (draftRet !== saved.retirada || draftTax !== saved.tax);
  const p = real ? { ...base, retirada: draftRet, tax: draftTax } : { ...base, ...st.p };
  const xy = st.xy ?? now.getFullYear() + 4;
  const extras = real ? [] : st.extras;
  const baseRes = project(p);
  const res = extras.length ? project(p, extras) : baseRes;
  const { series, needS, reached, capReached } = res;
  const dtext = (m) => { const d = dateOf(now, m); return `${MONTHS_SHORT[d.month]} ${d.year}`; };
  const wNow = res.w(reached !== null ? reached : 0);
  const need = reached !== null ? res.need(reached) : needS[0];
  const net = 1 - p.tax / 100;
  const maxToday = p.start * res.w(0) * net / 12;
  const maxIndep = capReached * wNow * net / 12;
  const maxSust = series[YEARS] * res.w(YEARS * 12) * net / 12;
  const sliderMax = Math.max(500, Math.floor(maxSust / 50) * 50, Math.ceil(p.retirada / 50) * 50);

  // gráfico
  const W = 334; const H = 150;
  const maxV = Math.max(...needS) * 1.15;
  const pts = (arr) => arr.map((v, i) => `${(i / YEARS * W).toFixed(1)},${(H - Math.min(Math.max(v, 0), maxV) / maxV * H).toFixed(1)}`);
  const line = pts(series).join(' ');
  const pt = st.pt;
  const marker = pt != null ? `<line x1="${(pt / YEARS * W).toFixed(1)}" y1="0" x2="${(pt / YEARS * W).toFixed(1)}" y2="${H}" stroke="#355a4f" stroke-width="1" stroke-dasharray="3 3"/><circle cx="${(pt / YEARS * W).toFixed(1)}" cy="${(H - Math.min(Math.max(series[pt], 0), maxV) / maxV * H).toFixed(1)}" r="5" fill="#2e8a47" stroke="#fff" stroke-width="2"/>` : '';
  const y0 = now.getFullYear();

  let dateText = 'No alcanzable'; let subText = 'Prueba a subir la inversión mensual o la rentabilidad';
  if (reached !== null) {
    dateText = dtext(reached); subText = `Faltan ${comma((reached / 12).toFixed(1))} años`;
    if (extras.length && baseRes.reached !== null && baseRes.reached !== reached) { const d = baseRes.reached - reached; subText += ` · ${d} ${d === 1 ? 'mes antes' : 'meses antes'} que sin los ingresos extra`; }
  } else if (extras.length) subText = 'Ni con los ingresos extra llega; prueba a subir la inversión mensual o la rentabilidad';
  const hero = reached !== null ? 'background:linear-gradient(135deg,#047857,#0f766e);color:#fff' : 'background:#fdeceA;border:1px solid #d03e27;color:#052e26';
  const subCol = reached !== null ? '#d1fae5' : '#7a2315';

  const range = (key, min, max, step, value) => `<input type="range" aria-label="${esc(key)}" min="${min}" max="${max}" step="${step}" value="${value}" data-change="m-set" data-key="${key}">`;
  const row = (label, info, valueLabel, body) => `<div class="stack-sm"><div class="obj-row"><span class="lbl">${label}${infoBtn(info, 'Qué es: ' + label)}</span><strong>${valueLabel}</strong></div>${body}</div>`;
  const locked = (href, text) => `<a class="link" href="${href}" style="display:flex;align-items:center;min-height:32px;font-size:12px">${text}</a>`;
  const rows = [
    row('Retirada mensual deseada', 'retirada', `${fmt(p.retirada)} / mes`, `${range('retirada', 500, sliderMax, 50, p.retirada)}<span class="note">*neto, en euros de hoy; antes de impuestos serían ${fmt(p.retirada / net)} al mes. Máximo sostenible con tu inversión actual: ${fmt(maxSust)} al mes a los ${Math.round(p.age + YEARS)} años</span>`),
    row('Impuestos sobre las retiradas', 'impuestos', `${comma(p.tax)} %`, `${range('tax', 0, 30, 1, p.tax)}<span class="note">*porcentaje de lo que retiras que se va en impuestos</span>`),
    row('Rentabilidad anual (bruta)', 'rentab', `${comma(p.ret)} %`, real ? locked('#/cartera', `*viene de Cartera${base.retFromData ? '' : ' (referencia del 6 % hasta tener 12 meses de historial)'} · Ver cartera`) : range('ret', 0, 12, 0.5, p.ret)),
    row('Inflación anual', 'inflacion', `${comma(p.inf)} %`, real ? locked('#/datos', '*viene del IPC que escribes en Datos · Cambiar IPC') : range('inf', 0, 6, 0.5, p.inf)),
    row('Inversión mensual', 'inversion', `${fmt(p.inv)} / mes`, real ? locked('#/datos', '*viene de tu aportación mensual en Datos · Cambiarla') : range('inv', 0, 3000, 50, p.inv)),
    `<label class="obj-row">Tu edad${infoBtn('edad', 'Qué es: tu edad')}<span class="bud-in"><input type="text" inputmode="numeric" autocomplete="off" data-change="m-age" value="${p.age}" style="width:70px" aria-label="Tu edad en años"></span></label>`
  ].join('');

  const xmLabel = MONTHS_SHORT[st.xm - 1];
  const extraCard = real ? '' : `<section class="card stack-sm"><div class="card-head"><span class="card-title">Ingresos extra${infoBtn('extra', 'Qué son los ingresos extra')}</span></div>
  <div class="stack-sm"><div class="obj-row"><span>Año</span><strong>${xy}</strong></div>${range('xy', y0, y0 + 34, 1, xy)}</div>
  <div class="stack-sm"><div class="obj-row"><span>Mes</span><strong>${xmLabel}</strong></div>${range('xm', 1, 12, 1, st.xm)}</div>
  <div class="stack-sm"><div class="obj-row"><span>Importe</span><strong>${fmt(st.xa)}</strong></div>${range('xa', 1000, 200000, 1000, st.xa)}<span class="note">*en euros de hoy; se supone que lo inviertes entero. Si eliges una fecha pasada, cuenta desde este mes</span></div>
  <button class="btn" data-act="m-add">Añadir ingreso extra</button>
  ${extras.length ? `${[...extras].sort((a, b) => a.m - b.m).map((e) => `<div class="obj-row xrow"><span>${dtext(e.m)} · ${fmt(e.a)}</span><button class="icon-btn" data-act="m-del" data-m="${e.m}" data-a="${e.a}" aria-label="Quitar ingreso extra">✕</button></div>`).join('')}<span class="note">Total añadido: ${fmt(extras.reduce((a, e) => a + e.a, 0))}</span><span class="note"><strong>Sin los extra: ${baseRes.reached !== null ? dtext(baseRes.reached) : 'no alcanzable'} · Con los extra: ${reached !== null ? dtext(reached) : 'no alcanzable'}</strong></span><button class="btn ghost" data-act="m-clear">Quitar todos</button>` : '<span class="note">*todavía no has añadido ninguno</span>'}</section>`;

  const draft = hasDraft ? `<div class="draft" role="alertdialog" aria-label="Confirmar cambio en el escenario real"><span><strong>¿Estás segura?</strong> Esto cambia las proyecciones actuales reales. Este cambio no se puede deshacer.</span><div class="draft-b"><button class="btn ghost" data-act="m-cancel">Cancelar</button><button class="btn" data-act="m-confirm">Sí, cambiar</button></div></div>` : '';

  return {
    below: real ? 'Escenario real' : 'Escenario de prueba',
    sheet: draft ? `<div class="draft-wrap">${draft}</div>${sheetHtml}` : sheetHtml,
    html: `<section class="meta-hero" style="${hero}"><span class="mh-l" style="color:${subCol}">Fecha de independencia${infoBtn('fecha', 'Qué es la fecha de independencia')}</span><span class="mh-d">${dateText}</span><span style="font-size:13px;color:${subCol}">${esc(subText)}</span></section>
<button class="card link-card" data-act="info" data-key="calc"><span style="color:#2c4b7a;font-weight:600;font-size:13px">Cómo se calcula la independencia financiera</span><span aria-hidden="true">›</span></button>
<div class="seg">${['Real', 'Prueba'].map((n) => `<button class="seg-btn" data-act="m-esc" data-id="${n}" aria-pressed="${n === st.esc}">${n}</button>`).join('')}</div>
<div class="kpi2"><div class="card k"><span class="kt">Capital necesario${infoBtn('necesario', 'Qué es el capital necesario')}</span><span class="kv">${fmt(need)}</span><span class="note">${reached !== null ? '*en la fecha de independencia, en euros de hoy' : '*hoy, en euros de hoy; baja con los años porque hay menos años que cubrir hasta los 90'}</span></div>
<div class="card k"><span class="kt">Invertido hoy</span><span class="kv">${fmt(p.start)}</span><span class="note">*no incluye el ahorro en cuenta</span></div></div>
<section class="card k"><span class="kt">Tasa de retiro segura (calculada)${infoBtn('retiro', 'Qué es la tasa de retiro segura')}</span><span class="kv">${comma((wNow * 100).toFixed(1))} % al año</span><span class="note">*calculada para no quedarte sin dinero antes de los 90 años; al mes, ${comma((wNow * 100 / 12).toFixed(2))} %</span><span class="note">*máximo mensual con tu inversión de hoy: ${fmt(maxToday)}${reached !== null ? `; en tu fecha de independencia: ${fmt(maxIndep)}` : ''}</span></section>
<section class="card stack-sm"><span class="card-title">Capital invertido proyectado${infoBtn('grafico', 'Cómo leer el gráfico')}</span>
<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Capital invertido proyectado a 40 años frente al capital necesario" style="display:block;height:150px;overflow:visible">${[37.5, 75, 112.5].map((y) => `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#e6f4ee"/>`).join('')}<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#cfe8de"/><polygon points="${line} ${W},${H} 0,${H}" fill="#2e8a47" fill-opacity="0.14"/><polyline points="${line}" fill="none" stroke="#2e8a47" stroke-width="2.5" stroke-linejoin="round"/><polyline points="${pts(needS).join(' ')}" fill="none" stroke="#2c4b7a" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round"/>${marker}</svg>
<div class="xl">${[0, 10, 20, 30, 40].map((k) => `<span>${y0 + k}</span>`).join('')}</div>
<input type="range" aria-label="Elegir año del gráfico" min="0" max="${YEARS}" step="1" value="${pt ?? 0}" data-change="m-pt">
${pt == null ? '<div class="note">*mueve el control para ver los valores de un año</div>' : `<div class="tap"><strong>${y0 + pt}</strong><br>Tu inversión: <strong>${fmt(series[pt])}</strong><br>Capital necesario: <strong>${fmt(needS[pt])}</strong><br>Tasa de retiro segura: <strong>${comma((res.w(pt * 12) * 100).toFixed(1))} % al año</strong><br>Máximo que podrías retirar: <strong>${fmt(res.maxMonthly(series[pt], pt * 12))} al mes</strong></div>`}
<div class="legend"><span><i style="background:#2e8a47"></i>Tu inversión</span><span><i style="background:#2c4b7a"></i>Capital necesario</span></div></section>
<section class="card stack"><span class="card-title">Ajustes</span>${rows}</section>
${extraCard}
<p class="note">*escenario real: rentabilidad, inflación e inversión mensual vienen de la app; escenario de prueba: todo se puede cambiar para jugar, incluidos los ingresos extra. Todo en euros de hoy, con la retirada mensual deseada neta</p>`
  };
}

export async function actMeta(name, el, ctx) {
  const st = metaState(ctx);
  const real = st.esc === 'Real';
  const num = () => parseFloat(String(el.value).replace(',', '.'));
  if (name === 'info') st.info = el.dataset.key;
  else if (name === 'close-sheet') st.info = null;
  else if (name === 'm-esc') { st.esc = el.dataset.id; st.dret = null; st.dtax = null; st.p = null; st.pt = null; }
  else if (name === 'm-pt') st.pt = Number(el.value);
  else if (name === 'm-age') await ctx.session.setIndependence({ age: num() });
  else if (name === 'm-set') {
    const k = el.dataset.key; const v = num();
    if (k === 'xy') st.xy = v; else if (k === 'xm') st.xm = v; else if (k === 'xa') st.xa = v;
    else if (real) { if (k === 'retirada') st.dret = v; else if (k === 'tax') st.dtax = v; }
    else st.p = { ...st.p, [k]: v };
  } else if (name === 'm-add') {
    const now = new Date(ctx.nowIso);
    const xy = st.xy ?? now.getFullYear() + 4;
    st.extras = [...st.extras, { m: Math.max(0, (xy - now.getFullYear()) * 12 + (st.xm - 1) - now.getMonth()), a: st.xa }];
  } else if (name === 'm-del') { const m = Number(el.dataset.m); const a = Number(el.dataset.a); const i = st.extras.findIndex((e) => e.m === m && e.a === a); if (i >= 0) st.extras = st.extras.filter((_, j) => j !== i); }
  else if (name === 'm-clear') st.extras = [];
  else if (name === 'm-cancel') { st.dret = null; st.dtax = null; }
  else if (name === 'm-confirm') {
    await ctx.session.setIndependence({ retirementMonthly: st.dret ?? undefined, taxPct: st.dtax ?? undefined });
    st.dret = null; st.dtax = null;
  } else return false;
  return true;
}
