// Datos de la app y su actualización. Lógica pura: no toca el disco ni el reloj (la fecha llega como parámetro).
// Cada importación añade solo lo nuevo (por clave), las fotos (posiciones) se sustituyen y se anota cuándo se actualizó cada fuente.

import { recordSnapshot } from './portfolio.js';
export const DATA_VERSION = 1;
export const STALE_DAYS = 30;

/** Opciones de bloqueo automático (minutos) y valor por defecto. */
export const LOCK_OPTIONS = [1, 2, 5, 15, 30, 60];
export const DEFAULT_LOCK_MINUTES = 5;

/** Fuentes de datos (una por tipo de CSV). */
export const SOURCES = {
  'revolut-account': 'Revolut - Cuenta bancaria',
  'revolut-card': 'Revolut - Tarjeta de crédito',
  'revolut-fund': 'Revolut - Fondo monetario',
  'degiro-portfolio': 'DEGIRO - Posiciones',
  'degiro-transactions': 'DEGIRO - Compras',
  'degiro-statement': 'DEGIRO - Estado de cuenta'
};

/** Qué fuentes alimentan cada pantalla (para la línea "actualizado el ..."). */
export const SCREEN_SOURCES = {
  resumen: ['revolut-account', 'revolut-card', 'revolut-fund', 'degiro-portfolio'],
  ingresos: ['revolut-account', 'revolut-card'],
  gastos: ['revolut-account', 'revolut-card'],
  ahorro: ['revolut-account', 'revolut-fund'],
  cartera: ['degiro-portfolio', 'degiro-transactions', 'degiro-statement', 'revolut-fund'],
  meta: ['degiro-portfolio', 'degiro-transactions', 'degiro-statement', 'revolut-fund'],
  datos: Object.keys(SOURCES)
};

/**
 * @typedef {Object} AppData
 * @property {1} version
 * @property {import('./model.js').Movement[]} movements movimientos de caja (Revolut cuenta y tarjeta)
 * @property {{positions:any[], cashCents:number|null, asOf:string|null}} portfolio última foto de DEGIRO
 * @property {any[]} trades compras de DEGIRO
 * @property {any[]} investmentEvents dividendos, retenciones, intereses y comisiones de DEGIRO
 * @property {any[]} fundEvents fondo monetario de Revolut
 * @property {{pattern:string,categoryId:string}[]} rules reglas que ha aprendido la app
 * @property {{tipos:Record<string,string>, newCats:any[]}} categories ajustes de categorías
 * @property {Record<string,{lastImportAt:string,lastDataDate:string|null}>} imports
 * @property {Record<string,number>} budget presupuesto mensual por grupo de gasto, en euros (id del grupo -> euros)
 * @property {Record<string,number>} incomeTarget objetivo mensual de ingresos por grupo (nomina, reembolsos), en euros; opcional
 * @property {string|null} incomeTargetSavedAt
 * @property {{date:string,valueCents:number,positions:{isin:string,name:string,quantityE4:number,valueCents:number}[]}[]} portfolioHistory una foto por fecha de importación o de cambio de precios (el historial se construye con cada importación)
 * @property {Record<string,number>} prices precios puestos a mano (isin -> euros por participación); se borran al importar una foto nueva
 * @property {Record<string,string>} assetTypes tipo de activo elegido por la usuaria (isin -> tipo)
 * @property {{age:number|null, ageYear:number|null, retirementMonthly:number, taxPct:number, ipc:number}} independence edad (y año en que se indicó), retirada mensual neta deseada (€), impuestos sobre retiradas (%) e IPC (%)
 * @property {{targetFixedPct:number, monthlyEur:number}} portfolioSettings objetivo de renta fija (%) y aportación mensual a la cartera (euros; 0 = sin definir)
 * @property {number} savingsTarget objetivo mensual de ahorro en euros; 0 = sin objetivo
 * @property {Record<string,string>} names nombres que ha puesto la usuaria a movimientos (clave del movimiento -> nombre)
 * @property {string|null} budgetSavedAt cuándo se guardó el presupuesto (para la revisión cada 6 meses)
 * @property {{lockMinutes:number}} settings bloqueo automático: minutos sin usar la app (también en segundo plano)
 * @property {{file:string,newRows:number,at:string}[]} activity solo nombre del archivo y filas, nunca contenido
 */

/** @returns {AppData} */
export const emptyData = () => ({
  version: DATA_VERSION,
  movements: [],
  portfolio: { positions: [], cashCents: null, asOf: null },
  trades: [],
  investmentEvents: [],
  fundEvents: [],
  rules: [],
  categories: { tipos: {}, newCats: [] },
  imports: {},
  budget: {},
  budgetSavedAt: null,
  names: {},
  savingsTarget: 0,
  portfolioHistory: [],
  prices: {},
  assetTypes: {},
  portfolioSettings: { targetFixedPct: 10, monthlyEur: 0 },
  independence: { age: null, ageYear: null, retirementMonthly: 1500, taxPct: 15, ipc: 2.5 },
  incomeTarget: {},
  incomeTargetSavedAt: null,
  settings: { lockMinutes: DEFAULT_LOCK_MINUTES },
  activity: []
});

