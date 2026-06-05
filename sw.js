/* HACCP Pro — Service Worker (PWA)
 * Strategie hybride pour avoir le beurre ET l'argent du beurre :
 *  - COQUILLE de l'app (page, script.js, style.css…) = RESEAU D'ABORD avec un
 *    court delai, repli sur le cache. => des qu'il y a du reseau, l'appareil
 *    charge TOUJOURS la derniere version (fini les iPhone bloques sur un vieux
 *    build, plus besoin de reinstaller). Sans reseau / au reveil de veille, on
 *    retombe vite sur le cache : l'app reste utilisable hors-ligne.
 *  - Ressources stables (images, icones, slides) = CACHE D'ABORD + revalidation
 *    en arriere-plan : chargement instantane, mise a jour discrete.
 * Les CDN externes (Supabase, Chart.js, polices…) ne sont pas interceptes.
 */
const CACHE = 'haccp-pro-v38';
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
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(CORE.map((u) => cache.add(u)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Met a jour le cache en arriere-plan (ne bloque jamais la reponse).
// Timeout reseau pour ne jamais laisser une requete tirer en longueur.
function revalidate(req) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  return fetch(req, { signal: ctrl.signal }).then((res) => {
    clearTimeout(t);
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
    }
    return res;
  }).catch(() => {
    clearTimeout(t);
    return null;
  });
}

// RESEAU D'ABORD pour la coquille : on tente le reseau (delai court), on met le
// cache a jour au passage, et on retombe sur le cache si le reseau manque/traine.
function networkFirst(req, timeoutMs) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(req, { signal: ctrl.signal }).then((res) => {
    clearTimeout(t);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }
    // Reponse invalide (404/500…) -> on prefere le cache s'il existe.
    return caches.match(req).then((c) => c || res);
  }).catch(() => {
    clearTimeout(t);
    // Hors-ligne ou trop lent -> cache, avec repli ultime sur la page d'accueil.
    return caches.match(req).then((c) => c || caches.match('./index.html'));
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Ne gérer que les GET de notre propre origine ; laisser passer les CDN.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const path = new URL(req.url).pathname;
  // Coquille de l'app : navigation (ouverture/rechargement) + fichiers de code.
  const isShell = req.mode === 'navigate'
    || path === '/'
    || /\/(index\.html|script\.js|style\.css|patch_photo_bl\.js)$/.test(path);

  if (isShell) {
    // Reseau d'abord (delai court) -> la derniere version arrive des qu'il y a
    // du reseau ; repli cache pour rester utilisable hors-ligne / au reveil.
    event.respondWith(networkFirst(req, 2500));
    return;
  }

  // Autres ressources same-origin (images, icones, slides…) : cache d'abord,
  // revalidation en arriere-plan.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = revalidate(req);
      return cached || network.then((res) => res || cached);
    })
  );
});
