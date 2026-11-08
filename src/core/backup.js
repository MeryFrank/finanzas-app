// Copia de seguridad: un archivo cifrado con su propia sal que se puede exportar (a iCloud Drive, por ejemplo) y restaurar.
import { createVault, openVault } from './crypto.js';
import { validateData } from './store.js';

/** Nombre sugerido: finanzas-copia-AAAA-MM-DD.finanzas */
export const backupFileName = (nowIso) => `finanzas-copia-${nowIso.slice(0, 10)}.finanzas`;

/**
 * @param {string} password contraseña de la copia (puede ser la misma de la app)
 * @param {import('./store.js').AppData} data
 * @param {{iterations?:number}} [opts]
 * @returns {Promise<string>} texto para guardar en el archivo
 */
export async function exportBackup(password, data, opts = {}) {
  const { envelope } = await createVault(password, data, { kind: 'backup', iterations: opts.iterations });
  return JSON.stringify(envelope);
}

/**
 * @param {string} password
 * @param {string} fileText
 * @returns {Promise<import('./store.js').AppData>}
 */
export async function restoreBackup(password, fileText) {
  let envelope;
  try { envelope = JSON.parse(fileText); } catch { throw new Error('Archivo no válido'); }
  if (!envelope || !envelope.header || envelope.header.kind !== 'backup') throw new Error('Este archivo no es una copia de seguridad');
  const { data } = await openVault(password, envelope);
  return validateData(data);
}
