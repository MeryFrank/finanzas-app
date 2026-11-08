// Caché mínima para que la app abra sin conexión. Subir VERSION al cambiar archivos.
const VERSION = 'v1';
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'src/styles.css', 'src/main.js', 'src/router.js', 'src/screens/index.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request))));
