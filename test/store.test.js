import test from 'node:test';
import assert from 'node:assert/strict';
import { createVault, openVault, seal } from '../src/core/crypto.js';
import { exportBackup, restoreBackup, backupFileName } from '../src/core/backup.js';
import { emptyData, ingest, freshness, validateData, STALE_DAYS } from '../src/core/store.js';
import { importCsv } from '../src/core/csv/import.js';
import { CARD_CSV, ACCOUNT_CSV } from './fixtures/revolut.js';
import { PORTFOLIO_CSV, TRANSACTIONS_CSV, STATEMENT_CSV, FUND_CSV } from './fixtures/degiro.js';

const FAST = { iterations: 1000 }; // en las pruebas se usan pocas iteraciones para ir rápido
const T1 = '2026-11-08T20:00:00.000Z';

// --- Cifrado ---
test('cifra y descifra; cada cifrado usa un IV nuevo y cada archivo una sal nueva', async () => {
  const a = await createVault('clave-de-prueba', { x: 1 }, FAST);
  const b = await createVault('clave-de-prueba', { x: 1 }, FAST);
  assert.notEqual(a.envelope.header.salt, b.envelope.header.salt);
  const again = await seal(a.vault, { x: 1 });
  assert.notEqual(again.iv, a.envelope.iv);
  assert.equal(again.header.salt, a.envelope.header.salt);
  const { data } = await openVault('clave-de-prueba', a.envelope);
  assert.deepEqual(data, { x: 1 });
  assert.equal(JSON.stringify(a.envelope).includes('"x"'), false); // no hay texto en claro
});

test('contraseña incorrecta, datos manipulados o cabecera cambiada: error', async () => {
  const { envelope } = await createVault('buena', { secreto: 'abc' }, FAST);
  await assert.rejects(() => openVault('mala', envelope), /Contraseña incorrecta o archivo dañado/);
  const bytes = Buffer.from(envelope.data, 'base64'); bytes[0] ^= 1;
  await assert.rejects(() => openVault('buena', { ...envelope, data: bytes.toString('base64') }), /dañado/);
  await assert.rejects(() => openVault('buena', { ...envelope, header: { ...envelope.header, iter: 1001 } }), /dañado/);
  await assert.rejects(() => openVault('buena', { nope: 1 }), /no válido/);
  await assert.rejects(() => createVault('', {}, FAST), /contraseña/);
});

test('la contraseña con acentos o ñ funciona igual escrita de dos formas', async () => {
  const { envelope } = await createVault('contraseña', { ok: true }, FAST);
  const { data } = await openVault('contraseña'.replace('ñ', 'ñ'), envelope);
  assert.deepEqual(data, { ok: true });
});

// --- Importar varias veces ---
test('reimportar un periodo solapado añade solo lo nuevo y no duplica', () => {
  let d = emptyData();
  const first = importCsv(CARD_CSV);
  ({ data: d } = ingest(d, first, 'tarjeta.csv', T1));
  const n = d.movements.length;
  const again = ingest(d, importCsv(CARD_CSV), 'tarjeta.csv', T1);
  assert.equal(again.summary.added, 0);
  assert.equal(again.summary.already, n);
  assert.equal(again.data.movements.length, n);
  // Un extracto más largo que contiene el anterior: entran solo las filas extra
  const extra = CARD_CSV + '\nCARD_PAYMENT,2026-10-12 10:00:00,2026-10-12 11:00:00,Comercio Nuevo,-5.00,0.00,-5.00';
  const longer = ingest(again.data, importCsv(extra), 'tarjeta2.csv', T1);
  assert.equal(longer.summary.added, 1);
  assert.equal(longer.data.movements.length, n + 1);
});

test('ingest no modifica los datos originales', () => {
  const d = emptyData();
  ingest(d, importCsv(ACCOUNT_CSV), 'cuenta.csv', T1);
  assert.equal(d.movements.length, 0);
  assert.deepEqual(d.imports, {});
});

