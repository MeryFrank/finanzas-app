import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../src/core/store.js';
import { expenseSummary, periodRange, defaultPeriod, pendingMovements, yearsWithData } from '../src/core/analysis.js';
import { classifyMovement, sameCount, applyRules } from '../src/core/classify.js';

const mv = (key, date, cents, over = {}) => ({ key, source: 'revolut-card', date, description: 'Comercio ' + key, amountCents: cents, balanceCents: null, currency: 'EUR', kind: 'gasto', categoryId: null, rawType: 'X', ...over });

function sample() {
  const d = emptyData();
  d.movements = [
    mv('a', '2026-10-05', -5000, { categoryId: 'supermercado' }),
    mv('b', '2026-10-20', -3000, { categoryId: 'restaurantes' }),
    mv('c', '2026-10-21', -1000, { categoryId: 'alquiler' }),
    mv('d', '2026-11-02', -2000, { categoryId: 'supermercado' }),
    mv('e', '2026-11-03', 500, { categoryId: 'supermercado', kind: 'devolucion' }), // devolución: resta
    mv('f', '2026-11-04', -700), // gasto sin categoría
    mv('g', '2026-11-05', -9999, { kind: 'traspaso' }), // no cuenta
    mv('h', '2026-11-06', 100000, { kind: 'ingreso', categoryId: 'nomina' }), // no cuenta como gasto
    mv('i', '2026-11-07', -1200, { kind: 'por-revisar' }) // pendiente, aún no cuenta
  ];
  d.budget = { alimentacion: 100, vivienda: 0 };
  return d;
}

test('periodos: mes, 3 meses y acumulado', () => {
  assert.deepEqual(periodRange(10, 'm'), [10, 10]);
  assert.deepEqual(periodRange(10, '3m'), [8, 10]);
  assert.deepEqual(periodRange(1, '3m'), [0, 1]);
  assert.deepEqual(periodRange(10, 'ytd'), [0, 10]);
});

test('gasto del mes por grupo: devoluciones restan, traspasos e ingresos no cuentan, sin categoría va a Otros', () => {
  const s = expenseSummary(sample(), { year: 2026, month: 10, per: 'm' });
  const g = Object.fromEntries(s.groups.map((x) => [x.id, x]));
  assert.equal(g.alimentacion.spent, 1500); // 2000 - 500
  assert.equal(g.otros.spent, 700);
  assert.equal(s.total, 2200);
  assert.equal(g.alimentacion.subs.find((x) => x.id === 'supermercado').spent, 1500);
});

test('presupuesto del periodo = mensual x meses; aviso de pasarse', () => {
  const d = sample();
  const m = expenseSummary(d, { year: 2026, month: 10, per: 'm' });
  assert.equal(m.groups.find((x) => x.id === 'alimentacion').budget, 10000);
  assert.equal(m.budgetTotal, 10000);
  const three = expenseSummary(d, { year: 2026, month: 10, per: '3m' });
  assert.equal(three.groups.find((x) => x.id === 'alimentacion').budget, 30000);
  const oct = expenseSummary(d, { year: 2026, month: 9, per: 'm' });
  assert.equal(oct.groups.find((x) => x.id === 'vivienda').over, true); // 1000 gastados con presupuesto 0
  assert.equal(oct.groups.find((x) => x.id === 'alimentacion').over, false);
});

test('gasto por tipo y mes anterior', () => {
  const s = expenseSummary(sample(), { year: 2026, month: 10, per: 'm' });
  assert.equal(s.tipoSums.V, 1500); // supermercado: variable necesario
  assert.equal(s.tipoSums[''], 700); // sin clasificar: sin tipo
  assert.equal(s.prevTotal, 9000);
  assert.equal(expenseSummary(sample(), { year: 2026, month: 10, per: '3m' }).prevTotal, null);
  const cambiado = sample();
  cambiado.categories = { tipos: { supermercado: 'D' }, newCats: [] };
  assert.equal(expenseSummary(cambiado, { year: 2026, month: 10, per: 'm' }).tipoSums.D, 1500);
});

