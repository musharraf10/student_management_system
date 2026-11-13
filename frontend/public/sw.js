const CACHE_NAME = 'student-attendance-portal-shell-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/icons.svg',
];

// Install: Cache essential app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: Cleanup older caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: Cache-first for static shell assets, Network-only/first for APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never cache API calls indiscriminately
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Handle navigation requests (SPA fallback to index.html when offline)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Cache-first for scripts, styles, images, and fonts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});