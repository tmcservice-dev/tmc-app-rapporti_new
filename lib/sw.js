// Service Worker TMC Service — abilita l'installazione come PWA e il
// funzionamento OFFLINE completo: interfaccia, librerie PDF/anteprima e
// compilazione/generazione rapportini funzionano senza connessione.
// Restano possibili solo offline le azioni che richiedono per forza
// internet: importa dal calendario, invio email, aggiornamento calendario.
const CACHE_NAME = 'tmc-service-v2';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './static/intestazione.jpg',
  './static/piede.jpg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Librerie PDF ospitate localmente (non più da CDN esterno): senza
  // queste in cache, offline l'app si apre ma non genera né mostra PDF.
  './lib/jspdf.umd.min.js',
  './lib/jspdf.plugin.autotable.min.js',
  './lib/pdf.min.js',
  './lib/pdf.worker.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .catch(() => {}) // non bloccare l'installazione se un file manca
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Solo richieste GET dello stesso dominio: mai intercettare le chiamate
  // POST verso Google Apps Script (calendario, invio email, ecc.)
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
      // Mostra subito la versione in cache se c'è, aggiornandola in background
      return cached || fetchPromise;
    })
  );
});
