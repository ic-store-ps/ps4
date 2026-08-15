const CACHE_NAME = "ps4-jb-v1";

const CACHE_FILES = [
  "./",
  "./sw.js",
  "./index.html",
  "./includes/style.css",
  "./includes/script.js",
  "./includes/cat.jpg",
  "./src/main.js",
  "./src/misc.js",
  "./src/loader.js",
  "./src/workers.js",
  "./src/worker.js",
  "./src/lapse.js",
  "./src/netctrl.js",
  "./src/ps4/constants.js",
  "./src/ps4/userland.js",
  "./src/ps4/vueafterfree.js",
  "./src/ps4/kernel.js",
  "./src/payload.bin",
  "./src/ps4/patches/600.bin",
  "./src/ps4/patches/620.bin",
  "./src/ps4/patches/650.bin",
  "./src/ps4/patches/670.bin",
  "./src/ps4/patches/700.bin",
  "./src/ps4/patches/750.bin",
  "./src/ps4/patches/800.bin",
  "./src/ps4/patches/850.bin",
  "./src/ps4/patches/900.bin",
  "./src/ps4/patches/903.bin",
  "./src/ps4/patches/950.bin",
  "./src/ps4/patches/1000.bin",
  "./src/ps4/patches/1050.bin",
  "./src/ps4/patches/1100.bin",
  "./src/ps4/patches/1102.bin",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
