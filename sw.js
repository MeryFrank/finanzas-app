// Caché mínima para que la app abra sin conexión. Subir VERSION al cambiar archivos.
const VERSION = 'v12';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'src/styles.css', 'src/main.js', 'src/router.js', 'src/storage.js',
  'src/screens/index.js', 'src/screens/html.js', 'src/screens/lock.js', 'src/screens/datos.js', 'src/screens/ui.js', 'src/screens/gastos.js', 'src/screens/clasificar.js', 'src/screens/presupuesto.js', 'src/screens/movimientos.js', 'src/screens/categorias.js', 'src/screens/ingresos.js', 'src/screens/ahorro.js', 'src/screens/importados.js', 'src/screens/objetivo.js', 'src/screens/cartera.js', 'src/screens/precios.js', 'src/screens/meta.js', 'src/screens/resumen.js',
  'src/core/analysis.js', 'src/core/backup.js', 'src/core/catedit.js', 'src/core/categories.js', 'src/core/classify.js', 'src/core/crypto.js', 'src/core/format.js',
  'src/core/model.js', 'src/core/money.js', 'src/core/savings.js', 'src/core/independence.js', 'src/core/summary.js', 'src/core/portfolio.js', 'src/core/session.js', 'src/core/store.js',
  'src/core/csv/degiro.js', 'src/core/csv/detect.js', 'src/core/csv/import.js', 'src/core/csv/parse.js', 'src/core/csv/revolut.js', 'src/core/csv/revolutFund.js'
];
self.addEventListener('install', (e) => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES))); });
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
// Con conexión se pide siempre la versión más reciente (así las actualizaciones llegan solas); sin conexión, se usa la copia guardada.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); return res; }).catch(() => caches.match(e.request)));
});
