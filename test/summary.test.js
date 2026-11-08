import test from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../src/core/summary.js';
import { emptyData } from '../src/core/store.js';

test('un Resumen sin datos no falla y pide la edad para la independencia', () => {
  const s = summarize(emptyData(), '2026-11-08T10:00:00Z');
  assert.equal(s.patrimonio, 0);
  assert.equal(s.pendientes, 0);
  assert.equal(s.warn, '');
  assert.equal(s.indep.needAge, true);
});

test('usa el mes del último movimiento y suma ingresos y gasto de ese mes', () => {
  const d = emptyData();
  d.movements = [
    { key: 'a', source: 'revolut-account', date: '2026-09-02', description: 'Cliente inventado', amountCents: 200000, kind: 'ingreso', categoryId: 'nomina' },
    { key: 'b', source: 'revolut-account', date: '2026-09-05', description: 'Tienda inventada', amountCents: -5000, kind: 'gasto', categoryId: null }
  ];
  const s = summarize(d, '2026-11-08T10:00:00Z');
  assert.equal(s.month, 8);
  assert.equal(s.ingresos, 200000);
  assert.equal(s.gasto, 5000);
});
