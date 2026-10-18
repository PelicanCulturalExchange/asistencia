/* Service worker: la app abre y funciona aunque se vaya el internet. */
const V = 'pelican-asistencia-v5';
const SHELL = ['./', 'index.html', 'styles.css', 'config.js', 'rules.js','quotes.js', 'app.js', 'manifest.webmanifest',
  'fonts/poppins-latin-400-normal.woff2', 'fonts/poppins-latin-500-normal.woff2', 'fonts/poppins-latin-600-normal.woff2',
  'fonts/poppins-latin-700-normal.woff2', 'fonts/poppins-latin-800-normal.woff2', 'fonts/poppins-latin-800-italic.woff2', 'fonts/anton-latin-400-normal.woff2',
  'assets/logo.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/isotipo.png',
  'assets/jay-thumbs.webp', 'assets/jay-armout.webp', 'assets/jay-open.webp', 'assets/jay-cheer.webp', 'assets/jay-gesture.webp',
  'assets/jay-think.webp', 'assets/jay-side.webp', 'assets/jay-sidetalk.webp', 'assets/jay-wave.webp', 'assets/jay-point.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(hit => hit || fetch(r).then(res => {
    const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); return res;
  }).catch(() => caches.match('index.html'))));
});
