const CACHE_NAME = 'news-analyser-v1';
self.addEventListener('install', (e) => {
  self.skipWaiting();
});
self.addEventListener('fetch', (e) => {
  // Pass-through strategy for API calls and assets
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});