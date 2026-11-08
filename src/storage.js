// Almacenamiento en el dispositivo: IndexedDB guarda solo el archivo ya cifrado (nunca datos en claro).
const DB = 'finanzas';
const STORE = 'kv';
const KEY = 'datos-cifrados';

const open = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(DB, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const run = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
  });
};

export const browserStorage = {
  load: async () => (await run('readonly', (s) => s.get(KEY))) ?? null,
  save: (envelope) => run('readwrite', (s) => s.put(envelope, KEY)).then(() => {})
};

/** Almacenamiento en memoria (pruebas). */
export const memoryStorage = () => { let v = null; return { load: async () => v, save: async (e) => { v = JSON.parse(JSON.stringify(e)); } }; };
