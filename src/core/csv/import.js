import { parseCsv } from './parse.js';
import { detectFormat } from './detect.js';
import { parseRevolutCard, parseRevolutAccount } from './revolut.js';

const PARSERS = { 'revolut-card': parseRevolutCard, 'revolut-account': parseRevolutAccount };

/**
 * Lee un CSV, detecta el formato por la cabecera y devuelve los movimientos.
 * @param {string} text contenido del archivo
 * @returns {{ok:true, format:{id:string,label:string}, movements:import('../model.js').Movement[], skipped:{pending:number,invalid:number}} | {ok:false, error:string}}
 */
export function importCsv(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return { ok: false, error: 'El archivo está vacío.' };
  const format = detectFormat(rows[0]);
  if (!format) return { ok: false, error: 'No reconozco este formato de CSV.' };
  const { movements, skipped } = PARSERS[format.id](rows);
  return { ok: true, format, movements, skipped };
}

/**
 * Separa los movimientos nuevos de los que ya estaban (al reimportar un periodo solapado).
 * @param {Iterable<string>} existingKeys
 * @param {import('../model.js').Movement[]} movements
 */
export function dedupe(existingKeys, movements) {
  const known = new Set(existingKeys);
  const nuevos = [];
  const duplicados = [];
  for (const m of movements) (known.has(m.key) ? duplicados : nuevos).push(m);
  return { nuevos, duplicados };
}

/**
 * Entrada del registro de actividad: solo el nombre del archivo y cuántas filas son nuevas, nunca el contenido.
 * @param {string} fileName
 * @param {number} newRows
 */
export const activityEntry = (fileName, newRows) => ({ file: String(fileName), newRows });

/**
 * Comprueba la continuidad de saldos: saldo anterior + importe = saldo siguiente.
 * Acepta extractos en orden cronológico ascendente o descendente.
 * @param {import('../model.js').Movement[]} movements en el orden del archivo
 * @returns {{ok:boolean, breaks:number, checked:number}}
 */
export function checkBalances(movements) {
  const run = (list) => {
    let breaks = 0;
    let checked = 0;
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      if (a.balanceCents == null || b.balanceCents == null) continue;
      checked++;
      if (a.balanceCents + b.amountCents !== b.balanceCents) breaks++;
    }
    return { breaks, checked };
  };
  const asc = run(movements);
  const desc = run([...movements].reverse());
  const best = asc.breaks <= desc.breaks ? asc : desc;
  return { ok: best.breaks === 0, breaks: best.breaks, checked: best.checked };
}
