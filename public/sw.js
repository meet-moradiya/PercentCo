const CACHE_NAME = "percentco-cache-v3"; // Bump to v3 to trigger cleanup

const urlsToCache = [
  "/offline.html"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(urlsToCache.map(url => cache.add(url)));
    })
  );
});

// Clear old caches to free up space (fixes the 180MB issue)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Deleting old cache:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // Skip caching for APIs, images, and non-http protocols
  if (
    !url.protocol.startsWith("http") || 
    url.pathname.startsWith("/api/") ||
    url.pathname.includes("/_next/image")
  ) {
    return; // Let the browser handle these normally
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful responses and 'basic' types (prevents 7MB padded opaque responses)
        if (response && response.status === 200 && response.type === "basic") {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Optional: return offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match("/offline.html");
          }
        });
      })
  );
});
