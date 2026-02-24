/* RoxyScore Service Worker v0.4 */
const CACHE = 'roxyscore-v04';
const STATIC = [
  'index.html','home.html','match.html','team.html','favorites.html','support.html','table.html',
  'config.js','api.js','data.js','shared.js','shared.css',
  'index.css','index.js','home.css','home.js','match.css','match.js',
  'team.css','team.js','favorites.css','favorites.js','support.css','support.js',
  'manifest.json','icon-192.png','icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  // API isteklerini cache'leme — her zaman canlı ver
  if (e.request.url.includes('api-sports') || e.request.url.includes('api-football')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"response":[],"errors":{"network":"offline"}}', { headers:{'Content-Type':'application/json'} })));
    return;
  }
  // Statik dosyalar: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});

// Push bildirimleri (FCM ile tetiklenir)
self.addEventListener('push', e => {
  const data = e.data?.json() || {};
  e.waitUntil(self.registration.showNotification(data.title || 'RoxyScore', {
    body:    data.body    || 'Yeni güncelleme',
    icon:    '/icon-192.png',
    badge:   '/icon-72.png',
    data:    data,
    actions: [{ action:'open', title:'Aç' }],
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.matchId ? `/match.html?id=${e.notification.data.matchId}` : '/home.html';
  e.waitUntil(clients.openWindow(url));
});
