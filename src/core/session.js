// Sesión de la app: crear contraseña, desbloquear, bloquear (también por inactividad), guardar cifrado, importar y copias de seguridad.
// Lógica sin DOM: el almacenamiento y el reloj llegan como parámetros, así se prueba sin navegador.
import { createVault, openVault, seal } from './crypto.js';
import { emptyData, validateData, ingest, LOCK_OPTIONS, DEFAULT_LOCK_MINUTES } from './store.js';
import { importCsv } from './csv/import.js';
import { SOURCES } from './store.js';
import { applyRules, classifyMovement, reclassifyMovement, renameMovement } from './classify.js';
import { recordSnapshot } from './portfolio.js';
import { setTipo, addCategory, deleteCategory } from './catedit.js';
import { exportBackup, restoreBackup, backupFileName } from './backup.js';

export const IDLE_MS = DEFAULT_LOCK_MINUTES * 60 * 1000; // por defecto se bloquea a los 5 minutos sin tocar la app o en segundo plano; se puede cambiar en Datos
export const MIN_PASSWORD = 8;

/** @typedef {{load():Promise<any|null>, save(envelope:any):Promise<void>}} Storage */

export class Session {
  /** @param {{storage:Storage, now?:()=>string, iterations?:number}} opts */
  constructor({ storage, now = () => new Date().toISOString(), iterations }) {
    this.storage = storage;
    this.now = now;
    this.iterations = iterations;
    /** @type {'starting'|'new'|'locked'|'open'} */
    this.status = 'starting';
    /** @type {import('./store.js').AppData|null} */
    this.data = null;
    this.vault = null;
    this.envelope = null;
    this.lastTouch = 0;
    this.hiddenAt = null;
  }

  async start() {
    this.envelope = await this.storage.load();
    this.status = this.envelope ? 'locked' : 'new';
  }

  touch() { this.lastTouch = Date.parse(this.now()); }

  /** Tiempo de bloqueo elegido, en milisegundos. */
  get lockMs() { return ((this.data && this.data.settings && this.data.settings.lockMinutes) || DEFAULT_LOCK_MINUTES) * 60000; }

  /** @param {number} minutes uno de LOCK_OPTIONS */
  async setLockMinutes(minutes) {
    if (!LOCK_OPTIONS.includes(minutes)) throw new Error('Tiempo no válido');
    this.touch();
    this.data = { ...this.data, settings: { ...this.data.settings, lockMinutes: minutes } };
    await this.save();
  }

  async create(password, confirm) {
    if (this.status !== 'new') throw new Error('Ya hay datos guardados');
    if (password.length < MIN_PASSWORD) throw new Error(`La contraseña necesita al menos ${MIN_PASSWORD} caracteres`);
    if (password !== confirm) throw new Error('Las contraseñas no coinciden');
    const data = emptyData();
    const { envelope, vault } = await createVault(password, data, { iterations: this.iterations });
    await this.storage.save(envelope);
    Object.assign(this, { envelope, vault, data, status: 'open' });
    this.touch();
  }

  async unlock(password) {
    if (this.status !== 'locked') throw new Error('No hay nada que desbloquear');
    const { data, vault } = await openVault(password, this.envelope);
    validateData(data);
    Object.assign(this, { data, vault, status: 'open' });
    this.touch();
  }

  /** Olvida la clave y los datos en memoria. */
  lock() {
    if (this.status !== 'open') return;
    this.data = null;
    this.vault = null;
    this.status = 'locked';
  }

  async save() {
    this.envelope = await seal(this.vault, this.data);
    await this.storage.save(this.envelope);
  }

  /** Bloquea si lleva mucho rato sin actividad. Devuelve true si bloqueó. */
  checkIdle() {
    if (this.status === 'open' && Date.parse(this.now()) - this.lastTouch > this.lockMs) { this.lock(); return true; }
    return false;
  }

  /** La app pasa a segundo plano / vuelve; se bloquea si ha estado fuera más del tiempo elegido. Devuelve true si al volver se bloqueó. */
  visibility(hidden) {
    if (hidden) { this.hiddenAt = Date.parse(this.now()); return false; }
    const away = this.hiddenAt == null ? 0 : Date.parse(this.now()) - this.hiddenAt;
    this.hiddenAt = null;
    if (this.status === 'open' && away > this.lockMs) { this.lock(); return true; }
    return false;
  }

  /**
   * Importa varios CSV. Guarda una sola vez al final. Nunca se guarda el contenido, solo el nombre y las filas nuevas.
   * @param {{name:string, text:string}[]} files
   */
  async importFiles(files) {
    this.touch();
    const out = [];
    let data = this.data;
    for (const f of files) {
      const r = importCsv(f.text);
      if (!r.ok) { out.push({ file: f.name, ok: false, error: r.error }); continue; }
      const res = ingest(data, r, f.name, this.now());
      data = res.data;
      out.push({ file: f.name, ok: true, format: r.format.id, label: SOURCES[r.format.id] || r.format.label, added: res.summary.added, already: res.summary.already });
    }
    if (data !== this.data) { this.data = { ...data, movements: applyRules(data.movements, data.rules) }; await this.save(); }
    return out;
  }

