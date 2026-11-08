import { SCREENS } from './screens/index.js';
import { setupScreen, unlockScreen } from './screens/lock.js';
import { parseHash } from './router.js';
import { Session } from './core/session.js';
import { browserStorage } from './storage.js';
import { freshness } from './core/store.js';
import { freshnessText } from './core/format.js';
import { parseBudget } from './screens/presupuesto.js';
import { eur } from './screens/ui.js';
import { esc } from './screens/html.js';
import { EXPENSE_GROUPS, INCOME_GROUPS } from './core/categories.js';

const ids = SCREENS.map((s) => s.id);
const $ = (id) => document.getElementById(id);
const nav = $('nav');
nav.innerHTML = SCREENS.map((s) =>
  `<a href="#/${s.id}" data-id="${s.id}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg>${s.label}</a>`).join('');

const session = new Session({ storage: browserStorage });
// Estado de las pantallas (solo en memoria). `visit` cambia cada vez que se navega.
const ui = { visit: 0, results: [], busy: '', backupMsg: '', backupError: '', backupReady: null, restoreFile: null, restoreStep: 0, lockError: '' };
let pendingBackup = null;

const route = () => parseHash(location.hash, ids);
const makeCtx = () => ({ session, nowIso: new Date().toISOString(), ui, route: route() });

