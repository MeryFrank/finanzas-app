import test from 'node:test';
import assert from 'node:assert/strict';
import { safeRate, project, currentAge, dateOf } from '../src/core/independence.js';
import { emptyData } from '../src/core/store.js';

const P = { ret: 6, inf: 2.5, inv: 400, tax: 15, retirada: 1500, start: 10000, age: 30 };

test('la tasa de retiro segura sube con los años que quedan hasta los 90 solo hasta cierto punto y es la anualidad', () => {
  const r = 0.034;
  assert.ok(Math.abs(safeRate(r, 50) - r / (1 - Math.pow(1 + r, -40))) < 1e-12);
  assert.ok(safeRate(r, 40) < safeRate(r, 60)); // menos años que cubrir → se puede retirar más
  assert.equal(safeRate(0, 70), 1 / 20);
});

test('el capital necesario baja con los años y coincide con la fórmula', () => {
  const pr = project(P);
  assert.ok(pr.needS[10] < pr.needS[0]);
  assert.ok(Math.abs(pr.need(0) - 1500 * 12 / 0.85 / pr.w(0)) < 1e-6);
});

test('la fecha de independencia es el primer mes en que lo invertido supera lo necesario', () => {
  const pr = project(P);
  assert.ok(pr.reached > 0);
  const before = project({ ...P, inv: 0 }); // sin aportar no llega o llega más tarde
  assert.ok(before.reached === null || before.reached > pr.reached);
});

test('un ingreso extra adelanta la fecha y uno enorme la deja en el mes 0', () => {
  const base = project(P);
  const ex = project(P, [{ m: 12, a: 50000 }]);
  assert.ok(ex.reached < base.reached);
  assert.equal(project({ ...P, start: 5_000_000 }).reached, 0);
});

test('si no se llega nunca, reached es null', () => {
  assert.equal(project({ ...P, inv: 0, start: 100, retirada: 5000 }).reached, null);
});

test('la edad sube un año cada año y es null hasta indicarla', () => {
  const d = emptyData();
  assert.equal(currentAge(d, 2030), null);
  d.independence = { ...d.independence, age: 30, ageYear: 2026 };
  assert.equal(currentAge(d, 2028), 32);
});

test('dateOf suma meses sobre hoy y cruza de año', () => {
  assert.deepEqual(dateOf(new Date(2026, 10, 8), 3), { month: 1, year: 2027 });
});
