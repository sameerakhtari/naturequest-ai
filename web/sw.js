/* Cache only the app shell; API data and photographs are NEVER cached. */
const CACHE = "naturequest-shell-v1";
const SHELL = ["/", "/styles.css", "/app.js", "/hero.svg", "/favicon.svg", "/icon.svg", "/manifest.webmanifest"];
self.addEventListener("install", function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) {return cache.addAll(SHELL);}).then(function () {return self.skipWaiting();}));
});
self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {return key !== CACHE;}).map(function (key) {return caches.delete(key);}));
  }).then(function () {return self.clients.claim();}));
});
self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  event.respondWith(fetch(event.request).then(function (response) {
    if (response.ok && SHELL.includes(url.pathname)) {
      const copy = response.clone();
      caches.open(CACHE).then(function (cache) {return cache.put(event.request, copy);});
    }
    return response;
  }).catch(function () {return caches.match(event.request).then(function (cached) {
    return cached || (event.request.mode === "navigate" ? caches.match("/") : Response.error());
  });}));
});
