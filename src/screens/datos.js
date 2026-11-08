import { esc } from './html.js';
import { infoBtn, infoSheet } from './ui.js';
import { nextReview } from './presupuesto.js';
import { SOURCES, LOCK_OPTIONS } from '../core/store.js';
import { shortDate, importMessage } from '../core/format.js';

/**
 * @param {{session:import('../core/session.js').Session, nowIso:string, ui:{results:any[], busy?:string, backupMsg?:string, backupError?:string, backupReady?:{name:string}|null, restoreStep?:number}}} ctx
 */
export const DATOS_INFO = {
  importar: { t: 'Importar CSV', what: 'Un CSV es el archivo de movimientos que descargas desde la app de cada plataforma. La app lo lee y añade los movimientos nuevos, sin duplicar los que ya tenía.', how: 'Lee fecha, descripción e importe de cada línea, aplica tus reglas de categorización y deja en "por revisar" lo que no reconoce. No lee ni guarda números de cuenta.' },
  precios: { t: 'Actualizar precios', what: 'La app no consulta páginas web: trabaja sin conexión para proteger tus datos. Los precios se actualizan al importar el CSV de posiciones de DEGIRO, que trae el valor de cada una, o a mano posición por posición.', how: '' },
  ipc: { t: 'IPC anual', what: 'El índice de precios al consumo del país donde resides. Lo escribes una vez al año y la app lo usa como inflación en el escenario real de Meta.', how: 'Solo hay que escribir el porcentaje; no hace falta archivo.' },
  objetivo: { t: 'Objetivo de cartera', what: 'El peso que quieres que tenga la renta fija en tu cartera. El resto es renta variable. Con él, Cartera calcula cuánto te falta para llegar y en cuántos meses (con tu aportación mensual).', how: 'Renta variable = 100 % − renta fija. La app compara este objetivo con el peso real de tu cartera.' },
  copia: { t: 'Copia de seguridad', what: 'Un archivo cifrado con todos tus datos. Si pierdes el móvil o lo cambias, lo restauras desde aquí. Como tus datos solo están en este móvil, es tu única red de seguridad.', how: 'Se cifra con tu contraseña (AES-256) y se descarga como archivo, que puedes guardar en iCloud Drive. Sin la contraseña no se puede abrir ni recuperar.' },
  bloqueo: { t: 'Bloqueo automático', what: 'Tiempo sin usar la app antes de que vuelva a pedirte la contraseña. Protege tus datos si dejas el móvil desbloqueado.', how: '' },
  mensual: { t: 'Proceso mensual', what: 'La lista de tareas para mantener tus datos al día cada mes: importar, revisar, actualizar precios y guardar la copia. Cada 6 meses incluye también revisar el presupuesto de gasto. Se reinicia al empezar cada mes.', how: '' },
  registro: { t: 'Registro de actividad', what: 'Una lista con lo que entra en la app: los archivos importados (solo el nombre y cuántas filas eran nuevas, nunca el contenido).', how: '' }
};

