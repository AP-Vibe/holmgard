// Holmgard and beyond - service worker: offline after first load, updates in the background
var CACHE = 'holmgard-0.4';
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(['./', './manifest.webmanifest']); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(function (c) {
    return c.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (r) { c.put(e.request, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;   // cache first, refresh in the background
    });
  }));
});
