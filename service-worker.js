const CACHE_NAME = 'Carwash-Database-0.2-cache-v1';
const URLs = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(URLs)));
  self.skipWaiting();
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    caches.match(evt.request).then(resp => {
      return resp || fetch(evt.request).then(fetchResp => {
        return caches.open(CACHE_NAME).then(cache => {
          try { cache.put(evt.request, fetchResp.clone()); } catch(e){}
          return fetchResp;
        });
      }).catch(() => {
        if (evt.request.mode === 'navigate') return caches.match('/index.html');
      });
    })
  );
});

self.addEventListener('activate', evt => { evt.waitUntil(self.clients.claim()); });
