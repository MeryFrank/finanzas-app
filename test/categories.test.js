import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPENSE_CATEGORIES, EXPENSE_GROUPS, TIPOS, expenseCatalog, validateNewCategory,
  subcategories, totalsByTipo, totalsByGroup
} from '../src/core/categories.js';

test('8 grupos y 32 subcategorías, todas con grupo válido', () => {
  assert.equal(Object.keys(EXPENSE_GROUPS).length, 8);
  assert.equal(EXPENSE_CATEGORIES.length, 32);
  assert.ok(EXPENSE_CATEGORIES.every((c) => c.group in EXPENSE_GROUPS));
});

test('tipo: solo F, V, D; "Sin clasificar" no tiene tipo', () => {
  assert.ok(EXPENSE_CATEGORIES.every((c) => c.tipo === '' || c.tipo in TIPOS));
  assert.deepEqual(EXPENSE_CATEGORIES.filter((c) => c.tipo === '').map((c) => c.id), ['sin-clasificar']);
});

test('tipos aprobados en puntos clave', () => {
  const t = (id) => EXPENSE_CATEGORIES.find((c) => c.id === id).tipo;
  assert.equal(t('alquiler'), 'F');
  assert.equal(t('supermercado'), 'V');
  assert.equal(t('restaurantes'), 'D');
  assert.equal(t('deporte-gimnasio'), 'F');
  assert.equal(t('impuestos'), 'F');
});

test('subcategorías de un grupo', () => {
  assert.equal(subcategories(EXPENSE_CATEGORIES, 'vivienda').length, 7);
  assert.equal(subcategories(EXPENSE_CATEGORIES, 'finanzas').length, 2);
});

test('cambiar el tipo de una categoría no toca el catálogo base', () => {
  const cat = expenseCatalog({ tipos: { cafes: 'V' } });
  assert.equal(cat.find((c) => c.id === 'cafes').tipo, 'V');
  assert.equal(EXPENSE_CATEGORIES.find((c) => c.id === 'cafes').tipo, 'D');
});

test('categoría nueva: se añade a su grupo y valida nombre, grupo, tipo y duplicados', () => {
  const nueva = { id: 'mascotas', name: 'Mascotas', group: 'compras', tipo: 'V' };
  const cat = expenseCatalog({ newCats: [nueva] });
  assert.equal(cat.length, 33);
  assert.ok(subcategories(cat, 'compras').some((c) => c.id === 'mascotas'));
  assert.equal(validateNewCategory({ name: ' ', group: 'compras', tipo: 'V' }, cat), 'Escribe un nombre');
  assert.equal(validateNewCategory({ name: 'X', group: 'nada', tipo: 'V' }, cat), 'Elige un grupo');
  assert.equal(validateNewCategory({ name: 'X', group: 'compras', tipo: '' }, cat), 'Elige un tipo');
  assert.equal(validateNewCategory({ name: 'mascótas', group: 'compras', tipo: 'V' }, cat), 'Esa categoría ya existe');
  assert.throws(() => expenseCatalog({ newCats: [{ ...nueva, group: 'nada' }] }));
});

test('totales por tipo y por grupo (importes inventados, en céntimos)', () => {
  const cat = expenseCatalog();
  const gastos = [
    { categoryId: 'alquiler', amount: 50000 },
    { categoryId: 'supermercado', amount: 12000 },
    { categoryId: 'restaurantes', amount: 3000 },
    { categoryId: 'sin-clasificar', amount: 500 }
  ];
  assert.deepEqual(totalsByTipo(cat, gastos), { F: 50000, V: 12000, D: 3000, '': 500 });
  const g = totalsByGroup(cat, gastos);
  assert.equal(g.vivienda, 50000);
  assert.equal(g.alimentacion, 15000);
  assert.equal(g.otros, 500);
});
