import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../src/core/csv/parse.js';
import { parseAmount, parseCents, formatEuros } from '../src/core/money.js';
import { detectFormat } from '../src/core/csv/detect.js';
import { importCsv, dedupe, checkBalances, activityEntry } from '../src/core/csv/import.js';
import { applyRules, needsReview } from '../src/core/classify.js';
import { INCOME_CATEGORIES, INCOME_GROUPS } from '../src/core/categories.js';
import { CARD_CSV, ACCOUNT_CSV } from './fixtures/revolut.js';

test('parseCsv: comillas, comas internas, comillas escapadas, BOM y CRLF', () => {
  const rows = parseCsv('﻿a,b\r\n"x, y","di ""hola"""\r\n\r\n');
  assert.deepEqual(rows, [['a', 'b'], ['x, y', 'di "hola"']]);
});

test('parseAmount: punto y coma decimal, miles y signo', () => {
  assert.equal(parseCents('-12.34'), -1234);
  assert.equal(parseCents('12,34'), 1234);
  assert.equal(parseCents('1.234,56'), 123456);
  assert.equal(parseCents('1,234.56'), 123456);
  assert.equal(parseCents('1.234.567'), 123456700);
  assert.equal(parseCents('0.10'), 10);
  assert.equal(parseCents('5'), 500);
  assert.equal(parseCents(''), null);
  assert.equal(parseCents('abc'), null);
  assert.equal(parseAmount('-0,0452', 4), -452);
  assert.equal(parseCents('0.005'), 1);
});

test('formatEuros', () => {
  assert.equal(formatEuros(-123456), '-1.234,56 €');
  assert.equal(formatEuros(5), '0,05 €');
});

test('detectFormat: por cabecera, no por nombre de archivo', () => {
  assert.equal(detectFormat(parseCsv(CARD_CSV)[0]).id, 'revolut-card');
  assert.equal(detectFormat(parseCsv(ACCOUNT_CSV)[0]).id, 'revolut-account');
  assert.equal(detectFormat(['Fecha', 'Concepto', 'Importe']), null);
});

test('tarjeta: tipos de movimiento y pendientes', () => {
  const r = importCsv(CARD_CSV);
  assert.equal(r.ok, true);
  assert.equal(r.skipped.pending, 1);
  assert.deepEqual(r.movements.map((m) => m.kind), ['gasto', 'gasto', 'devolucion', 'traspaso']);
  assert.equal(r.movements[0].amountCents, -2345);
  assert.equal(r.movements[0].date, '2026-10-01');
  assert.equal(r.movements[3].balanceCents, 0);
});

test('cuenta: tipos de movimiento y no completados', () => {
  const r = importCsv(ACCOUNT_CSV);
  assert.equal(r.ok, true);
  assert.equal(r.skipped.pending, 1);
  assert.deepEqual(r.movements.map((m) => m.kind), [
    'traspaso', 'gasto', 'reembolso-compartido', 'traspaso', 'ahorro-inversion', 'devolucion', 'ignorar', 'gasto'
  ]);
  assert.equal(r.movements[7].categoryId, 'comisiones');
});

test('la comisión se resta del importe', () => {
  const csv = [
    'Type,Started Date,Completed Date,Description,Amount,Fee,Balance',
    'CARD_PAYMENT,2026-10-01 10:00:00,2026-10-01 11:00:00,Comercio Inventado,-10.00,0.50,-10.50'
  ].join('\n');
  assert.equal(importCsv(csv).movements[0].amountCents, -1050);
});

test('formato desconocido y archivo vacío devuelven error claro', () => {
  assert.equal(importCsv('a,b\n1,2').ok, false);
  assert.equal(importCsv('').ok, false);
});

test('reimportar un periodo solapado no duplica movimientos', () => {
  const first = importCsv(ACCOUNT_CSV).movements;
  const known = first.slice(0, 5).map((m) => m.key);
  const { nuevos, duplicados } = dedupe(known, first);
  assert.equal(duplicados.length, 5);
  assert.equal(nuevos.length, first.length - 5);
});

test('filas idénticas dentro de un archivo conservan claves distintas', () => {
  const row = 'Pago con tarjeta,Actual,2026-10-02 12:00:00,2026-10-03 08:00:00,Cafeteria Imaginaria,-3.50,0.00,EUR,COMPLETADO,496.50';
  const csv = [ACCOUNT_CSV.split('\n')[0], row, row].join('\n');
  const keys = importCsv(csv).movements.map((m) => m.key);
  assert.equal(new Set(keys).size, 2);
});

test('cuadre de saldos: correcto, en orden inverso y roto', () => {
  const ms = importCsv(ACCOUNT_CSV).movements;
  assert.equal(checkBalances(ms).ok, true);
  assert.equal(checkBalances([...ms].reverse()).ok, true);
  const broken = ms.map((m, i) => (i === 3 ? { ...m, balanceCents: m.balanceCents + 100 } : m));
  const res = checkBalances(broken);
  assert.equal(res.ok, false);
  assert.ok(res.breaks >= 1);
  assert.equal(checkBalances(importCsv(CARD_CSV).movements).ok, true);
});

test('reglas: gana el patrón más largo y no toca traspasos', () => {
  const ms = importCsv(CARD_CSV).movements;
  const out = applyRules(ms, [
    { pattern: 'super', categoryId: 'otras-compras' },
    { pattern: 'supermercado', categoryId: 'supermercado' },
    { pattern: 'to eur', categoryId: 'regalos' }
  ]);
  assert.equal(out[0].categoryId, 'supermercado');
  assert.equal(out[3].categoryId, null);
  assert.equal(ms[0].categoryId, null); // no muta la entrada
  assert.equal(needsReview(out[1]), true); // gasto sin categoría
  assert.equal(needsReview(out[0]), false);
});

test('registro de actividad: solo nombre de archivo y filas nuevas', () => {
  assert.deepEqual(Object.keys(activityEntry('extracto.csv', 7)).sort(), ['file', 'newRows']);
});

test('catálogo de ingresos: 5 categorías en 2 grupos', () => {
  assert.equal(INCOME_CATEGORIES.length, 5);
  assert.ok(INCOME_CATEGORIES.every((c) => c.group in INCOME_GROUPS));
});
