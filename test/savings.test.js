import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../src/core/store.js';
import { savingsSeries, cuadre, netContribution, lastFundMonth, fundYears } from '../src/core/savings.js';

const ev = (date, type, valueE4, sharesE4 = null, priceE4 = null) => ({ key: date + type + valueE4, date, time: '10:00:00', type, valueE4, sharesE4, priceE4, rawDescription: '' });
const base = () => ({ ...emptyData(), fundEvents: [
  ev('2026-09-10', 'compra', 1000000, 1000000, 10000), // 100 €
  ev('2026-10-05', 'compra', 500000, 500000, 10000),    // +50 €
  ev('2026-10-20', 'venta', -100000, 100000, 10100),   // -10 participaciones a 1,01
  ev('2026-10-31', 'rendimiento', 3000)
] });

test('serie de ahorro: saldo, aportado y remuneración por mes; meses sin datos quedan vacíos', () => {
  const s = savingsSeries(base(), 2026);
  assert.equal(s[8].saldo, 10000); assert.equal(s[8].aportado, 10000); assert.equal(s[8].remun, 0);
  assert.equal(s[9].net, 4000); // +50 - 10
  assert.equal(s[9].aportado, 14000);
  assert.equal(s[9].saldo, 14140); // 140 participaciones x 1,01
  assert.equal(s[9].remun, 140);
  assert.equal(s[10].has, false); assert.equal(s[0].has, false);
  assert.deepEqual(lastFundMonth(base()), { year: 2026, month: 9 });
  assert.deepEqual(fundYears(base()), [2026]);
  assert.equal(netContribution(base().fundEvents), 14000);
});

test('cuadre: ingresos - gasto - ahorro - invertido; el primer mes no se comprueba', () => {
  const d = base();
  const mv = (key, date, cents, kind) => ({ key, date, amountCents: cents, kind, categoryId: null, description: 'x', source: 'revolut-account' });
  d.movements = [mv('1', '2026-09-01', 300000, 'ingreso'), mv('2', '2026-10-01', 300000, 'ingreso'), mv('3', '2026-10-02', -200000, 'gasto')];
  d.trades = [{ key: 't', date: '2026-10-15', side: 'compra', totalEurCents: 50000 }];
  const c = cuadre(d, 2026);
  assert.deepEqual(c.rows.map((r) => r.m), [8, 9]);
  assert.equal(c.rows[0].diff, null);
  // octubre: 3000 - 2000 - 40 - 500 = 460 €
  assert.equal(c.rows[1].diff, 300000 - 200000 - 4000 - 50000);
  assert.equal(c.total.diff, c.rows[1].diff);
  assert.deepEqual(cuadre(emptyData(), 2026), { rows: [], total: null });
});
