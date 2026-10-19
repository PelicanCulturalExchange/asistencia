/* Service worker: la app abre y funciona aunque se vaya el internet. */
const V = 'pelican-asistencia-v11';
const SHELL = ['./', 'index.html', 'styles.css', 'config.js', 'rules.js','quotes.js', 'daily.js', 'app.js', 'manifest.webmanifest',
  'fonts/poppins-latin-400-normal.woff2', 'fonts/poppins-latin-500-normal.woff2', 'fonts/poppins-latin-600-normal.woff2',
  'fonts/poppins-latin-700-normal.woff2', 'fonts/poppins-latin-800-normal.woff2', 'fonts/poppins-latin-800-italic.woff2', 'fonts/anton-latin-400-normal.woff2',
  'assets/logo.png', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/isotipo.png',
  'assets/jay-thumbs.webp', 'assets/jay-armout.webp', 'assets/jay-open.webp', 'assets/jay-cheer.webp', 'assets/jay-gesture.webp',
  'assets/jay-think.webp', 'assets/jay-side.webp', 'assets/jay-sidetalk.webp', 'assets/jay-wave.webp', 'assets/jay-point.webp'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
/* Primero internet (así los cambios llegan solos); si no hay conexión, usa lo guardado. */
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  const key = u.origin + u.pathname;
  const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 4000);
  e.respondWith(fetch(r, { signal: ctl.signal }).then(res => {
    clearTimeout(tm);
    if (res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => { clearTimeout(tm); return caches.match(key, { ignoreSearch: true }).then(hit => hit || caches.match('index.html')); }));
});
