import { esc } from './html.js';
import { SOURCES, LOCK_OPTIONS } from '../core/store.js';
import { shortDate, importMessage } from '../core/format.js';

/**
 * @param {{session:import('../core/session.js').Session, nowIso:string, ui:{results:any[], busy?:string, backupMsg?:string, backupError?:string, backupReady?:{name:string}|null, restoreStep?:number}}} ctx
 */
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
  return `
<a class="card link-card" href="#/datos/categorias"><span><strong>Categorías</strong><span class="note">*grupos, subcategorías y tipo de gasto</span></span><span aria-hidden="true">›</span></a>
<a class="card link-card" href="#/datos/movimientos"><span><strong>Movimientos importados</strong><span class="note">*todo lo guardado, también traspasos y ahorro</span></span><span aria-hidden="true">›</span></a>
<section class="card stack">
  <h2>Cartera</h2>
  <label class="obj-row">Objetivo de renta fija<span class="bud-in"><input id="pf-fixed" type="text" inputmode="decimal" autocomplete="off" data-change="save-pf" value="${d.portfolioSettings.targetFixedPct}" style="width:80px" aria-label="Objetivo de renta fija en porcentaje">%</span></label>
  <label class="obj-row">Aportación mensual<span class="bud-in"><input id="pf-month" type="text" inputmode="decimal" autocomplete="off" data-change="save-pf" value="${d.portfolioSettings.monthlyEur || ''}" placeholder="Sin definir" style="width:100px" aria-label="Aportación mensual a la cartera en euros">€</span></label>
  <p class="note">*el resto hasta el 100 % es renta variable; la aportación mensual sirve para calcular en cuántos meses llegas al objetivo</p>
  <a class="link" href="#/datos/precios" style="min-height:44px;display:flex;align-items:center">Editar precios a mano ›</a>
</section>
<section class="card stack">
  <h2>Independencia</h2>
  <label class="obj-row">IPC anual<span class="bud-in"><input id="ipc" type="text" inputmode="decimal" autocomplete="off" data-change="save-ipc" value="${String(d.independence.ipc).replace('.', ',')}" style="width:80px" aria-label="IPC anual en porcentaje">%</span></label>
  <p class="note">*la inflación del último año; se usa en Meta para pasar la rentabilidad a euros de hoy. Actualízala una vez al año</p>
</section>
<section class="card stack">
  <h2>Importar CSV</h2>
  <p class="note">*elige uno o varios archivos exportados desde la app de cada plataforma; se reconocen solos y solo entra lo nuevo</p>
  <label class="btn file">Elegir archivos<input type="file" accept=".csv,text/csv" multiple data-action="import" hidden></label>
  ${ui.busy ? `<p class="note">${esc(ui.busy)}</p>` : ''}
  ${results ? `<ul class="list results" aria-live="polite">${results}</ul>` : ''}
</section>
<section class="card stack">
  <h2>Estado por archivo</h2>
  <ul class="list">${sources}</ul>
</section>
<section class="card stack">
  <h2>Copia de seguridad</h2>
  <p class="note">*un archivo cifrado con su propia contraseña; guárdalo en iCloud Drive una vez al mes</p>
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
  <h2>Seguridad</h2>
  <label>Bloquear la app tras
    <select data-action="lock-minutes">${LOCK_OPTIONS.map((m) => `<option value="${m}"${m === d.settings.lockMinutes ? ' selected' : ''}>${m === 60 ? '1 hora' : m === 1 ? '1 minuto' : m + ' minutos'}</option>`).join('')}</select>
  </label>
  <p class="note">*sin usar la app, o con la app en segundo plano; tus datos están cifrados en este dispositivo y no se envían a ningún sitio</p>
</section>
<section class="card stack">
  <h2>Actividad</h2>
  <ul class="list">${activity}</ul>
  <p class="note">*solo se guarda el nombre del archivo y cuántas filas eran nuevas, nunca su contenido</p>
</section>
<button class="btn secondary" data-action="lock">Bloquear ahora</button>`;
}

export async function actDatos(name, el, ctx) {
  if (name === 'save-ipc') { await ctx.session.setIndependence({ ipc: parseFloat(document.getElementById('ipc').value.replace(',', '.')) }); return true; }
  if (name !== 'save-pf') return false;
  await ctx.session.setPortfolioSettings({ targetFixedPct: document.getElementById('pf-fixed').value.replace(',', '.'), monthlyEur: document.getElementById('pf-month').value.replace(',', '.') });
  return true;
}
