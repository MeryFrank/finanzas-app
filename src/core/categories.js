// Catálogo de categorías. Se guarda la categoría detallada y la app muestra el grupo.
// Mapeo de las 32 categorías de gasto del Excel a los 8 grupos de la maqueta (propuesta, revisable).

/** @type {Record<string, string>} id del grupo -> nombre */
export const EXPENSE_GROUPS = {
  supermercado: 'Supermercado',
  restaurantes: 'Restaurantes y bares',
  transporte: 'Transporte',
  suscripciones: 'Suscripciones',
  deporte: 'Deporte',
  ocio: 'Ocio',
  hogar: 'Hogar',
  otros: 'Otros'
};

/** @type {{id:string,name:string,group:string}[]} */
export const EXPENSE_CATEGORIES = [
  { id: 'alquiler', name: 'Alquiler / hipoteca', group: 'hogar' },
  { id: 'agua', name: 'Agua', group: 'hogar' },
  { id: 'luz', name: 'Luz', group: 'hogar' },
  { id: 'gas', name: 'Gas', group: 'hogar' },
  { id: 'internet-movil', name: 'Internet y móvil', group: 'hogar' },
  { id: 'seguro-hogar', name: 'Seguro del hogar y comunidad', group: 'hogar' },
  { id: 'hogar-mantenimiento', name: 'Hogar y mantenimiento', group: 'hogar' },
  { id: 'supermercado', name: 'Supermercado', group: 'supermercado' },
  { id: 'restaurantes', name: 'Restaurantes y bares', group: 'restaurantes' },
  { id: 'cafes', name: 'Cafés y snacks', group: 'restaurantes' },
  { id: 'comida-domicilio', name: 'Comida a domicilio', group: 'restaurantes' },
  { id: 'transporte-publico', name: 'Transporte público', group: 'transporte' },
  { id: 'coche-compartido', name: 'Coche compartido / alquiler', group: 'transporte' },
  { id: 'taxi-vtc', name: 'Taxi y VTC', group: 'transporte' },
  { id: 'combustible-peajes', name: 'Combustible y peajes', group: 'transporte' },
  { id: 'vuelos-trenes', name: 'Vuelos y trenes', group: 'transporte' },
  { id: 'deporte-gimnasio', name: 'Deporte y gimnasio', group: 'deporte' },
  { id: 'eventos-salidas', name: 'Eventos y salidas', group: 'ocio' },
  { id: 'cine-entretenimiento', name: 'Cine y entretenimiento', group: 'ocio' },
  { id: 'viajes-alojamiento', name: 'Viajes y alojamiento', group: 'ocio' },
  { id: 'ropa-calzado', name: 'Ropa y calzado', group: 'otros' },
  { id: 'salud-farmacia', name: 'Salud y farmacia', group: 'otros' },
  { id: 'cuidado-personal', name: 'Cuidado personal', group: 'otros' },
  { id: 'otras-compras', name: 'Otras compras', group: 'otros' },
  { id: 'regalos', name: 'Regalos', group: 'otros' },
  { id: 'software-ia', name: 'Software e IA', group: 'suscripciones' },
  { id: 'dj-musica', name: 'DJ y música', group: 'suscripciones' },
  { id: 'apple-servicios', name: 'Apple y otros servicios', group: 'suscripciones' },
  { id: 'comisiones', name: 'Comisiones bancarias', group: 'otros' },
  { id: 'impuestos', name: 'Impuestos', group: 'otros' },
  { id: 'imprevistos', name: 'Imprevistos', group: 'otros' },
  { id: 'sin-clasificar', name: 'Sin clasificar', group: 'otros' }
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
