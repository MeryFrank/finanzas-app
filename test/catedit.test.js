import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyData } from '../src/core/store.js';
import { expenseCatalog } from '../src/core/categories.js';
import { setTipo, addCategory, deleteCategory } from '../src/core/catedit.js';

test('cambiar el tipo se refleja en el catálogo y no toca el código base', () => {
  const d = setTipo(emptyData(), 'supermercado', 'D');
  assert.equal(expenseCatalog(d.categories).find((c) => c.id === 'supermercado').tipo, 'D');
  assert.throws(() => setTipo(emptyData(), 'supermercado', 'X'), /tipo/);
  assert.throws(() => setTipo(emptyData(), 'sin-clasificar', 'F'), /tipo editable/);
});

test('crear categoría: valida nombre repetido, grupo y tipo; el id es único', () => {
  const d0 = emptyData();
  assert.throws(() => addCategory(d0, { name: '', group: 'otros', tipo: 'V' }), /nombre/);
  assert.throws(() => addCategory(d0, { name: 'Supermercado', group: 'otros', tipo: 'V' }), /existe/);
  assert.throws(() => addCategory(d0, { name: 'Mascotas', group: 'inventado', tipo: 'V' }), /grupo/);
  const a = addCategory(d0, { name: 'Mascotas', group: 'otros', tipo: 'V' });
  assert.equal(a.id, 'mascotas');
  const c = expenseCatalog(a.data.categories).find((x) => x.id === 'mascotas');
  assert.deepEqual([c.group, c.tipo], ['otros', 'V']);
  assert.throws(() => addCategory(a.data, { name: ' mascotas ', group: 'otros', tipo: 'V' }), /existe/);
});

test('borrar una categoría propia devuelve sus movimientos a sin clasificar y quita sus reglas', () => {
  let d = addCategory(emptyData(), { name: 'Mascotas', group: 'otros', tipo: 'V' }).data;
  d = setTipo(d, 'mascotas', 'D');
  d = { ...d, movements: [{ key: 'a', kind: 'gasto', categoryId: 'mascotas' }, { key: 'b', kind: 'gasto', categoryId: 'luz' }], rules: [{ pattern: 'pienso', categoryId: 'mascotas' }] };
  const r = deleteCategory(d, 'mascotas');
  assert.equal(r.moved, 1);
  assert.equal(r.data.movements[0].categoryId, null);
  assert.equal(r.data.movements[1].categoryId, 'luz');
  assert.equal(r.data.rules.length, 0);
  assert.equal(r.data.categories.tipos.mascotas, undefined);
  assert.throws(() => deleteCategory(r.data, 'luz'), /propias/);
});
