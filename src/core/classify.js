/**
 * Reglas de clasificación por palabra clave en la descripción.
 * Las reglas las crea la usuaria (la app las recuerda en los datos cifrados); el código no trae ninguna.
 * @typedef {{pattern:string, categoryId:string}} Rule
 */

/**
 * Asigna categoría a los gastos sin categoría. Gana la regla de patrón más largo.
 * No toca traspasos, reembolsos compartidos ni movimientos ya clasificados.
 * @param {import('./model.js').Movement[]} movements
 * @param {Rule[]} rules
 * @returns {import('./model.js').Movement[]} copias con la categoría aplicada
 */
export function applyRules(movements, rules) {
  const sorted = [...rules].filter((r) => r.pattern.trim()).sort((a, b) => b.pattern.length - a.pattern.length);
  return movements.map((m) => {
    if (m.categoryId || (m.kind !== 'gasto' && m.kind !== 'devolucion')) return m;
    const d = m.description.toLowerCase();
    const hit = sorted.find((r) => d.includes(r.pattern.toLowerCase()));
    return hit ? { ...m, categoryId: hit.categoryId } : m;
  });
}

/** Un movimiento necesita revisión si la app no sabe qué es o es un gasto sin categoría. */
export const needsReview = (m) => m.kind === 'por-revisar' || (m.kind === 'gasto' && !m.categoryId);

/**
 * Elecciones posibles al clasificar a mano.
 * @typedef {{kind:'gasto'|'ingreso', categoryId:string} | {kind:'traspaso'|'reembolso-compartido'|'ahorro-inversion', categoryId?:null}} Choice
 */

/**
 * Clasifica un movimiento y todos los que estén pendientes con la misma descripción y la misma fuente.
 * Si es un gasto, la app recuerda la descripción como regla para los próximos extractos.
 * No modifica `data`: devuelve una copia.
 * @param {import('./store.js').AppData} data
 * @param {string} key clave del movimiento
 * @param {Choice} choice
 * @returns {{data: import('./store.js').AppData, affected: number}}
 */
export function classifyMovement(data, key, choice) {
  const target = data.movements.find((m) => m.key === key);
  if (!target) throw new Error('No encuentro ese movimiento');
  const same = (m) => needsReview(m) && m.source === target.source && m.description === target.description;
  let affected = 0;
  const movements = data.movements.map((m) => {
    if (m.key !== key && !same(m)) return m;
    affected++;
    return { ...m, kind: choice.kind, categoryId: choice.categoryId ?? null };
  });
  let rules = data.rules;
  const pattern = target.description.trim().toLowerCase();
  if (choice.kind === 'gasto' && pattern && !rules.some((r) => r.pattern === pattern)) rules = [...rules, { pattern, categoryId: choice.categoryId }];
  return { data: { ...data, movements, rules }, affected };
}

/** Cuántos movimientos pendientes comparten descripción y fuente con este (incluido él). */
export const sameCount = (data, key) => {
  const t = data.movements.find((m) => m.key === key);
  return t ? data.movements.filter((m) => m.key === key || (needsReview(m) && m.source === t.source && m.description === t.description)).length : 0;
};
