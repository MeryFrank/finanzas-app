import test from 'node:test';
import assert from 'node:assert/strict';
import { currentRoute } from '../src/router.js';
import { SCREENS } from '../src/screens/index.js';

const ids = SCREENS.map((s) => s.id);

test('la ruta conocida se respeta', () => {
  assert.equal(currentRoute('#/gastos', ids), 'gastos');
});

test('una ruta desconocida o vacía lleva a Resumen', () => {
  assert.equal(currentRoute('#/nada', ids), 'resumen');
  assert.equal(currentRoute('', ids), 'resumen');
});

test('hay 7 pestañas y todas tienen título y render', () => {
  assert.equal(SCREENS.length, 7);
  for (const s of SCREENS) {
    assert.ok(s.title && typeof s.render() === 'string');
  }
});

test('el service worker precarga todos los módulos de src/ (si no, la app no abre sin conexión)', async () => {
  const { readFileSync, readdirSync, statSync } = await import('node:fs');
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  const walk = (dir) => readdirSync(dir).flatMap((n) => { const p = `${dir}/${n}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
  const root = new URL('..', import.meta.url).pathname;
  const files = walk(`${root}src`).map((p) => p.slice(root.length)).filter((p) => p.endsWith('.js') || p.endsWith('.css'));
  for (const f of files) assert.ok(sw.includes(`'${f}'`), `falta en sw.js: ${f}`);
});
