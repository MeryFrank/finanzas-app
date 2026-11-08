import test from 'node:test';
import assert from 'node:assert/strict';
import { detectFormat } from '../src/core/csv/detect.js';
import { parseCsv } from '../src/core/csv/parse.js';
import { importCsv } from '../src/core/csv/import.js';
import { dmyToIso, netReturnCents } from '../src/core/csv/degiro.js';
import { CARD_CSV, ACCOUNT_CSV } from './fixtures/revolut.js';
import { PORTFOLIO_CSV, TRANSACTIONS_CSV, STATEMENT_CSV } from './fixtures/degiro.js';

test('detecta los tres formatos de DEGIRO por la cabecera y no los confunde con Revolut', () => {
  assert.equal(detectFormat(parseCsv(PORTFOLIO_CSV)[0]).id, 'degiro-portfolio');
  assert.equal(detectFormat(parseCsv(TRANSACTIONS_CSV)[0]).id, 'degiro-transactions');
  assert.equal(detectFormat(parseCsv(STATEMENT_CSV)[0]).id, 'degiro-statement');
  assert.equal(detectFormat(parseCsv(CARD_CSV)[0]).id, 'revolut-card');
  assert.equal(detectFormat(parseCsv(ACCOUNT_CSV)[0]).id, 'revolut-account');
});

test('dmyToIso', () => {
  assert.equal(dmyToIso('05-10-2026'), '2026-10-05');
  assert.equal(dmyToIso('2026-10-05'), null);
});

test('cartera: posiciones por ISIN, efectivo aparte y valores en euros', () => {
  const r = importCsv(PORTFOLIO_CSV);
  assert.equal(r.ok, true);
  assert.equal(r.positions.length, 2);
  assert.equal(r.cashCents, 1250);
  const a = r.positions.find((p) => p.isin === 'XX0000000002');
  assert.equal(a.quantityE4, 40000);
  assert.equal(a.closePriceE4, 2000000);
  assert.equal(a.currency, 'USD');
  assert.equal(a.valueEurCents, 69000);
});

test('compras: coste total con comisiones, venta con cantidad negativa y clave por pedido', () => {
  const r = importCsv(TRANSACTIONS_CSV);
  assert.equal(r.trades.length, 3);
  const [t1, t2, t3] = r.trades;
  assert.equal(t1.date, '2026-10-05');
  assert.equal(t1.side, 'compra');
  assert.equal(t1.totalEurCents, 20100);
  assert.equal(t1.feesCents, 100);
  assert.equal(t2.currency, 'USD');
  assert.equal(t2.totalEurCents, 17350);
  assert.equal(t2.feesCents, 150); // cambio de divisa + comisión
  assert.equal(t3.side, 'venta');
  assert.equal(t3.quantityE4, 10000);
  assert.equal(t1.key, 'degiro-trade|ORDER-0001');
});

test('estado de cuenta: solo rendimiento; ignora cambio de divisa, fondo monetario, compras y comisión de cada compra', () => {
  const r = importCsv(STATEMENT_CSV);
  const types = r.events.map((e) => e.type).sort();
  assert.deepEqual(types, ['aportacion', 'comision', 'dividendo', 'interes', 'promocion', 'retencion']);
  assert.equal(r.skipped.internal, 6); // 2 de cambio de divisa, comisión de compra, compra, traspaso al fondo y traspaso sin importe
  assert.equal(r.events.some((e) => e.type === 'otro'), false);
});

test('dividendos en dólares se convierten a euros con el tipo de cambio del mismo día o los siguientes', () => {
  const r = importCsv(STATEMENT_CSV);
  const div = r.events.find((e) => e.type === 'dividendo');
  const tax = r.events.find((e) => e.type === 'retencion');
  assert.equal(div.amountMinor, 30);
  assert.equal(div.amountEurCents, 26); // 0,30 USD / 1,16
  assert.equal(tax.amountEurCents, -7); // -0,08 USD / 1,16
  assert.equal(div.isin, 'XX0000000002');
});

test('rendimiento neto de la inversión: dividendos, retenciones, intereses, comisiones y promociones; sin aportaciones', () => {
  const r = importCsv(STATEMENT_CSV);
  // 26 - 7 + 5 - 250 + 100 = -126
  assert.equal(netReturnCents(r.events), -126);
});

test('reimportar el mismo archivo da las mismas claves y las filas idénticas no colisionan', () => {
  const a = importCsv(STATEMENT_CSV).events.map((e) => e.key);
  const b = importCsv(STATEMENT_CSV).events.map((e) => e.key);
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length);
  const doble = importCsv(STATEMENT_CSV + '\n' + STATEMENT_CSV.split('\n')[5]).events.map((e) => e.key);
  assert.equal(new Set(doble).size, doble.length);
});
