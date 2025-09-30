// Service Worker for aggressive CheerpJ asset caching
const CACHE_NAME = 'cheerpj-cache-v1';
const CHEERPJ_ASSETS = [
  'https://cjrtnc.leaningtech.com/4.2/loader.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CHEERPJ_ASSETS).catch(err => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Cache CheerpJ CDN resources aggressively
  if (url.includes('cjrtnc.leaningtech.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response) {
            // Return cached, refresh in background
            fetch(event.request).then(freshResponse => {
              if (freshResponse && freshResponse.ok) {
                cache.put(event.request, freshResponse.clone());
              }
            }).catch(() => {});
            return response;
          }
          // Fetch and cache
          return fetch(event.request).then((response) => {
            if (response && response.ok) {
              cache.put(event.request, response.clone());
            }
            return response;
          });
        });
      })
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});
