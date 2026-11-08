// Caché mínima para que la app abra sin conexión. Subir VERSION al cambiar archivos.
const VERSION = 'v2';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'src/styles.css', 'src/main.js', 'src/router.js', 'src/storage.js',
  'src/screens/index.js', 'src/screens/html.js', 'src/screens/lock.js', 'src/screens/datos.js',
  'src/core/backup.js', 'src/core/categories.js', 'src/core/classify.js', 'src/core/crypto.js', 'src/core/format.js',
  'src/core/model.js', 'src/core/money.js', 'src/core/session.js', 'src/core/store.js',
  'src/core/csv/degiro.js', 'src/core/csv/detect.js', 'src/core/csv/import.js', 'src/core/csv/parse.js', 'src/core/csv/revolut.js', 'src/core/csv/revolutFund.js'
];
self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))));
