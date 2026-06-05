# Note — Appliquer le correctif « écran hors-ligne au réveil » sur HACCP 17 Facile

## Contexte
Même bug que sur **Audit 3bis** : pendant un audit, quand on fait une pause
(écran en veille / app en arrière-plan pour discuter avec le client), le
système finit par purger la PWA de la mémoire. Au retour, l'app se recharge.

Le service worker (`sw.js`) est en **« réseau d'abord » sans délai limite** :
au rechargement il tente d'abord le réseau. En zone de mauvais signal (cuisine,
arrière-boutique, cave), la requête traîne avant d'échouer → l'app reste
bloquée sur un écran figé = perçu comme **« hors ligne »**.

## Correctif à appliquer (identique à Audit 3bis)
Passer `sw.js` en **« cache d'abord + revalidation en arrière-plan »**
(*stale-while-revalidate*) :
- L'app se charge **instantanément depuis le cache** (online comme offline).
- Le réseau met à jour le cache **en arrière-plan** pour la fois suivante.
- **Timeout réseau de 6 s** (AbortController) pour ne jamais bloquer l'affichage.
- **Bump du cache** `haccp-pro-v14` → `haccp-pro-v15` (force la maj côté clients).

### Spécificités 17 Facile (à ne pas oublier)
- Garder la **liste `CORE` propre à 17 Facile** (style.css, script.js,
  patch_photo_bl.js, les `slides/slide-*.webp`, etc.).
- Le repli de navigation se fait sur **`./index.html`** (et non `audit.html`).
- `cache.addAll(CORE)` peut être remplacé par `Promise.allSettled(...cache.add)`
  pour qu'un seul fichier manquant ne fasse pas échouer toute l'installation.

### Code cible pour le `fetch` (résumé)
```js
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
  }).catch(() => { clearTimeout(t); return null; });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) { revalidate(req); return cached; }
        return revalidate(req).then((res) => res || caches.match('./index.html'));
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = revalidate(req);
      return cached || network.then((res) => res || cached);
    })
  );
});
```

## Après déploiement
La maj n'est active qu'après avoir **fermé puis rouvert l'app une à deux fois**
(le temps que le nouveau service worker remplace l'ancien).

## Vérifier que rien ne dépend du « toujours frais »
17 Facile change peut-être plus souvent qu'Audit 3bis. Avec cette stratégie,
une nouvelle version s'affiche **au 2e chargement** après déploiement (le 1er
sert le cache, puis se met à jour en fond). C'est le compromis normal et sûr
pour une app de terrain. Si une page doit absolument être toujours fraîche,
l'exclure explicitement de la stratégie cache-first.

---
*Le correctif de référence est déjà en place sur Audit 3bis (branche
`claude/audit-3bis-offline-bug-ifrxM`, fichier `sw.js`, cache v4).*
