const CACHE_NAME = 'smart-campus-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Use Network-First strategy for HTML pages so users get the latest version
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-First for everything else
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

// Handle Background Sync for Attendance if needed
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-attendance') {
    console.log('[SW] Syncing attendance in background...');
  }
});

// Handle Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Smart Campus Update';
  const options = {
    body: data.body || 'New attendance activity detected.',
    icon: 'https://cdn-icons-png.flaticon.com/512/3596/3596091.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3596/3596091.png'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});
