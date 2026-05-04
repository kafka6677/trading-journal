// Trading Journal service worker
//
// Network-first for the HTML document so the iPhone home-screen app
// always loads the latest version when online. Cache is used only as
// an offline fallback. Static assets (Google Fonts) are passthrough.
//
// Place this file next to trading-journal.html (or index.html) in your
// GitHub repo — same folder as the HTML.

const CACHE = 'tj-shell-v2';

self.addEventListener('install', event => {
  // Activate the new worker as soon as it has finished installing.
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Drop any older caches.
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    // Take control of any open tabs immediately.
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  // Don't intercept anything cross-origin (Google Fonts, GitHub API, etc.)
  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  if (url.origin !== self.location.origin) return;

  // Network-first ONLY for HTML page navigations
  if (req.mode === 'navigate' || (req.destination === 'document')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch (err) {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response(
          '<!doctype html><meta charset=utf-8><title>Offline</title>' +
          '<body style="font-family:system-ui;padding:32px;background:#08090b;color:#e8eaed">' +
          '<h2>You\'re offline</h2><p>Reconnect and reload to use Trading Journal.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      }
    })());
    return;
  }

  // Everything else: passthrough (no caching)
});

// Allow the page to ask the SW to take over now (used after a new install)
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING' || event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
