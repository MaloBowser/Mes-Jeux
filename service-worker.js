
const CACHE_NAME = "jeux-de-malo-v5-portraits";

const FICHIERS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./fond.jpg",
    "./web/ui-commune.css",
    "./web/ui-commune.js",
    "./web/avatar-catalogue.js",
    "./web/avatar-progression.js",
    "./web/avatar-menu.js",
    "./web/avatar-dessin.js",
    "./web/assets/avatar/visages.webp",
    "./web/assets/avatar/visages-mini.webp",
    "./web/avatar-menu.css",
    "./web/covers/personnalisation.webp"
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
