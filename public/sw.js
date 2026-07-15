const CACHE = "kill-yt-v1";
const OFFLINE_URL = "/";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.add(OFFLINE_URL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Cross-origin (e.g. YouTube thumbnails): cache-first for images.
  if (url.origin !== self.location.origin) {
    if (req.destination === "image") {
      event.respondWith(
        caches.open(CACHE).then(async (c) => {
          const hit = await c.match(req);
          if (hit) return hit;
          try {
            const res = await fetch(req);
            c.put(req, res.clone());
            return res;
          } catch {
            return hit || Response.error();
          }
        }),
      );
    }
    return;
  }

  // Same-origin navigations: network-first, fall back to cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(req) || caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) {
        fetch(req)
          .then((res) => c.put(req, res.clone()))
          .catch(() => {});
        return hit;
      }
      try {
        const res = await fetch(req);
        c.put(req, res.clone());
        return res;
      } catch {
        return Response.error();
      }
    }),
  );
});
