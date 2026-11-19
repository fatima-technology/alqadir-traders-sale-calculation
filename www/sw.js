// AL QADIR TRADERS - Service Worker: offline support + automatic updates.
// Online  -> always fetches the newest files from GitHub Pages (auto update).
// Offline -> serves the last saved copy, so the app keeps working without internet.
const V = 'aq-sw-v1';
const CORE = ['./', './index.html', './firebase-cloud.js', './firebase-config.js', './offline.html'];
const WARM = [
  'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js'
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await Promise.all(WARM.map(u => c.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, x => { clearTimeout(t); rej(x); }); });
const cacheable = r => r && (r.ok || r.type === 'opaque');
async function networkFirst(req) {
  const c = await caches.open(V);
  try {
    const r = await timeout(fetch(req, { cache: 'no-cache' }), 5000);
    if (cacheable(r)) c.put(req, r.clone());
    return r;
  } catch (err) {
    const m = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('./index.html') : null);
    if (m) return m;
    if (req.mode === 'navigate') { const o = await c.match('./offline.html'); if (o) return o; }
    throw err;
  }
}
async function cacheFirst(req) {
  const c = await caches.open(V);
  const m = await c.match(req);
  if (m) return m;
  const r = await fetch(req);
  if (cacheable(r)) c.put(req, r.clone());
  return r;
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return;
  if (u.hostname.endsWith('googleapis.com') && !u.pathname.includes('/firebasejs/')) return; // Firebase API calls: never cache
  if (u.hostname.endsWith('firebaseio.com') || u.hostname.endsWith('firestore.googleapis.com')) return;
  e.respondWith(u.origin === self.location.origin ? networkFirst(req) : cacheFirst(req));
});
