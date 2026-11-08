// Cifrado de los datos y de la copia de seguridad: Web Crypto, AES-256-GCM con clave derivada de la contraseña (PBKDF2-SHA-256).
// Cada archivo cifrado lleva su propia sal; cada guardado, un IV nuevo. La cabecera (versión, kdf, iteraciones, tipo) va autenticada.
// Sin dependencias: funciona igual en el navegador y en Node (globalThis.crypto).

export const PBKDF2_ITERATIONS = 600000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

const b64 = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const enc = new TextEncoder();
const dec = new TextDecoder();
const subtle = () => globalThis.crypto.subtle;
const rand = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

/** @typedef {{v:1, kind:'data'|'backup', kdf:'PBKDF2-SHA256', iter:number, salt:string}} Header */
/** @typedef {{header:Header, iv:string, data:string}} Envelope */
/** @typedef {{key:CryptoKey, header:Header}} Vault clave en memoria mientras la app está desbloqueada */

const headerBytes = (h) => enc.encode(JSON.stringify([h.v, h.kind, h.kdf, h.iter, h.salt]));

async function deriveKey(password, saltB64, iter) {
  const base = await subtle().importKey('raw', enc.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: unb64(saltB64), iterations: iter }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/**
 * Crea un archivo cifrado nuevo (sal nueva) y devuelve también la clave para seguir guardando sin volver a pedir la contraseña.
 * @param {string} password
 * @param {unknown} data
 * @param {{kind?:'data'|'backup', iterations?:number}} [opts]
 * @returns {Promise<{envelope:Envelope, vault:Vault}>}
 */
export async function createVault(password, data, opts = {}) {
  if (!password) throw new Error('Escribe una contraseña');
  const header = { v: 1, kind: opts.kind || 'data', kdf: 'PBKDF2-SHA256', iter: opts.iterations || PBKDF2_ITERATIONS, salt: b64(rand(SALT_BYTES)) };
  const key = await deriveKey(password, header.salt, header.iter);
  const vault = { key, header };
  return { envelope: await seal(vault, data), vault };
}

/** Cifra con la clave ya derivada: misma sal, IV nuevo. @param {Vault} vault @param {unknown} data @returns {Promise<Envelope>} */
export async function seal(vault, data) {
  const iv = rand(IV_BYTES);
  const ct = await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: headerBytes(vault.header) }, vault.key, enc.encode(JSON.stringify(data)));
  return { header: vault.header, iv: b64(iv), data: b64(new Uint8Array(ct)) };
}

/**
 * Descifra. Lanza "Contraseña incorrecta o archivo dañado" si la contraseña no es la correcta o si algo se ha modificado.
 * @param {string} password
 * @param {Envelope} envelope
 * @returns {Promise<{data:any, vault:Vault}>}
 */
export async function openVault(password, envelope) {
  const h = envelope && envelope.header;
  if (!h || h.v !== 1 || h.kdf !== 'PBKDF2-SHA256' || !Number.isInteger(h.iter) || h.iter < 1 || !envelope.iv || !envelope.data) throw new Error('Archivo no válido');
  try {
    const key = await deriveKey(password, h.salt, h.iter);
    const pt = await subtle().decrypt({ name: 'AES-GCM', iv: unb64(envelope.iv), additionalData: headerBytes(h) }, key, unb64(envelope.data));
    return { data: JSON.parse(dec.decode(pt)), vault: { key, header: h } };
  } catch (e) {
    throw new Error('Contraseña incorrecta o archivo dañado');
  }
}
