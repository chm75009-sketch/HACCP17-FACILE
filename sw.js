/* HACCP Pro — Service Worker (PWA)
 * cache-first + revalidation en arriere-plan (stale-while-revalidate) :
 * l'app se charge INSTANTANEMENT depuis le cache (meme apres une mise en veille
 * ou en zone de mauvais reseau), puis se met a jour discretement pour la fois
 * suivante. Fini l'ecran « hors ligne » fige au reveil pendant un audit.
 * Les CDN externes (Supabase, Chart.js, polices…) ne sont pas interceptes.
 */
const CACHE = 'haccp-pro-v26';
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

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Ne gérer que les GET de notre propre origine ; laisser passer les CDN.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Navigation (ouverture / rechargement de page, retour de veille) :
  // on sert IMMEDIATEMENT la page en cache si elle existe, puis on revalide
  // en arriere-plan. Sinon on tente le reseau, avec repli sur index.html.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) {
          revalidate(req); // mise a jour silencieuse pour la prochaine fois
          return cached;
        }
        return revalidate(req).then((res) => res || caches.match('./index.html'));
      })
    );
    return;
  }

  // Autres ressources same-origin : cache d'abord, revalidation en arriere-plan.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = revalidate(req);
      return cached || network.then((res) => res || cached);
    })
  );
});
