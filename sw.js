const CACHE_NAME = 'house-tasks-shell-v2';
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
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass cache para chamadas de API ou recursos externos não estáticos
  if (url.origin !== self.location.origin || url.pathname.includes('/api/')) {
    return;
  }

  // Stale-While-Revalidate para ativos estáticos da interface
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
