const CACHE_NAME = 'docformat-pro-vb-cache-v2';
const APP_BASE_PATH = '/VB/';

const CORE_ASSETS = [
  APP_BASE_PATH,
  `${APP_BASE_PATH}manifest.json`,
  `${APP_BASE_PATH}icon-192.png`,
  `${APP_BASE_PATH}icon-512.png`
];

self.addEventListener('install', event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (
    requestUrl.pathname === `${APP_BASE_PATH}health` ||
    requestUrl.pathname.startsWith(`${APP_BASE_PATH}api/`)
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }

        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
          return cachedResponse;
        }

        if (request.mode === 'navigate') {
          return caches.match(APP_BASE_PATH);
        }

        return Response.error();
      })
  );
});