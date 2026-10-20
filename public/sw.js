/**
 * @file sw.js
 * Service Worker untuk PWA POS F&B Nusantara
 * Menyediakan cache offline untuk aset statis dan toleransi jaringan.
 */

const CACHE_NAME = 'pos-fb-v1';
const STATIC_ASSETS = [
  '/',
  '/pos',
  '/kds',
  '/tables',
  '/manifest.json',
  '/icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (event) => {
  // Hanya proses GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Ambil dari cache, lalu update di latar belakang (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => { });
        return cachedResponse;
      }

      return fetch(event.request).catch(() => {
        // Fallback jika offline total
        return caches.match('/pos');
      });
    })
  );
});