test('las posiciones de DEGIRO se sustituyen por la foto más reciente', () => {
  let { data } = ingest(emptyData(), importCsv(PORTFOLIO_CSV), 'cartera.csv', T1);
  assert.equal(data.portfolio.positions.length, 2);
  const menos = PORTFOLIO_CSV.split('\n').slice(0, 3).join('\n');
  ({ data } = ingest(data, importCsv(menos), 'cartera2.csv', '2026-11-20T10:00:00.000Z'));
  assert.equal(data.portfolio.positions.length, 1);
  assert.equal(data.portfolio.asOf, '2026-11-20');
});

test('compras, estado de cuenta y fondo monetario: también solo lo nuevo', () => {
  let d = emptyData();
  for (const [csv, f] of [[TRANSACTIONS_CSV, 'c.csv'], [STATEMENT_CSV, 'e.csv'], [FUND_CSV, 'f.csv']]) {
    const r1 = ingest(d, importCsv(csv), f, T1); d = r1.data;
    const r2 = ingest(d, importCsv(csv), f, T1);
    assert.equal(r2.summary.added, 0);
    assert.equal(r2.summary.already, r1.summary.added);
  }
  assert.equal(d.trades.length, 3);
  assert.equal(d.fundEvents.length, 9);
});

test('el registro de actividad guarda solo archivo, filas nuevas y hora; nunca contenido', () => {
  const { data } = ingest(emptyData(), importCsv(ACCOUNT_CSV), 'extracto.csv', T1);
  assert.deepEqual(Object.keys(data.activity[0]).sort(), ['at', 'file', 'newRows']);
  assert.equal(JSON.stringify(data.activity).includes('Cafeteria'), false);
});

// --- Fecha de última actualización ---
test('freshness: fecha de importación, del último dato y aviso a los 30 días', () => {
  let { data } = ingest(emptyData(), importCsv(ACCOUNT_CSV), 'cuenta.csv', T1);
  let f = freshness(data, 'gastos', T1);
  assert.equal(f.updatedAt, T1);
  assert.equal(f.lastDataDate, '2026-10-09');
  assert.equal(f.stale, false);
  assert.equal(f.sources.find((s) => s.id === 'revolut-card').lastImportAt, null); // nunca importada: no avisa
  const later = new Date(Date.parse(T1) + (STALE_DAYS + 1) * 86400000).toISOString();
  assert.equal(freshness(data, 'gastos', later).stale, true);
  assert.equal(freshness(data, 'cartera', T1).updatedAt, null); // sin datos de cartera
  ({ data } = ingest(data, importCsv(PORTFOLIO_CSV), 'cartera.csv', later));
  assert.equal(freshness(data, 'cartera', later).stale, false);
  assert.equal(freshness(data, 'datos', later).stale, true); // la cuenta sigue vieja
});

// --- Copia de seguridad ---
test('copia de seguridad: exportar y restaurar devuelve los mismos datos', async () => {
  const { data } = ingest(emptyData(), importCsv(ACCOUNT_CSV), 'cuenta.csv', T1);
  const file = await exportBackup('clave-copia', data, FAST);
  assert.equal(file.includes('Cafeteria'), false);
  assert.deepEqual(await restoreBackup('clave-copia', file), data);
  assert.equal(backupFileName(T1), 'finanzas-copia-2026-11-08.finanzas');
});

test('restaurar: contraseña mala, archivo que no es copia o datos con otra forma', async () => {
  const file = await exportBackup('buena', emptyData(), FAST);
  await assert.rejects(() => restoreBackup('mala', file), /incorrecta/);
  await assert.rejects(() => restoreBackup('buena', 'no es json'), /no válido/);
  const { envelope } = await createVault('buena', emptyData(), { ...FAST, kind: 'data' });
  await assert.rejects(() => restoreBackup('buena', JSON.stringify(envelope)), /no es una copia/);
  const raro = await exportBackup('buena', { hola: 1 }, FAST);
  await assert.rejects(() => restoreBackup('buena', raro), /formato esperado/);
  assert.throws(() => validateData(null));
});
