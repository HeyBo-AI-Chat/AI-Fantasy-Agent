// sw.js — AI Fantasy Agent PWA
const CACHE = 'afa-v1';   // bump to v2, v3… whenever you change this file
const ASSETS = [
  '/',                // index route
  '/index.html',
  '/app.js',
  '/config.js',
  '/manifest.json',
  // add your icons / css if you have them:
  // '/icon-192.png',
  // '/icon-512.png',
  // '/styles.css',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first for GET; network passthrough for others
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // don’t intercept posts/puts etc.

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // save a copy for next time (best-effort)
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return res;
      }).catch(() => cached); // if offline and not cached, this will just fail
    })
  );
});
