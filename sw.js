/* HACCP Pro — Service Worker (PWA)
 * Stratégie : "network-first" pour les fichiers de l'appli (afin d'avoir
 * toujours la dernière version quand on est en ligne), avec repli sur le
 * cache quand on est hors-ligne (utile sur le terrain sans réseau).
 * Les CDN externes (Supabase, Chart.js, polices…) ne sont pas interceptés.
 */
const CACHE = 'haccp-pro-v11';
const CORE = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './patch_photo_bl.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './slides/slide-1.webp',
  './slides/slide-2.webp',
  './slides/slide-3.webp',
  './slides/slide-4.webp',
  './slides/slide-5.webp',
  './slides/slide-6.webp',
  './slides/slide-7.webp',
  './slides/slide-8.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Ne gérer que les GET de notre propre origine ; laisser passer les CDN.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Navigation (ouverture de page) -> réseau d'abord, repli index.html hors-ligne.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Autres ressources locales -> réseau d'abord, repli cache.
  event.respondWith(
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});
