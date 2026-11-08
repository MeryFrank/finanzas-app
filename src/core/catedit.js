// Cambios de la usuaria sobre las categorías de gasto: tipo, categorías nuevas y borrado de las propias.
// Se guardan en los datos cifrados (data.categories), nunca en el código. No modifican `data`: devuelven una copia.
import { EXPENSE_CATEGORIES, expenseCatalog, validateNewCategory, TIPOS } from './categories.js';

const slug = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'categoria';

/** Cambia el tipo (F, V o D) de una subcategoría. */
export function setTipo(data, id, tipo) {
  if (!(tipo in TIPOS)) throw new Error('Elige un tipo');
  const cat = expenseCatalog(data.categories).find((c) => c.id === id);
  if (!cat || id === 'sin-clasificar') throw new Error('Esa categoría no tiene tipo editable');
  return { ...data, categories: { ...data.categories, tipos: { ...data.categories.tipos, [id]: tipo } } };
}

/** Crea una categoría dentro de uno de los 8 grupos. @returns {{data, id:string}} */
export function addCategory(data, { name, group, tipo }) {
  const existing = expenseCatalog(data.categories);
  const err = validateNewCategory({ name, group, tipo }, existing);
  if (err) throw new Error(err);
  let id = slug(name); let n = 2;
  const ids = new Set(existing.map((c) => c.id));
  while (ids.has(id)) id = `${slug(name)}-${n++}`;
  const cat = { id, name: name.trim(), group, tipo, custom: true };
  return { id, data: { ...data, categories: { ...data.categories, newCats: [...(data.categories.newCats || []), cat] } } };
}

/** Borra una categoría propia. Sus movimientos vuelven a "sin clasificar" y se quitan sus reglas. @returns {{data, moved:number}} */
export function deleteCategory(data, id) {
  const cat = (data.categories.newCats || []).find((c) => c.id === id);
  if (!cat || EXPENSE_CATEGORIES.some((c) => c.id === id)) throw new Error('Solo se pueden borrar las categorías propias');
  let moved = 0;
  const movements = data.movements.map((m) => { if (m.categoryId !== id) return m; moved++; return { ...m, categoryId: null }; });
  const tipos = { ...data.categories.tipos }; delete tipos[id];
  return {
    moved,
    data: { ...data, movements, rules: data.rules.filter((r) => r.categoryId !== id), categories: { tipos, newCats: data.categories.newCats.filter((c) => c.id !== id) } }
  };
}
