import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData, ingest } from '../src/core/store.js';
import { importCsv } from '../src/core/csv/import.js';
import { positionsNow, portfolioTotals, recordSnapshot, growthChart, annualizedReturn, allocation, positionHistory, untypedPositions, investedInMonth } from '../src/core/portfolio.js';
import { PORTFOLIO_CSV, TRANSACTIONS_CSV } from './fixtures/degiro.js';

const load = () => {
  let d = emptyData();
  d = ingest(d, importCsv(TRANSACTIONS_CSV), 't.csv', '2026-10-20T10:00:00Z').data;
  d = ingest(d, importCsv(PORTFOLIO_CSV), 'p.csv', '2026-10-20T10:00:00Z').data;
  return d;
};

test('importar la cartera guarda una foto por fecha y posiciones con coste de las compras', () => {
  const d = load();
  assert.equal(d.portfolioHistory.length, 1);
  const p = positionsNow(d);
  assert.equal(p.length, 2);
  const etf = p.find((x) => x.isin === 'XX0000000001');
  assert.equal(etf.valueCents, 100500);
  assert.equal(etf.costCents, 20100 - 10000); // compra 201,00 - venta 100,00
  const t = portfolioTotals(d);
  assert.equal(t.value, 100500 + 69000);
  assert.equal(untypedPositions(d).length, 2);
  // misma fecha: sustituye, no duplica
  const d2 = ingest(d, importCsv(PORTFOLIO_CSV), 'p.csv', '2026-10-20T18:00:00Z').data;
  assert.equal(d2.portfolioHistory.length, 1);
});

test('precio a mano cambia el valor y la foto de hoy; una importación nueva lo borra', () => {
  const d = load();
  const d2 = { ...d, prices: { XX0000000001: 120 } };
  assert.equal(positionsNow(d2).find((x) => x.isin === 'XX0000000001').valueCents, 120000);
  d2.portfolioHistory = recordSnapshot(d2, '2026-10-20');
  assert.equal(d2.portfolioHistory[0].valueCents, 120000 + 69000);
  const d3 = ingest(d2, importCsv(PORTFOLIO_CSV), 'p.csv', '2026-11-20T10:00:00Z').data;
  assert.deepEqual(d3.prices, {});
  assert.equal(d3.portfolioHistory.length, 2);
});

test('crecimiento neto = (valor final - inicial) - aportado del periodo; con una sola foto no hay neto', () => {
  const d = load();
  assert.equal(growthChart(d, 'acum').net, null);
  const d2 = { ...d, portfolioHistory: [{ date: '2026-09-30', valueCents: 50000, positions: [] }, { date: '2026-10-20', valueCents: 100000, positions: [] }] };
  const g = growthChart(d2, 'acum');
  assert.deepEqual(g.months.map((m) => m.key), ['2026-09', '2026-10']);
  // aportado: sep 0 ; oct = 201 - 100 + 173,50 = 274,50 -> 27450
  assert.equal(g.months[1].aportado, 20100 - 10000 + 17350);
  assert.equal(g.net, (100000 - 50000) - 27450);
});

test('rentabilidad anualizada: n/d con menos de 12 meses; Dietz modificado con 12 o más', () => {
  const d = load();
  assert.equal(annualizedReturn(d).ok, false);
  const h = (date, v) => ({ date, valueCents: v, positions: [] });
  const sin = { ...emptyData(), trades: [], portfolioHistory: [h('2025-01-01', 100000), h('2026-01-01', 110000)] };
  const r = annualizedReturn(sin);
  assert.equal(r.ok, true);
  assert.ok(Math.abs(r.annual - 0.1) < 1e-9);
  const corto = { ...sin, portfolioHistory: [h('2026-01-01', 100000), h('2026-06-01', 110000)] };
  assert.deepEqual(annualizedReturn(corto), { ok: false, months: 6 });
  // con una aportación a mitad de año: el capital medio sube y la rentabilidad baja
  const con = { ...sin, trades: [{ date: '2025-07-02', side: 'compra', totalEurCents: 5000, isin: 'X' }] };
  assert.ok(annualizedReturn(con).annual < r.annual);
});

test('peso por tipo y lo que falta para el objetivo de renta fija', () => {
  const d = { ...load(), assetTypes: { XX0000000001: 'ETF o fondo indexado', XX0000000002: 'Bono' } };
  const a = allocation(d);
  assert.equal(a.total, 169500);
  assert.equal(a.cls.fija, 69000);
  assert.equal(a.needCents, 0); // 41 % > 10 %
  const b = { ...d, assetTypes: { XX0000000001: 'ETF o fondo indexado', XX0000000002: 'Acción' }, portfolioSettings: { targetFixedPct: 10, monthlyEur: 400 } };
  const a2 = allocation(b);
  assert.equal(a2.needCents, Math.round((0.1 * 169500) / 0.9));
  assert.equal(a2.months, 1);
});

test('historial de una posición: participaciones, valor y variación de precio mes a mes', () => {
  const snap = (date, q, v) => ({ date, valueCents: v, positions: [{ isin: 'A', name: 'A', quantityE4: q, valueCents: v }] });
  const d = { ...emptyData(), portfolioHistory: [snap('2026-08-31', 100000, 10000), snap('2026-09-30', 100000, 11000), snap('2026-10-31', 200000, 24200)] };
  const h = positionHistory(d, 'A');
  assert.equal(h.length, 3);
  assert.equal(h[0].ret, null);
  assert.ok(Math.abs(h[1].ret - 0.1) < 1e-9);
  assert.ok(Math.abs(h[2].ret - 0.1) < 1e-9); // 12,10 frente a 11,00
  assert.equal(investedInMonth(load(), '2026-10'), 20100 + 17350 - 10000);
});
