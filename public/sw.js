const CACHE_NAME = "percentco-cache-v1";

const urlsToCache = [
  "/admin",
  "/offline.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});


// self.addEventListener('install', (event) => {
//   // Skip waiting to ensure the new service worker activates immediately.
//   self.skipWaiting();
// });

// self.addEventListener('activate', (event) => {
//   // Claim clients to immediately control the open pages
//   event.waitUntil(self.clients.claim());
// });

// self.addEventListener('fetch', (event) => {
//   // For development and standard Next.js operation, we do a simple Network-First fallback strategy.
//   // Next.js handles its own internal chunk caching, so this Service Worker primarily 
//   // satisfies the PWA installability requirements without aggressively interfering with your live updates.
  
//   // We only intercept GET requests
//   if (event.request.method !== 'GET') return;

//   event.respondWith(
//     fetch(event.request).then((response) => response).catch(async () => {
//       // In a real production offline-first app, you'd return caches.match(event.request) here.
//       // For now, if the network fails, we just let it fail gracefully.
//       return caches.match(event.request);
//     })
//   );
// });
