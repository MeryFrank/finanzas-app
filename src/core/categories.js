// Catálogo de categorías. Se guarda la subcategoría detallada; la app muestra el grupo (anillos) y el tipo.
// Modelo aprobado: 8 grupos del Excel -> 32 subcategorías de gasto, más una etiqueta "tipo" aparte.
// El tipo solo se edita en Datos > Categorías (no en Gastos ni en Ingresos). Los cambios del usuario
// (tipo modificado, categorías nuevas) se guardan en los datos cifrados, no en el código.

/** @type {Record<string, string>} id del grupo -> nombre */
export const EXPENSE_GROUPS = {
  vivienda: 'Vivienda',
  alimentacion: 'Alimentación',
  transporte: 'Transporte',
  'ocio-deporte': 'Ocio y deporte',
  compras: 'Compras personales',
  suscripciones: 'Suscripciones',
  finanzas: 'Finanzas',
  otros: 'Otros'
};

/** Tipos de gasto: F = fijo, V = variable necesario, D = discrecional, '' = sin tipo. */
export const TIPOS = { F: 'Fijo', V: 'Variable necesario', D: 'Discrecional' };

/** @typedef {{id:string,name:string,group:string,tipo:string}} Category */

/** @type {Category[]} */
export const EXPENSE_CATEGORIES = [
  { id: 'alquiler', name: 'Alquiler / hipoteca', group: 'vivienda', tipo: 'F' },
  { id: 'agua', name: 'Agua', group: 'vivienda', tipo: 'F' },
  { id: 'luz', name: 'Luz', group: 'vivienda', tipo: 'F' },
  { id: 'gas', name: 'Gas', group: 'vivienda', tipo: 'F' },
  { id: 'internet-movil', name: 'Internet y móvil', group: 'vivienda', tipo: 'F' },
  { id: 'seguro-hogar', name: 'Seguro del hogar y comunidad', group: 'vivienda', tipo: 'F' },
  { id: 'hogar-mantenimiento', name: 'Hogar y mantenimiento', group: 'vivienda', tipo: 'V' },
  { id: 'supermercado', name: 'Supermercado', group: 'alimentacion', tipo: 'V' },
  { id: 'restaurantes', name: 'Restaurantes y bares', group: 'alimentacion', tipo: 'D' },
  { id: 'cafes', name: 'Cafés y snacks', group: 'alimentacion', tipo: 'D' },
  { id: 'comida-domicilio', name: 'Comida a domicilio', group: 'alimentacion', tipo: 'D' },
  { id: 'transporte-publico', name: 'Transporte público', group: 'transporte', tipo: 'V' },
  { id: 'coche-compartido', name: 'Coche compartido / alquiler', group: 'transporte', tipo: 'D' },
  { id: 'taxi-vtc', name: 'Taxi y VTC', group: 'transporte', tipo: 'D' },
  { id: 'combustible-peajes', name: 'Combustible y peajes', group: 'transporte', tipo: 'V' },
  { id: 'vuelos-trenes', name: 'Vuelos y trenes', group: 'transporte', tipo: 'D' },
  { id: 'deporte-gimnasio', name: 'Deporte y gimnasio', group: 'ocio-deporte', tipo: 'F' },
  { id: 'eventos-salidas', name: 'Eventos y salidas', group: 'ocio-deporte', tipo: 'D' },
  { id: 'cine-entretenimiento', name: 'Cine y entretenimiento', group: 'ocio-deporte', tipo: 'D' },
  { id: 'viajes-alojamiento', name: 'Viajes y alojamiento', group: 'ocio-deporte', tipo: 'D' },
  { id: 'ropa-calzado', name: 'Ropa y calzado', group: 'compras', tipo: 'D' },
  { id: 'salud-farmacia', name: 'Salud y farmacia', group: 'compras', tipo: 'V' },
  { id: 'cuidado-personal', name: 'Cuidado personal', group: 'compras', tipo: 'V' },
  { id: 'otras-compras', name: 'Otras compras', group: 'compras', tipo: 'D' },
  { id: 'regalos', name: 'Regalos', group: 'compras', tipo: 'D' },
  { id: 'software-ia', name: 'Software e IA', group: 'suscripciones', tipo: 'F' },
  { id: 'dj-musica', name: 'DJ y música', group: 'suscripciones', tipo: 'F' },
  { id: 'apple-servicios', name: 'Apple y otros servicios', group: 'suscripciones', tipo: 'F' },
  { id: 'comisiones', name: 'Comisiones bancarias', group: 'finanzas', tipo: 'V' },
  { id: 'impuestos', name: 'Impuestos', group: 'finanzas', tipo: 'F' },
  { id: 'imprevistos', name: 'Imprevistos', group: 'otros', tipo: 'V' },
  { id: 'sin-clasificar', name: 'Sin clasificar', group: 'otros', tipo: '' }
];

