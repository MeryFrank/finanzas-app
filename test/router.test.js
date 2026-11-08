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
