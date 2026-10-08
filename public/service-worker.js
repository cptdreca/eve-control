const CACHE_NAME = 'eve-character-control-v15';
const OFFLINE_URL = '/';
const CORE = ['/manifest.json', '/icons/app-icon-192.png', '/icons/app-icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const {request} = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Character and login data must never be served from an offline cache.
  if (url.origin === self.location.origin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/'))) {
    event.respondWith(fetch(request));
    return;
  }

  // HTML and versioned application files must always come from one deployment.
  if (request.mode === 'navigate' || request.url.includes('/assets/_next/static/')) {
    event.respondWith(
      fetch(request).catch(async () => {
        if (request.mode === 'navigate') return (await caches.match(OFFLINE_URL)) || Response.error();
        return Response.error();
      }),
    );
    return;
  }

  // Cache only stable public assets such as icons and the manifest.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok && url.origin === self.location.origin) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});