/** Comprueba que lo que se restaura tiene la forma esperada; lanza error si no. */
export function validateData(d) {
  const ok = d && typeof d === 'object' && d.version === DATA_VERSION &&
    ['movements', 'trades', 'investmentEvents', 'fundEvents', 'rules', 'activity'].every((k) => Array.isArray(d[k])) &&
    d.portfolio && Array.isArray(d.portfolio.positions) && d.imports && typeof d.imports === 'object' && d.categories;
  if (!ok) throw new Error('Los datos de la copia no tienen el formato esperado');
  if (!d.budget || typeof d.budget !== 'object') d.budget = {};
  if (d.budgetSavedAt === undefined) d.budgetSavedAt = null;
  if (!d.incomeTarget || typeof d.incomeTarget !== 'object') d.incomeTarget = {};
  if (d.incomeTargetSavedAt === undefined) d.incomeTargetSavedAt = null;
  if (!Array.isArray(d.portfolioHistory)) d.portfolioHistory = [];
  if (!d.prices || typeof d.prices !== 'object') d.prices = {};
  if (!d.assetTypes || typeof d.assetTypes !== 'object') d.assetTypes = {};
  if (!d.portfolioSettings || typeof d.portfolioSettings !== 'object') d.portfolioSettings = { targetFixedPct: 10, monthlyEur: 0 };
  d.independence = { age: null, ageYear: null, retirementMonthly: 1500, taxPct: 15, ipc: 2.5, ...(d.independence || {}) };
  if (typeof d.savingsTarget !== 'number' || !(d.savingsTarget >= 0)) d.savingsTarget = 0;
  if (!d.names || typeof d.names !== 'object') d.names = {};
  if (!d.settings || !LOCK_OPTIONS.includes(d.settings.lockMinutes)) d.settings = { lockMinutes: DEFAULT_LOCK_MINUTES }; // datos guardados antes de existir los ajustes
  return d;
}

const maxDate = (list, f = (x) => x.date) => list.reduce((m, x) => (f(x) > m ? f(x) : m), '') || null;

function addNew(existing, incoming) {
  const known = new Set(existing.map((x) => x.key));
  const fresh = incoming.filter((x) => !known.has(x.key));
  return { merged: existing.concat(fresh), added: fresh.length, already: incoming.length - fresh.length };
}

/**
 * Aplica el resultado de importar un CSV. No modifica `data`: devuelve una copia nueva.
 * @param {AppData} data
 * @param {{ok:true, format:{id:string}} & Record<string,any>} result lo que devuelve importCsv
 * @param {string} fileName
 * @param {string} nowIso instante de la importación (ISO)
 * @returns {{data:AppData, summary:{source:string, added:number, already:number}}}
 */
export function ingest(data, result, fileName, nowIso) {
  const id = result.format.id;
  const d = { ...data, imports: { ...data.imports }, activity: [...data.activity] };
  let added = 0;
  let already = 0;
  let lastDataDate = null;
  if (id === 'revolut-card' || id === 'revolut-account') {
    const r = addNew(d.movements, result.movements);
    d.movements = r.merged; added = r.added; already = r.already;
    lastDataDate = maxDate(result.movements);
  } else if (id === 'revolut-fund') {
    const r = addNew(d.fundEvents, result.events);
    d.fundEvents = r.merged; added = r.added; already = r.already;
    lastDataDate = maxDate(result.events);
  } else if (id === 'degiro-transactions') {
    const r = addNew(d.trades, result.trades);
    d.trades = r.merged; added = r.added; already = r.already;
    lastDataDate = maxDate(result.trades);
  } else if (id === 'degiro-statement') {
    const r = addNew(d.investmentEvents, result.events);
    d.investmentEvents = r.merged; added = r.added; already = r.already;
    lastDataDate = maxDate(result.events);
  } else if (id === 'degiro-portfolio') {
    // Foto del momento: la última sustituye a la anterior; el archivo no trae fecha, se usa la de la importación.
    d.portfolio = { positions: result.positions, cashCents: result.cashCents ?? null, asOf: nowIso.slice(0, 10) };
    d.prices = {}; // los precios a mano valían para la foto anterior
    d.portfolioHistory = recordSnapshot(d, nowIso.slice(0, 10));
    added = result.positions.length; lastDataDate = nowIso.slice(0, 10);
  } else {
    throw new Error('Formato no soportado');
  }
  d.imports[id] = { lastImportAt: nowIso, lastDataDate };
  d.activity = [{ file: String(fileName), newRows: added, at: nowIso }, ...d.activity].slice(0, 200);
  return { data: d, summary: { source: id, added, already } };
}

const daysBetween = (aIso, bIso) => Math.floor((Date.parse(bIso) - Date.parse(aIso)) / 86400000);

/**
 * Línea "actualizado el ..." de una pantalla.
 * updatedAt = última importación de sus fuentes; lastDataDate = fecha del dato más reciente;
 * stale = alguna fuente que ya se usó lleva más de STALE_DAYS sin actualizarse.
 * @param {AppData} data
 * @param {keyof typeof SCREEN_SOURCES} screen
 * @param {string} nowIso
 * @returns {{updatedAt:string|null, lastDataDate:string|null, stale:boolean, sources:{id:string,label:string,lastImportAt:string|null,lastDataDate:string|null,stale:boolean}[]}}
 */
export function freshness(data, screen, nowIso) {
  const sources = SCREEN_SOURCES[screen].map((id) => {
    const i = data.imports[id];
    return { id, label: SOURCES[id], lastImportAt: i ? i.lastImportAt : null, lastDataDate: i ? i.lastDataDate : null, stale: !!i && daysBetween(i.lastImportAt, nowIso) > STALE_DAYS };
  });
  const used = sources.filter((s) => s.lastImportAt);
  return {
    updatedAt: used.reduce((m, s) => (!m || s.lastImportAt > m ? s.lastImportAt : m), null),
    lastDataDate: used.reduce((m, s) => (s.lastDataDate && (!m || s.lastDataDate > m) ? s.lastDataDate : m), null),
    stale: used.some((s) => s.stale),
    sources
  };
}
