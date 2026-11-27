const CACHE_PREFIX = 'mi-peluqueria-app-';
const CACHE_NAME = CACHE_PREFIX + '1';
const HOME = new URL('./', self.registration.scope);
const INDEX_PATH = new URL('index.html', HOME).pathname;
const ASSETS = ['manifest.webmanifest', 'mi-peluqueria-192.png', 'mi-peluqueria.png']
  .map(path => new URL(path, HOME).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([HOME.href, ...ASSETS].map(url => new Request(url, {cache:'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== HOME.origin) return;
  if (request.mode === 'navigate' && [HOME.pathname, INDEX_PATH].includes(url.pathname)) {
    event.respondWith(loadPublicFile(request, HOME.href));
  } else if (ASSETS.includes(url.href)) {
    event.respondWith(loadPublicFile(request, url.href));
  }
});

async function loadPublicFile(request, cacheKey) {
  try {
    const response = await fetch(request, {cache:'no-cache'});
    if (response.ok && response.type === 'basic') {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(cacheKey, response.clone());
      } catch (_) {
        // La página sigue funcionando si el navegador limita la caché.
      }
    }
    if (response.status < 500) return response;
    return await caches.match(cacheKey, {cacheName:CACHE_NAME}) || response;
  } catch (_) {
    return await caches.match(cacheKey, {cacheName:CACHE_NAME}) || Response.error();
  }
}