export const INCOME_GROUPS = { nomina: 'Nómina', reembolsos: 'Reembolsos' };

export const INCOME_CATEGORIES = [
  { id: 'nomina', name: 'Nómina', group: 'nomina' },
  { id: 'dj-extra', name: 'DJ y actividad extra', group: 'nomina' },
  { id: 'devolucion-impuestos', name: 'Devolución de impuestos', group: 'reembolsos' },
  { id: 'fianza', name: 'Fianza / depósito (puntual)', group: 'reembolsos' },
  { id: 'otros-ingresos', name: 'Otros ingresos', group: 'reembolsos' }
];

const ALL = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

/** @param {string} id */
export const categoryById = (id) => ALL.find((c) => c.id === id) || null;

/**
 * Ajustes de la usuaria guardados en los datos cifrados.
 * @typedef {{tipos?:Record<string,string>, newCats?:Category[]}} CategoryOverrides
 */

/**
 * Catálogo de gasto efectivo: base + categorías nuevas + tipos modificados.
 * Lanza error si una categoría nueva repite nombre o cuelga de un grupo que no existe.
 * @param {CategoryOverrides} [ov]
 * @returns {Category[]}
 */
export function expenseCatalog(ov = {}) {
  const tipos = ov.tipos || {};
  const all = [...EXPENSE_CATEGORIES];
  for (const c of ov.newCats || []) {
    const err = validateNewCategory(c, all);
    if (err) throw new Error(err);
    all.push({ ...c });
  }
  return all.map((c) => (c.id in tipos ? { ...c, tipo: tipos[c.id] } : c));
}

/**
 * @param {{name:string,group:string,tipo:string}} c
 * @param {Category[]} existing
 * @returns {string|null} mensaje de error o null si es válida
 */
export function validateNewCategory(c, existing) {
  const name = (c.name || '').trim();
  if (!name) return 'Escribe un nombre';
  if (!(c.group in EXPENSE_GROUPS)) return 'Elige un grupo';
  if (!(c.tipo in TIPOS)) return 'Elige un tipo';
  const norm = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (existing.some((e) => norm(e.name) === norm(name))) return 'Esa categoría ya existe';
  return null;
}

/** Subcategorías de un grupo. @param {Category[]} cat @param {string} group */
export const subcategories = (cat, group) => cat.filter((c) => c.group === group);

/** Total por tipo a partir de gastos {categoryId, amount} (amount en céntimos, positivo = gasto). */
export function totalsByTipo(cat, spends) {
  const byId = new Map(cat.map((c) => [c.id, c]));
  const out = { F: 0, V: 0, D: 0, '': 0 };
  for (const s of spends) out[byId.get(s.categoryId)?.tipo || ''] += s.amount;
  return out;
}

/** Total por grupo (para los anillos). */
export function totalsByGroup(cat, spends) {
  const byId = new Map(cat.map((c) => [c.id, c]));
  /** @type {Record<string, number>} */
  const out = {};
  for (const s of spends) {
    const g = byId.get(s.categoryId)?.group || 'otros';
    out[g] = (out[g] || 0) + s.amount;
  }
  return out;
}
