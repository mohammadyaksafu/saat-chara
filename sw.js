/* Saat Chara service worker: lets the game load and play offline after the first visit. */
const CACHE = "saatchara-v3";
const SHELL = [
  "./",
  "index.html",
  "stats.html",
  "css/style.css",
  "js/i18n.js",
  "js/counter.js",
  "js/audio.js",
  "js/net.js",
  "js/game.js",
  "js/stats.js",
  "assets/icon.svg",
  "assets/icon-192.png",
  "assets/icon-512.png",
  "manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Live counters are never cached.
  if (url.hostname.includes("abacus")) return;

  // Google Fonts: cache first, they never change.
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; }))
      )
    );
    return;
  }

  // Game files: serve from cache straight away, refresh the cache in the background.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(req).then((hit) => {
          const net = fetch(req)
            .then((res) => { if (res.ok) c.put(req, res.clone()); return res; })
            .catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
