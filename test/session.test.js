import test from 'node:test';
import assert from 'node:assert/strict';
import { Session, IDLE_MS } from '../src/core/session.js';
import { memoryStorage } from '../src/storage.js';
import { freshness } from '../src/core/store.js';
import { freshnessText, shortDate, importMessage } from '../src/core/format.js';
import { ACCOUNT_CSV } from './fixtures/revolut.js';
import { PORTFOLIO_CSV } from './fixtures/degiro.js';

const mk = () => {
  const clock = { t: Date.parse('2026-11-08T12:00:00Z') };
  const storage = memoryStorage();
  const s = new Session({ storage, now: () => new Date(clock.t).toISOString(), iterations: 1000 });
  return { s, clock, storage };
};

test('primera vez: crear contraseña (mínimo y confirmación) y abrir', async () => {
  const { s } = mk();
  await s.start();
  assert.equal(s.status, 'new');
  await assert.rejects(() => s.create('corta', 'corta'), /al menos 8/);
  await assert.rejects(() => s.create('contraseña-larga', 'otra-distinta'), /no coinciden/);
  await s.create('contraseña-larga', 'contraseña-larga');
  assert.equal(s.status, 'open');
});

test('bloquear borra datos y clave de memoria; desbloquear con la contraseña correcta los recupera', async () => {
  const { s, storage } = mk();
  await s.start(); await s.create('contraseña-larga', 'contraseña-larga');
  await s.importFiles([{ name: 'cuenta.csv', text: ACCOUNT_CSV }]);
  s.lock();
  assert.equal(s.data, null); assert.equal(s.vault, null);
  // nueva sesión sobre el mismo almacenamiento (como al reabrir la app)
  const s2 = new Session({ storage, iterations: 1000 });
  await s2.start();
  assert.equal(s2.status, 'locked');
  await assert.rejects(() => s2.unlock('mala-contraseña'), /incorrecta/);
  assert.equal(s2.status, 'locked');
  await s2.unlock('contraseña-larga');
  assert.equal(s2.data.movements.length, 8);
});

test('lo guardado en disco está cifrado: no aparece ningún comercio ni importe', async () => {
  const { s, storage } = mk();
  await s.start(); await s.create('contraseña-larga', 'contraseña-larga');
  await s.importFiles([{ name: 'cuenta.csv', text: ACCOUNT_CSV }]);
  const raw = JSON.stringify(await storage.load());
  for (const palabra of ['Cafeteria', 'Titular', 'movements', 'cuenta.csv']) assert.equal(raw.includes(palabra), false);
});

test('bloqueo automático por inactividad y por segundo plano', async () => {
  const { s, clock } = mk();
  await s.start(); await s.create('contraseña-larga', 'contraseña-larga');
  clock.t += IDLE_MS - 1000; assert.equal(s.checkIdle(), false);
  s.touch();
  clock.t += IDLE_MS + 1000; assert.equal(s.checkIdle(), true);
  assert.equal(s.status, 'locked');

  await s.unlock('contraseña-larga');
  s.visibility(true); clock.t += IDLE_MS - 1000;
  assert.equal(s.visibility(false), false);
  s.visibility(true); clock.t += IDLE_MS + 1000;
  assert.equal(s.visibility(false), true);
  assert.equal(s.status, 'locked');
});

test('importar varios archivos: resultado por archivo, formato desconocido sin romper y guardado cifrado', async () => {
  const { s } = mk();
  await s.start(); await s.create('contraseña-larga', 'contraseña-larga');
  const r = await s.importFiles([
    { name: 'cuenta.csv', text: ACCOUNT_CSV },
    { name: 'raro.csv', text: 'a,b,c\n1,2,3' },
    { name: 'cartera.csv', text: PORTFOLIO_CSV }
  ]);
  assert.deepEqual(r.map((x) => x.ok), [true, false, true]);
  assert.match(importMessage(r[0]), /Revolut - Cuenta bancaria · 8 nuevos, 0 ya estaban/);
  assert.match(importMessage(r[1]), /No reconozco este formato/);
  assert.match(importMessage(r[2]), /2 posiciones actualizadas/);
  const again = await s.importFiles([{ name: 'cuenta.csv', text: ACCOUNT_CSV }]);
  assert.match(importMessage(again[0]), /0 nuevos, 8 ya estaban/);
});

test('copia de seguridad desde la sesión y restauración sobre otra instalación', async () => {
  const a = mk();
  await a.s.start(); await a.s.create('contraseña-larga', 'contraseña-larga');
  await a.s.importFiles([{ name: 'cuenta.csv', text: ACCOUNT_CSV }]);
  const b = await a.s.makeBackup('clave-copia');
  assert.equal(b.name, 'finanzas-copia-2026-11-08.finanzas');
  const nuevo = mk();
  await nuevo.s.start(); await nuevo.s.create('otra-contraseña', 'otra-contraseña');
  await assert.rejects(() => nuevo.s.restore('mala', b.text), /incorrecta/);
  await nuevo.s.restore('clave-copia', b.text);
  assert.equal(nuevo.s.data.movements.length, 8);
});

test('línea "actualizado el": sin datos, con datos y con aviso', async () => {
  const { s, clock } = mk();
  await s.start(); await s.create('contraseña-larga', 'contraseña-larga');
  const now = () => new Date(clock.t).toISOString();
  assert.match(freshnessText(freshness(s.data, 'gastos', now()), now()).text, /sin datos todavía/);
  await s.importFiles([{ name: 'cuenta.csv', text: ACCOUNT_CSV }]);
  const t = freshnessText(freshness(s.data, 'gastos', now()), now());
  assert.equal(t.text, '*actualizado el 8 nov · último dato 9 oct');
  clock.t += 40 * 86400000;
  const late = freshnessText(freshness(s.data, 'gastos', now()), now());
  assert.equal(late.stale, true);
  assert.match(late.text, /hay datos sin actualizar/);
  assert.equal(shortDate('2025-03-02', now()), '2 mar 2025');
});

test('el tiempo de bloqueo se puede elegir, se guarda cifrado y se aplica', async () => {
  const { s, clock, storage } = mk();
  await s.start(); await s.create('contraseña-larga', 'contraseña-larga');
  assert.equal(s.data.settings.lockMinutes, 5);
  await assert.rejects(() => s.setLockMinutes(7), /no válido/);
  await s.setLockMinutes(15);
  clock.t += 10 * 60000; s.touch(); clock.t += 10 * 60000;
  assert.equal(s.checkIdle(), false); // 10 min < 15
  clock.t += 6 * 60000;
  assert.equal(s.checkIdle(), true);
  const s2 = new Session({ storage, now: s.now, iterations: 1000 });
  await s2.start(); await s2.unlock('contraseña-larga');
  assert.equal(s2.data.settings.lockMinutes, 15); // persiste
  await s2.setLockMinutes(1);
  s2.visibility(true); clock.t += 61000;
  assert.equal(s2.visibility(false), true); // 1 min en segundo plano
});

test('datos guardados antes de existir los ajustes siguen abriendo con el valor por defecto', async () => {
  const { s, storage } = mk();
  await s.start(); await s.create('contraseña-larga', 'contraseña-larga');
  delete s.data.settings; await s.save(); s.lock();
  const s2 = new Session({ storage, iterations: 1000 });
  await s2.start(); await s2.unlock('contraseña-larga');
  assert.equal(s2.data.settings.lockMinutes, 5);
});