  /** Clasifica a mano un movimiento (y los iguales que sigan pendientes). @returns {Promise<number>} cuántos se han clasificado */
  async classify(key, choice) {
    this.touch();
    const r = classifyMovement(this.data, key, choice);
    this.data = r.data;
    await this.save();
    return r.affected;
  }

  async reclassify(key, choice) {
    this.touch();
    this.data = reclassifyMovement(this.data, key, choice);
    await this.save();
  }

  async rename(key, name) {
    this.touch();
    this.data = renameMovement(this.data, key, name);
    await this.save();
  }

  async setTipo(id, tipo) { this.touch(); this.data = setTipo(this.data, id, tipo); await this.save(); }

  async addCategory(c) { this.touch(); const r = addCategory(this.data, c); this.data = r.data; await this.save(); return r.id; }

  async deleteCategory(id) { this.touch(); const r = deleteCategory(this.data, id); this.data = r.data; await this.save(); return r.moved; }

  /** Precios a mano (isin -> euros por participación). Vacío o 0 = usar el precio del archivo. Guarda también la foto de hoy. */
  async setPrices(prices) {
    this.touch();
    const clean = {};
    for (const [k, v] of Object.entries(prices)) if (Number.isFinite(v) && v > 0) clean[k] = v;
    const d = { ...this.data, prices: clean };
    d.portfolioHistory = recordSnapshot(d, this.now().slice(0, 10));
    this.data = d;
    await this.save();
  }

  async setAssetType(isin, kind) { this.touch(); this.data = { ...this.data, assetTypes: { ...this.data.assetTypes, [isin]: kind } }; await this.save(); }

  async setPortfolioSettings(s) {
    this.touch();
    const pct = Number(s.targetFixedPct); const m = Number(s.monthlyEur);
    this.data = { ...this.data, portfolioSettings: { targetFixedPct: Number.isFinite(pct) ? Math.min(100, Math.max(0, Math.round(pct))) : 10, monthlyEur: Number.isFinite(m) && m > 0 ? Math.round(m) : 0 } };
    await this.save();
  }

  /** Marca o desmarca una casilla del proceso mensual; al cambiar de mes se parte de cero. */
  async toggleMonthly(key) {
    this.touch();
    const month = new Date(this.now()).toISOString().slice(0, 7);
    const cur = this.data.monthly.month === month ? this.data.monthly.checks : {};
    const checks = { ...cur, [key]: !cur[key] };
    const all = ['c1', 'c2', 'c3', 'c4', 'c5'].every((k) => checks[k]);
    this.data = { ...this.data, monthly: { month, checks, lastDoneAt: all ? new Date(this.now()).toISOString() : this.data.monthly.lastDoneAt } };
    await this.save();
  }

  /** Ajustes de independencia; solo se guardan los campos válidos que se pasen. */
  async setIndependence(c) {
    this.touch();
    const cur = this.data.independence;
    const num = (v, lo, hi) => (Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
    const age = num(c.age, 16, 89);
    const next = { ...cur };
    if (age !== undefined) { next.age = Math.round(age); next.ageYear = new Date(this.now()).getFullYear(); }
    const ret = num(c.retirementMonthly, 100, 100000); if (ret !== undefined) next.retirementMonthly = Math.round(ret);
    const tax = num(c.taxPct, 0, 60); if (tax !== undefined) next.taxPct = Math.round(tax);
    const ipc = num(c.ipc, 0, 20); if (ipc !== undefined) next.ipc = Math.round(ipc * 10) / 10;
    this.data = { ...this.data, independence: next };
    await this.save();
  }

  /** @param {number} euros objetivo mensual de ahorro; 0 o vacío = sin objetivo */
  async setSavingsTarget(euros) {
    this.touch();
    const v = Number(euros);
    this.data = { ...this.data, savingsTarget: Number.isFinite(v) && v > 0 ? Math.round(v) : 0 };
    await this.save();
  }

  /** @param {Record<string,number>} target euros al mes por grupo de ingreso */
  async setIncomeTarget(target) {
    this.touch();
    this.data = { ...this.data, incomeTarget: { ...target }, incomeTargetSavedAt: this.now() };
    await this.save();
  }

  /** @param {Record<string,number>} budget euros al mes por grupo */
  async setBudget(budget) {
    this.touch();
    this.data = { ...this.data, budget: { ...budget }, budgetSavedAt: this.now() };
    await this.save();
  }

  /** @returns {Promise<{name:string, text:string}>} */
  async makeBackup(password) {
    this.touch();
    const out = { name: backupFileName(this.now()), text: await exportBackup(password, this.data, { iterations: this.iterations }) };
    this.data = { ...this.data, lastBackupAt: new Date(this.now()).toISOString() };
    await this.save();
    return out;
  }

  /** Sustituye los datos actuales por los de la copia. */
  async restore(password, fileText) {
    this.touch();
    this.data = await restoreBackup(password, fileText);
    await this.save();
  }
}
