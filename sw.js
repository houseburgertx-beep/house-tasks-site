const CACHE_NAME = 'house-tasks-v20261112-brand';
const STATIC_ASSETS = [
  '/house-tasks-site/',
  '/house-tasks-site/index.html',
  '/house-tasks-site/iphone.html',
  '/house-tasks-site/assets/apple-task.js',
  '/house-tasks-site/whiteboards.html',
  '/house-tasks-site/notification.html',
  '/house-tasks-site/productivity.html',
  '/house-tasks-site/assets/productivity.css',
  '/house-tasks-site/assets/productivity.js',
  '/house-tasks-site/assets/notification-task.js',
  '/house-tasks-site/assets/whiteboards.css',
  '/house-tasks-site/assets/house-layout.css',
  '/house-tasks-site/assets/house-portal.css',
  '/house-tasks-site/assets/house-desktop.css',
  '/house-tasks-site/assets/house-theme.js',
  '/house-tasks-site/assets/fonts/Inter-Variable.woff2',
  '/house-tasks-site/assets/whiteboards.js',
  '/house-tasks-site/manifest.webmanifest',
  '/house-tasks-site/favicon.svg',
  '/house-tasks-site/app-config.json',
  '/house-tasks-site/assets/google-integrations.js',
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
          if (key.startsWith('house-tasks-') && key !== CACHE_NAME) {
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
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith('/house-tasks-site/') || url.pathname.includes('/api/')) {
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
      fetch(event.request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => (await caches.match(event.request)) ||
          (event.request.mode === 'navigate' ? await caches.match('/house-tasks-site/index.html') : await caches.match(url.pathname)) ||
          Response.error())
    );
    return;
  }

  // Stale-While-Revalidate apenas para imagens estáticas e fontes
  event.respondWith(
    (async () => (await caches.match(event.request)) || (await caches.match(url.pathname)))().then((cachedResponse) => {
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

self.addEventListener("push", event => {
  let message = {};
  try { message = event.data?.json() || {}; } catch {}
  const url = notificationURL(message.url);
  event.waitUntil(self.registration.showNotification("HOUSE TASKS", {
    body: typeof message.body === "string" ? message.body : "Você recebeu um aviso.",
    icon: "/house-tasks-site/assets/icon-192.png",
    tag: typeof message.tag === "string" ? message.tag : undefined,
    data: { url },
  }));
});

function notificationURL(value) {
  const home = new URL("/house-tasks-site/", self.location.origin);
  try {
    const url = new URL(value, home);
    if (url.origin === home.origin && url.pathname === "/house-tasks-site/notification.html" &&
        /^[a-f0-9-]{36}$/i.test(url.searchParams.get("tarefa") || "")) return url.href;
  } catch {}
  return home.href;
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = notificationURL(event.notification.data?.url);
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const existing = tabs.find(client => client.url === url);
    if (existing) return existing.focus();
    return self.clients.openWindow(url);
  })());
});
