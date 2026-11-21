// Triply v2 service worker
// HTML: network-first (geen verouderde versie na een update), offline: uit cache.
// Iconen, lettertypes, QR-bibliotheek: cache-first. API: nooit cachen (de app regelt dat zelf).
const CACHE = 'triply-v2.0.0';
const SHELL = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png', '/icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API en wisselkoersen: altijd live
  if (url.pathname.startsWith('/api/') || url.hostname.includes('vercel.app') || url.hostname.includes('frankfurter')) return;

  // Pagina's: network-first
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('.html'))) {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('/index.html', copy));
        return res;
      }).catch(() => caches.match('/index.html').then(r => r || caches.match('/')))
    );
    return;
  }

  // Overige assets: cache-first, daarna bijwerken
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
