const CACHE_NAME = 'house-tasks-v20261111c';
const STATIC_ASSETS = [
  '/house-tasks-site/',
  '/house-tasks-site/index.html',
  '/house-tasks-site/manifest.webmanifest',
  '/house-tasks-site/favicon.svg',
  '/house-tasks-site/app-config.json',
  '/house-tasks-site/assets/despegue.css',
  '/house-tasks-site/assets/despegue.js',
  '/house-tasks-site/assets/index-RNQ5UdyA.js',
  '/house-tasks-site/assets/index-B5_nnLOS.css',
  '/house-tasks-site/assets/icon-192.png',
  '/house-tasks-site/assets/icon-512.png',
  '/house-tasks-site/assets/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Apagando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache para chamadas de API ou recursos de outros domínios
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) {
    return;
  }

  // Network-First para código JS, CSS e navegação HTML (garante atualizações instantâneas)
  if (
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Stale-While-Revalidate apenas para imagens estáticas e fontes
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
