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