test('categoría nueva creada por la usuaria aparece en su grupo y suma', () => {
  const d = sample();
  d.categories = { tipos: {}, newCats: [{ id: 'mascotas', name: 'Mascotas', group: 'compras', tipo: 'V' }] };
  d.movements.push(mv('z', '2026-11-08', -4000, { categoryId: 'mascotas' }));
  const g = expenseSummary(d, { year: 2026, month: 10, per: 'm' }).groups.find((x) => x.id === 'compras');
  assert.equal(g.spent, 4000);
  assert.equal(g.subs.find((x) => x.id === 'mascotas').tipo, 'V');
});

test('periodo por defecto: el del último movimiento; años con datos', () => {
  assert.deepEqual(defaultPeriod(sample(), '2026-12-01T00:00:00Z'), { year: 2026, month: 10 });
  assert.deepEqual(defaultPeriod(emptyData(), '2026-12-01T00:00:00Z'), { year: 2026, month: 11 });
  assert.deepEqual(yearsWithData(sample()), [2026]);
});

test('pendientes: por revisar y gastos sin categoría, el más reciente primero', () => {
  assert.deepEqual(pendingMovements(sample()).map((m) => m.key), ['i', 'f']);
});

test('clasificar: aplica a los pendientes iguales y aprende la regla (solo gastos)', () => {
  const d = emptyData();
  d.movements = [
    mv('1', '2026-11-01', -1000, { description: 'Tienda X' }),
    mv('2', '2026-11-02', -2000, { description: 'Tienda X' }),
    mv('3', '2026-11-03', -3000, { description: 'Tienda X', source: 'revolut-account' }), // otra fuente: no se toca
    mv('4', '2026-11-04', -4000, { description: 'Otra' })
  ];
  assert.equal(sameCount(d, '1'), 2);
  const r = classifyMovement(d, '1', { kind: 'gasto', categoryId: 'regalos' });
  assert.equal(r.affected, 2);
  assert.equal(r.data.movements[1].categoryId, 'regalos');
  assert.equal(r.data.movements[2].categoryId, null);
  assert.equal(d.movements[0].categoryId, null); // no muta
  assert.deepEqual(r.data.rules, [{ pattern: 'tienda x', categoryId: 'regalos' }]);
  const next = applyRules([mv('5', '2026-12-01', -500, { description: 'TIENDA X Sevilla' })], r.data.rules);
  assert.equal(next[0].categoryId, 'regalos');
  const t = classifyMovement(d, '4', { kind: 'traspaso' });
  assert.equal(t.data.movements[3].kind, 'traspaso');
  assert.equal(t.data.rules.length, 0); // un traspaso no crea regla
  assert.throws(() => classifyMovement(d, 'nope', { kind: 'traspaso' }));
});

test('ingresos del periodo por grupo y objetivo opcional', async () => {
  const { incomeSummary } = await import('../src/core/analysis.js');
  const { emptyData } = await import('../src/core/store.js');
  const mv = (key, date, cents, kind, categoryId) => ({ key, date, amountCents: cents, kind, categoryId, description: 'x', source: 'revolut-account' });
  const d = { ...emptyData(), movements: [mv('1', '2026-10-01', 230000, 'ingreso', 'nomina'), mv('2', '2026-10-05', 4500, 'ingreso', 'otros-ingresos'), mv('3', '2026-09-01', 230000, 'ingreso', 'nomina'), mv('4', '2026-10-06', -1000, 'gasto', 'luz'), mv('5', '2026-10-07', 5000, 'traspaso', null)], incomeTarget: { nomina: 2000 } };
  const m = incomeSummary(d, { year: 2026, month: 9, per: 'm' });
  assert.equal(m.total, 234500); assert.equal(m.groups[0].spent, 230000); assert.equal(m.groups[1].spent, 4500);
  assert.equal(m.budgetTotal, 200000); assert.equal(m.prevTotal, 230000);
  const t = incomeSummary(d, { year: 2026, month: 9, per: '3m' });
  assert.equal(t.total, 464500); assert.equal(t.budgetTotal, 600000);
});
