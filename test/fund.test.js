import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFormat } from '../src/core/csv/detect.js';
import { parseCsv } from '../src/core/csv/parse.js';
import { importCsv } from '../src/core/csv/import.js';
import { parseFundDate, fundPosition, fundReturnByMonth } from '../src/core/csv/revolutFund.js';
import { FUND_CSV, STATEMENT_CSV } from './fixtures/degiro.js';

test('fecha con mes abreviado en español, incluido "sept"', () => {
  assert.deepEqual(parseFundDate('27 sept 2026, 2:25:35'), { date: '2026-09-27', time: '02:25:35' });
  assert.deepEqual(parseFundDate('5 ene 2026, 12:00:00'), { date: '2026-01-05', time: '12:00:00' });
  assert.deepEqual(parseFundDate('9 dic 2025, 23:59:59'), { date: '2025-12-09', time: '23:59:59' });
  assert.equal(parseFundDate('31 xyz 2026, 1:00:00'), null);
  assert.equal(parseFundDate('2026-09-27'), null);
});

test('detecta el fondo monetario por la cabecera', () => {
  assert.equal(detectFormat(parseCsv(FUND_CSV)[0]).id, 'revolut-fund');
  assert.notEqual(detectFormat(parseCsv(STATEMENT_CSV)[0]).id, 'revolut-fund');
});

test('lee los tipos, importes con 4 decimales y no pierde filas idénticas', () => {
  const r = importCsv(FUND_CSV);
  assert.equal(r.ok, true);
  assert.equal(r.events.length, 9);
  assert.equal(r.skipped.invalid, 0);
  assert.equal(r.events[0].type, 'rendimiento');
  assert.equal(r.events[0].valueE4, 452);
  assert.equal(r.events[1].valueE4, -123);
  assert.equal(r.events.find((e) => e.type === 'venta').sharesE4, 200000);
  assert.equal(new Set(r.events.map((e) => e.key)).size, 9);
  assert.equal(r.events.some((e) => e.type === 'otro'), false);
});

test('posición: compras - ventas a su último precio (el rendimiento pendiente no cuenta)', () => {
  const p = fundPosition(importCsv(FUND_CSV).events);
  assert.equal(p.sharesE4, 805000); // 100 + 0,50 - 20 = 80,50
  assert.equal(p.lastPriceE4, 10000);
  assert.equal(p.valueEurCents, 8050);
});

test('rendimiento por mes: pagado - comisión; reinvertir o retirar no es rendimiento', () => {
  const m = fundReturnByMonth(importCsv(FUND_CSV).events);
  assert.deepEqual(Object.keys(m).sort(), ['2026-01', '2026-09']);
  assert.equal(m['2026-01'].returnCents, 40);
  assert.equal(m['2026-09'].returnCents, 5);
  assert.equal(m['2026-09'].feeCents, -1);
  assert.equal(m['2026-09'].netCents, 3); // 0,0329 € -> 3 céntimos
});
