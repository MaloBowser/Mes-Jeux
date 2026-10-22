
const CACHE_NAME = "jeux-de-malo-v1";

const FICHIERS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./fond.jpg",
    "./web/ui-commune.css",
    "./web/ui-commune.js"
];

// Installation
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(FICHIERS);
        })
    );

    self.skipWaiting();
});

// Activation et nettoyage
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((noms) => {
            return Promise.all(
                noms
                    .filter((nom) => nom !== CACHE_NAME)
                    .map((nom) => caches.delete(nom))
            );
        })
    );

    self.clients.claim();
});

// Chargement des fichiers
self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return;

    if (new URL(event.request.url).origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((reponse) => {
            return reponse || fetch(event.request);
        })
    );
});
