import { SCREENS } from './screens/index.js';
import { setupScreen, unlockScreen } from './screens/lock.js';
import { onRoute, currentRoute } from './router.js';
import { Session } from './core/session.js';
import { browserStorage } from './storage.js';
import { freshness } from './core/store.js';
import { freshnessText } from './core/format.js';

const ids = SCREENS.map((s) => s.id);
const $ = (id) => document.getElementById(id);
const nav = $('nav');
nav.innerHTML = SCREENS.map((s) =>
  `<a href="#/${s.id}" data-id="${s.id}"><svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg>${s.label}</a>`).join('');

const session = new Session({ storage: browserStorage });
const ui = { results: [], busy: '', backupMsg: '', backupError: '', backupReady: null, restoreFile: null, restoreStep: 0, lockError: '' };
let pendingBackup = null;

function render() {
  const app = $('app');
  const open = session.status === 'open';
  app.classList.toggle('locked', !open);
  if (!open) {
    $('title').textContent = 'Finanzas';
    $('sub').textContent = '';
    $('screen').innerHTML = session.status === 'new' ? setupScreen(ui.lockError) : session.status === 'locked' ? unlockScreen(ui.lockError) : '';
    return;
  }
  const id = currentRoute(location.hash, ids);
  const screen = SCREENS.find((s) => s.id === id);
  const nowIso = new Date().toISOString();
  $('title').textContent = screen.title;
  const f = freshnessText(freshness(session.data, id, nowIso), nowIso);
  $('sub').textContent = f.text;
  $('sub').classList.toggle('warn', f.stale);
  $('screen').innerHTML = screen.render({ session, nowIso, ui });
  nav.querySelectorAll('a').forEach((a) => {
    if (a.dataset.id === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
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
    else if (form.dataset.form === 'backup') {
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

document.addEventListener('change', async (ev) => {
  const el = ev.target;
  if (el.dataset.action === 'import') {
    const files = [...el.files];
    el.value = '';
    if (!files.length) return;
    ui.busy = 'Importando…'; render();
    try {
      ui.results = await session.importFiles(await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() }))));
    } catch (e) { ui.results = [{ file: '', ok: false, error: fail(e) }]; }
    ui.busy = ''; render();
  } else if (el.dataset.action === 'pick-restore') {
    ui.restoreFile = el.files[0] || null; ui.restoreStep = 0; ui.backupError = ''; ui.backupMsg = ''; render();
  }
});

document.addEventListener('click', async (ev) => {
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

onRoute(ids, () => render());
session.start().then(render);

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
