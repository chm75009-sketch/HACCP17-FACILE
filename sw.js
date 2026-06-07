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
const CACHE = 'haccp-pro-v40';
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

// COQUILLE DE L'APP (index.html, script.js…) : CACHE D'ABORD + revalidation en
// arriere-plan SANS DELAI (« stale-while-revalidate »).
//  • Pourquoi : script.js fait ~1,2 Mo. L'ancienne strategie « reseau d'abord »
//    avec abandon a 2,5 s ne finissait JAMAIS le telechargement sur mobile, donc
//    le cache n'etait jamais mis a jour et l'appareil restait sur un vieux build.
//  • Maintenant : on sert le cache tout de suite (instantane, marche hors-ligne),
//    et on telecharge la nouvelle version EN ENTIER en arriere-plan (aucun
//    timeout, aucun abandon) pour la prochaine ouverture. La livraison immediate
//    d'une grosse mise a jour reste assuree par le bump de version (CACHE), dont
//    l'event `install` recharge tout le CORE puis declenche un reload (cf. page).
function shellStrategy(req) {
  return caches.match(req).then((cached) => {
    const network = fetch(req).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => null);
    if (cached) return cached;                 // rapide + maj silencieuse en fond
    // Pas encore en cache : on attend le reseau, repli ultime sur la page d'accueil.
    return network.then((res) => res || caches.match('./index.html'));
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Ne gérer que les GET de notre propre origine ; laisser passer les CDN.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  const path = new URL(req.url).pathname;
  // SW-1 : l'app est servie sur un sous-chemin (ex. /HACCP17-FACILE/), donc
  // `path === '/'` ne matchait jamais. On matche aussi la racine réelle (scope).
  let scopePath = '/';
  try { scopePath = new URL(self.registration.scope).pathname; } catch (e) {}
  // Coquille de l'app : navigation (ouverture/rechargement) + fichiers de code.
  const isShell = req.mode === 'navigate'
    || path === '/'
    || path === scopePath
    || /\/(index\.html|script\.js|style\.css|patch_photo_bl\.js)$/.test(path);

  if (isShell) {
    // Cache d'abord + mise a jour complete en arriere-plan (voir shellStrategy).
    event.respondWith(shellStrategy(req));
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