function render() {
  const app = $('app');
  const open = session.status === 'open';
  app.classList.toggle('locked', !open);
  $('back').hidden = true; $('above').hidden = true; $('sheet').innerHTML = '';
  if (!open) {
    $('title').textContent = 'Finanzas';
    $('sub').textContent = '';
    $('screen').innerHTML = session.status === 'new' ? setupScreen(ui.lockError) : session.status === 'locked' ? unlockScreen(ui.lockError) : '';
    return;
  }
  const ctx = makeCtx();
  const screen = SCREENS.find((s) => s.id === ctx.route.id);
  const out = screen.render(ctx);
  const r = typeof out === 'string' ? { html: out } : out;
  const isSub = !!r.back;
  const f = freshnessText(freshness(session.data, ctx.route.id, ctx.nowIso), ctx.nowIso);
  if (r.back) { $('back').hidden = false; $('back').href = r.back.href; $('back').innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>${esc(r.back.label)}`; }
  if (r.above) { $('above').hidden = false; $('above').textContent = r.above; }
  $('title').textContent = r.title || screen.title;
  $('sub').textContent = isSub ? (r.below || '') : (r.below || f.text);
  $('sub').classList.toggle('warn', !isSub && !r.below && f.stale);
  $('screen').innerHTML = r.html;
  $('sheet').innerHTML = r.sheet || '';
  const mo = document.querySelector('.month[aria-pressed="true"]');
  if (mo) { const row = mo.parentElement; row.scrollLeft = mo.offsetLeft - row.clientWidth / 2 + mo.clientWidth / 2; }
  nav.querySelectorAll('a').forEach((a) => {
    if (a.dataset.id === ctx.route.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

const fail = (e) => (e && e.message) || 'Algo ha fallado';

// --- Formularios y botones (delegación de eventos) ---
document.addEventListener('submit', async (ev) => {
  const form = ev.target.closest('form[data-form]');
  if (!form) return;
  ev.preventDefault();
  const v = Object.fromEntries(new FormData(form));
  try {
    if (form.dataset.form === 'setup') { await session.create(v.password, v.confirm); ui.lockError = ''; }
    else if (form.dataset.form === 'unlock') { await session.unlock(v.password); ui.lockError = ''; }
    else if (form.dataset.form === 'target') {
      const target = {};
      Object.keys(INCOME_GROUPS).forEach((g) => { target[g] = parseBudget(v['t-' + g]); });
      await session.setIncomeTarget(target);
      ui.objetivo = { ...(ui.objetivo || {}), saved: true };
    } else if (form.dataset.form === 'budget') {
      const budget = {};
      Object.keys(EXPENSE_GROUPS).forEach((g) => { budget[g] = parseBudget(v['b-' + g]); });
      await session.setBudget(budget);
      ui.presupuesto = { ...(ui.presupuesto || {}), saved: true };
    } else if (form.dataset.form === 'backup') {
      ui.backupError = ''; ui.backupMsg = '';
      pendingBackup = await session.makeBackup(v.password);
      ui.backupReady = { name: pendingBackup.name };
      ui.backupMsg = 'Copia lista. Pulsa el botón para guardarla.';
    } else if (form.dataset.form === 'restore') {
      if (ui.restoreStep === 0) { ui.restoreStep = 1; render(); return; }
      await session.restore(v.password, await ui.restoreFile.text());
      ui.restoreFile = null; ui.restoreStep = 0; ui.results = []; ui.backupMsg = 'Copia restaurada';
    }
  } catch (e) {
    if (['setup', 'unlock'].includes(form.dataset.form)) ui.lockError = fail(e);
    else { ui.backupError = fail(e); ui.restoreStep = 0; }
  }
  render();
});

// El total del presupuesto se actualiza al escribir, sin volver a pintar la pantalla (así no se pierde el foco).
document.addEventListener('input', (ev) => {
  const form = ev.target.closest('form[data-form=budget], form[data-form=target]');
  if (!form) return;
  const st = form.dataset.form === 'budget' ? ui.presupuesto : ui.objetivo;
  if (st) st.saved = false;
  const total = [...form.querySelectorAll('input[data-amount]')].reduce((a, i) => a + parseBudget(i.value), 0);
  const t = $('budget-total'); if (t) t.textContent = total === 0 && form.dataset.form === 'target' ? 'Sin objetivo' : eur(total * 100);
  const m = form.querySelector('.okmsg'); if (m) m.textContent = '';
});

document.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.dataset.search !== undefined || el.dataset.change !== undefined) {
    const screen = SCREENS.find((x) => x.id === route().id);
    try { if (screen.act && await screen.act(el.dataset.change || 'search', el, makeCtx())) render(); } catch (e) { ui.backupError = fail(e); render(); }
    return;
  }
  if (el.dataset.action === 'import') {
    const files = [...el.files];
    el.value = '';
    if (!files.length) return;
    ui.busy = 'Importando…'; render();
    try {
      ui.results = await session.importFiles(await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() }))));
    } catch (e) { ui.results = [{ file: '', ok: false, error: fail(e) }]; }
    ui.busy = ''; render();
  } else if (el.dataset.action === 'lock-minutes') {
    try { await session.setLockMinutes(Number(el.value)); } catch (e) { ui.backupError = fail(e); }
    render();
  } else if (el.dataset.action === 'pick-restore') {
    ui.restoreFile = el.files[0] || null; ui.restoreStep = 0; ui.backupError = ''; ui.backupMsg = ''; render();
  }
});

document.addEventListener('click', async (ev) => {
  const act = ev.target.closest('[data-act]');
  if (act && session.status === 'open') {
    const screen = SCREENS.find((s) => s.id === route().id);
    try {
      if (screen.act && await screen.act(act.dataset.act, act, makeCtx())) render();
    } catch (e) { ui.backupError = fail(e); render(); }
    return;
  }
  const b = ev.target.closest('[data-action]');
  if (!b) return;
  if (b.dataset.action === 'lock') { session.lock(); render(); }
  else if (b.dataset.action === 'save-backup' && pendingBackup) {
    const file = new File([pendingBackup.text], pendingBackup.name, { type: 'application/octet-stream' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file] });
      else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 10000); }
      ui.backupMsg = 'Copia guardada'; pendingBackup = null; ui.backupReady = null;
    } catch (e) { if (e.name !== 'AbortError') ui.backupError = fail(e); }
    render();
  }
});

// --- Bloqueo automático ---
['pointerdown', 'keydown', 'scroll'].forEach((t) => addEventListener(t, () => session.touch(), { passive: true, capture: true }));
setInterval(() => { if (session.checkIdle()) render(); }, 15000);
document.addEventListener('visibilitychange', () => { if (session.visibility(document.hidden)) render(); });

addEventListener('hashchange', () => { ui.visit++; render(); });
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); // pide al navegador que no borre los datos
session.start().then(render);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