export function renderDatos(ctx) {
  const { session, nowIso, ui } = ctx;
  const d = session.data;
  const results = ui.results.map((r) => `<li class="${r.ok ? 'ok' : 'bad'}">${esc(importMessage(r))}</li>`).join('');
  const sources = Object.entries(SOURCES).map(([id, label]) => {
    const i = d.imports[id];
    const old = i && (Date.parse(nowIso) - Date.parse(i.lastImportAt)) / 86400000 > 30;
    const detail = i ? `actualizado el ${shortDate(i.lastImportAt, nowIso)}${i.lastDataDate ? ` · último dato ${shortDate(i.lastDataDate, nowIso)}` : ''}` : 'sin importar';
    return `<li><span>${esc(label)}</span><span class="${old ? 'warn' : 'note'}">${esc(detail)}</span></li>`;
  }).join('');
  const activity = d.activity.slice(0, 8).map((a) => `<li><span>${esc(a.file)}</span><span class="note">${a.newRows} nuevos · ${esc(shortDate(a.at, nowIso))}</span></li>`).join('') || '<li><span class="note">Todavía no has importado nada</span></li>';
  const month = nowIso.slice(0, 7);
  const checks = d.monthly.month === month ? d.monthly.checks : {};
  const ITEMS = [['c1', 'Importar los CSV del mes'], ['c2', 'Revisar los movimientos sin clasificar'], ['c3', 'Actualizar los precios de la cartera'], ['c4', 'Exportar la copia a iCloud Drive'], ['c5', 'Revisar el presupuesto de gasto (cada 6 meses)']];
  const done = ITEMS.filter(([k]) => checks[k]).length;
  const review = nextReview(d.budgetSavedAt);
  const tgt = d.portfolioSettings.targetFixedPct;
  const stale = (id) => d.imports[id] && (Date.parse(nowIso) - Date.parse(d.imports[id].lastImportAt)) / 86400000 > 30;
  const bkOld = !d.lastBackupAt || (Date.parse(nowIso) - Date.parse(d.lastBackupAt)) / 86400000 > 31;
  const all = d.activity.length;
  const info = (k, l) => infoBtn(k, l);
  const sec = (t) => `<div class="sec-l"><span>${t}</span><span class="sec-line"></span></div>`;
  return {
    above: 'Tus datos se quedan en este móvil',
    sheet: ui.datosInfo ? infoSheet(DATOS_INFO[ui.datosInfo]) : '',
    html: `
${sec('Cada mes')}
<section class="card stack-sm">
  <div class="card-head"><span class="card-title">Proceso mensual${info('mensual', 'Qué es el proceso mensual')}</span><span class="pm-s"><strong>${done} de 5</strong><span class="note">*última vez: ${d.monthly.lastDoneAt ? esc(shortDate(d.monthly.lastDoneAt, nowIso)) : 'todavía no'}</span></span></div>
  ${ITEMS.map(([k, t]) => `<label class="chk"><input type="checkbox" data-change="m-check" data-key="${k}" ${checks[k] ? 'checked' : ''}>${t}</label>`).join('')}
  <div class="note">*próxima revisión del presupuesto: ${review || 'cuando guardes uno'}</div>
</section>
${sec('Parámetros')}
<section class="card stack-sm"><div class="card-title">IPC anual${info('ipc', 'Qué es el IPC anual')}</div>
  <label class="obj-row"><span>IPC del último año (país de residencia)</span><span class="bud-in"><input id="ipc" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-change="save-ipc" value="${String(d.independence.ipc).replace('.', ',')}" aria-label="IPC anual en porcentaje">%</span></label>
  <div class="note">*se escribe a mano una vez al año; alimenta la inflación del escenario real en Meta</div></section>
<section class="card stack-sm"><div class="card-title">Objetivo de cartera${info('objetivo', 'Qué es el objetivo de cartera')}</div>
  <label class="obj-row"><span>Renta fija</span><span class="bud-in"><input id="pf-fixed" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-change="save-pf" value="${tgt}" aria-label="Objetivo de renta fija en porcentaje">%</span></label>
  <div class="obj-row"><span>Renta variable</span><strong>${100 - tgt} %</strong></div>
  <label class="obj-row"><span>Aportación mensual</span><span class="bud-in"><input id="pf-month" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-change="save-pf" value="${d.portfolioSettings.monthlyEur || ''}" placeholder="Sin definir" aria-label="Aportación mensual a la cartera en euros">€</span></label>
  <div class="note">*el resto hasta 100 % es renta variable; la aportación mensual sirve para calcular en cuántos meses llegas al objetivo y la fecha de independencia</div></section>
<a class="card link-card" href="#/datos/categorias"><span><strong>Categorías</strong><span class="note">*grupos, subcategorías y tipo de gasto; aquí se crean y se cambian</span></span><span aria-hidden="true">›</span></a>
${sec('Datos')}
<section class="card stack">
  <div class="card-title">Importar CSV${info('importar', 'Qué es importar un CSV')}</div>
  ${[['revolut-account', 'Revolut - Cuenta bancaria'], ['revolut-card', 'Revolut - Tarjeta de crédito'], ['revolut-fund', 'Revolut - Fondo monetario'], ['degiro-portfolio', 'DEGIRO - Posiciones'], ['degiro-transactions', 'DEGIRO - Compras'], ['degiro-statement', 'DEGIRO - Estado de cuenta']].map(([id, n]) => { const i = d.imports[id]; return `<div class="src-row"><span class="src-n">${n}</span><span class="note">${i ? `Último: ${esc(shortDate(i.lastImportAt, nowIso))}${stale(id) ? ' <span class="pill-warn">Desactualizado</span>' : ''}` : 'sin importar'}</span></div>`; }).join('')}
  <label class="btn file">Elegir archivos<input type="file" accept=".csv,text/csv" multiple data-action="import" hidden></label>
  ${ui.busy ? `<p class="note">${esc(ui.busy)}</p>` : ''}
  ${results ? `<ul class="list results" aria-live="polite">${results}</ul>` : ''}
  <div class="note">*se abre el selector de archivos del iPhone (Archivos, iCloud Drive o Descargas); la app reconoce cada archivo por su cabecera y solo entra lo nuevo</div>
  <div class="sub-box"><div class="card-title">Actualizar precios${info('precios', 'Cómo se actualizan los precios')}</div><div class="note">*al importar el CSV de DEGIRO los precios se actualizan solos</div><a class="link" href="#/datos/precios" style="min-height:44px;display:flex;align-items:center">Editar precios a mano ›</a></div>
</section>
<a class="card link-card" href="#/datos/movimientos"><span><strong>Movimientos importados</strong><span class="note">*todo lo guardado, también traspasos y ahorro</span></span><span aria-hidden="true">›</span></a>
${sec('Protección')}
<section class="card stack">
  <div class="card-head"><span class="card-title">Copia de seguridad${info('copia', 'Qué es la copia de seguridad')}</span><span class="${bkOld ? 'pill-warn' : 'pill-ok'}">${bkOld ? 'Hace falta' : 'Al día'}</span></div>
  <p class="note">Última copia cifrada: ${d.lastBackupAt ? esc(shortDate(d.lastBackupAt, nowIso)) : 'ninguna todavía'}. Se descarga como archivo (guárdalo en iCloud Drive) y solo se abre con tu contraseña.</p>
  <form class="stack" data-form="backup">
    <label>Contraseña de la copia<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
    <button class="btn" type="submit">Crear copia</button>
  </form>
  ${ui.backupReady ? `<button class="btn secondary" data-action="save-backup">Guardar «${esc(ui.backupReady.name)}»</button>` : ''}
  <form class="stack" data-form="restore">
    <label class="btn secondary file">Elegir copia para restaurar<input type="file" accept=".finanzas,application/json" data-action="pick-restore" hidden></label>
    ${ui.restoreFile ? `<p class="note">Archivo: ${esc(ui.restoreFile.name)}</p>
    <label>Contraseña de la copia<input name="password" type="password" autocomplete="current-password" required></label>
    ${ui.restoreStep === 1 ? '<p class="warn">Esto sustituye todos los datos actuales. ¿Estás segura?</p><button class="btn danger" type="submit">Sí, restaurar</button>' : '<button class="btn" type="submit">Restaurar</button>'}` : ''}
  </form>
  ${ui.backupMsg ? `<p class="okmsg" role="status">${esc(ui.backupMsg)}</p>` : ''}
  ${ui.backupError ? `<p class="error" role="alert">${esc(ui.backupError)}</p>` : ''}
</section>
<section class="card stack">
  <div class="card-title">Seguridad</div>
  <label><span class="lbl">Bloqueo automático${info('bloqueo', 'Qué es el bloqueo automático')}</span>
    <select data-action="lock-minutes">${LOCK_OPTIONS.map((m) => `<option value="${m}"${m === d.settings.lockMinutes ? ' selected' : ''}>${m === 60 ? '1 hora' : m === 1 ? '1 minuto' : m + ' minutos'}</option>`).join('')}</select>
  </label>
  <p class="note">*sin usar la app, o con la app en segundo plano; tus datos están cifrados en este dispositivo y no se envían a ningún sitio</p>
</section>
${sec('Actividad')}
<section class="card stack">
  <div class="card-head"><span class="card-title">Registro de actividad${info('registro', 'Qué es el registro de actividad')}</span><span class="note">${all} ${all === 1 ? 'entrada' : 'entradas'}</span></div>
  <ul class="list">${activity}</ul>
  <p class="note">*solo se guarda el nombre del archivo y cuántas filas eran nuevas, nunca su contenido</p>
</section>
<button class="btn secondary" data-action="lock">Bloquear ahora</button>`
  };
}

export async function actDatos(name, el, ctx) {
  if (name === 'info') { ctx.ui.datosInfo = el.dataset.key; return true; }
  if (name === 'close-sheet') { ctx.ui.datosInfo = null; return true; }
  if (name === 'm-check') { await ctx.session.toggleMonthly(el.dataset.key); return true; }
  if (name === 'save-ipc') { await ctx.session.setIndependence({ ipc: parseFloat(document.getElementById('ipc').value.replace(',', '.')) }); return true; }
  if (name !== 'save-pf') return false;
  await ctx.session.setPortfolioSettings({ targetFixedPct: document.getElementById('pf-fixed').value.replace(',', '.'), monthlyEur: document.getElementById('pf-month').value.replace(',', '.') });
  return true;
}
