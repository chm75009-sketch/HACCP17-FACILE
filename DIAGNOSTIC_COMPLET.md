# Diagnostic complet — HACCP17-FACILE (HACCP Pro)

> Revue **exhaustive** du code réel (lecture intégrale, pas par échantillon) — `script.js` (~20 400 lignes), `index.html`, `sw.js`, `patch_photo_bl.js`, `outils/`.
> 5 passes parallèles : (1) concurrence & charge 10-20 clients, (2) perte/doublon de données & offline, (3) service worker/PWA/iOS, (4) Pack DDPP/rapports, (5) logique métier HACCP. + volet sécurité/RGPD (voir `DIAGNOSTIC_SECURITE.md`).
> Backend Supabase (projet `kiknaxuzpovvivkjqzss`), clé `anon` **unique partagée**. Frontend PWA statique sur **GitHub Pages projet** (sous-chemin `/HACCP17-FACILE/`).
> Date : 2026-06-07.

---

## 0. Causes racines (pourquoi les mêmes bugs reviennent)

Sept faiblesses structurelles expliquent ~90 % des problèmes ci-dessous. Les corriger règle des dizaines de symptômes d'un coup :

| # | Cause racine | Symptômes qu'elle génère |
|---|---|---|
| **R1** | **Pas d'identité serveur** : une seule clé `anon` pour tous → aucune RLS ni rate-limit possible *par client* | Fuite inter-clients, mots de passe dumpables, écritures anonymes, pollution `local-test`, impossible de cloisonner |
| **R2** | **Pas de file de rejeu durable pour les contrôles** (les photos en ont une, pas les contrôles) | Perte au quota, perte après kill d'app, pas de flag « synchronisé », rejeu en mémoire fragile |
| **R3** | **Rattachement photo↔contrôle par heuristique temporelle** (±2 h / ±10 min) au lieu d'un **id explicite** (pourtant disponible) | Photo collée au mauvais contrôle, photos orphelines, preuve mal classée |
| **R4** | **Pas d'empreinte de build** (versionnement manuel) | « iPhone bloqué sur un vieux build », HTML récent + JS périmé = bugs irreproductibles |
| **R5** | **Horloge de l'appareil** utilisée partout (horodatage, expiration, tri, dédup) | Timestamps falsifiables, expiration prématurée, écrasements multi-appareils, faux doublons |
| **R6** | **Aucun échappement HTML** sur les données utilisateur | Lignes de rapport perdues sur un `<`, XSS via jsonb |
| **R7** | **Dépendances CDN non figées/non cachées** (Dexie `@latest`, Supabase, Chart.js…) | Casse silencieuse sans changement de code, app dégradée hors-ligne |

---

## 1. 🔴 CRITIQUE — fuite, perte de données, ou preuve falsifiée

### Sécurité / isolation (détail dans `DIAGNOSTIC_SECURITE.md`)
- **SEC-1** — Aucun cloisonnement serveur : filtre tenant côté client + clé anon partagée → n'importe qui lit/écrit les données de tous via la console. `script.js:31,294,321-330`. *(cause R1)*
- **SEC-2** — Mots de passe en clair, vérifiés côté navigateur, dumpables en masse. `script.js:419,453,16-22,555`.
- **SEC-3** — Photos de traçabilité en **URL publiques non signées**, noms devinables. `script.js:180,129-153`.
- **SEC-4** — Contrôles signés **modifiables/supprimables** après coup (PATCH anon). `script.js:360-369`.

### Perte de données
- **DATA-1** — **Le nettoyage de quota efface les contrôles non synchronisés.** Au `QuotaExceededError`, `lsSet` supprime tous les `haccp_module_data_*` (`script.js:918`), seule copie d'un contrôle saisi hors-ligne. Saisie en zone blanche + stockage plein → **perte définitive** (juste un toast). *(R2)*
- **DATA-2** — **Mode privé iOS / IndexedDB indispo = photos perdues en silence.** `apresLaCapturePhoto` retourne sans rien faire si Dexie absent (`script.js:71-75`) ; l'aperçu s'affiche, l'utilisateur croit la photo prise. *(R7)*
- **DATA-3 / CONC-1** — **Photo rattachée au mauvais contrôle.** Rattachement par fenêtre temporelle (±2 h, `order=asc&limit=1`) `script.js:288-300` (et ±10 min côté Pack `11699`, alors que l'`id` du contrôle est récupéré mais **ignoré** `11599`). Deux réceptions le même matin → la photo de la 2ᵉ se colle à la 1ʳᵉ → preuve fausse en audit DDPP. *(R3)*
- **DATA-4** — **Photo orpheline après kill d'app / délai > 2 h.** Upload réussi mais liaison jamais faite (60 échecs à 5 s puis abandon `script.js:228`) → photo dans Storage jamais rattachée, invisible dans les rapports. *(R3)*
- **DATA-5** — **Client payant hors-ligne après kill d'app = bloqué à l'écran login** (le login fait un fetch réseau `script.js:468,6579`). Impossible de saisir en cuisine sans réseau — le cœur de cible. *(R2)*
- **DATA-6** — **Aucun flag `cloudOk` persistant par contrôle** : rien n'indique de façon durable ce qui est réellement sauvé au cloud → c'est ce qui rend les purges (DATA-1) et évictions destructrices. *(R2)*

### Concurrence (multi-appareils / charge)
- **CONC-2** — **Perte de photo en multi-appareils.** Ajout de photo = lire `photos[]` puis réécrire le tableau entier (`script.js:336-369`), non atomique. Deux téléphones sur le même compte → le dernier écrase l'autre, **et la photo locale est ensuite supprimée** (PASSE 3). Perte définitive. *(R1+R3)*

### Pack DDPP
- **PDF-1** — **Aucune limite/pagination/lazy sur les photos.** 300-500 `<img>` injectées d'un coup (`script.js:11667-11758`), BL inliné en base64 (`patch_photo_bl.js:175`) → crash mémoire iPhone / pages blanches à l'impression.
- **PDF-2** — **Zéro échappement HTML.** Tous les champs libres concaténés bruts (fournisseur, observations, n° lot…). Un nom `Boucherie <Halles>` ou une observation avec `<` **fait disparaître la suite de la ligne** du PDF imprimé. + XSS via `contenu` jsonb manipulé. *(R6)*

### Service worker / PWA
- **SW-1** — **`path === '/'` ne matche jamais** : l'app est sur un sous-chemin (`/HACCP17-FACILE/`), donc le test de « coquille » est mort (`sw.js:97`) → fragilité du rafraîchissement réseau-d'abord.
- **SW-2** — **Dexie chargé en `@latest`, non figé et non caché** (`index.html:107`). Une version majeure incompatible ou un CDN down casse la file photos **sans changement de ton code** = perte de pièces DDPP. *(R7)*
- **SW-3** — **CDN critiques non cachés** (Supabase, Dexie) → app dégradée hors-ligne / au réveil ; `onerror` se contente d'un `console.warn`. *(R7)*

### Logique métier
- **BIZ-1** — **Seuil contradictoire « Cellule de refroidissement ».** `TYPES_ENCEINTES.base` dit ≤ +10 °C (libellé affiché) mais `SEUILS_ENCEINTE` dit +3 °C (seuil calculé) — `script.js:8070` vs `8137`. Affichage et calcul se contredisent → **NC à tort ou conformité à tort**.
- **BIZ-2** — **Expiration essai/abonnement en avance (UTC vs Paris).** `date_expiration` (date seule) parsée à minuit UTC (`script.js:459-464,1402`) → un client est verrouillé **dès 01:00–02:00 heure de Paris** le jour d'expiration, alors que l'alerte promet « jusqu'au … inclus ». *(R5)*
- **BIZ-3** — **Contrôles vides validés comme conformes.** `validerHuiles` (et enceintes) n'exigent que la signature `script.js:10029-10052` → une friteuse/enceinte sans mesure est enregistrée « conforme », sans NC. Autocontrôle fictif = faute réglementaire.

---

## 2. 🟠 MAJEUR — bug bloquant, charge, ou non-conformité

### Charge / concurrence (10-20 clients)
- **CONC-3** — `lierPhotoAuControle` : **jusqu'à 60 GET à 5 s par photo non liée**, sans backoff ni jitter (`script.js:228,395`). Pic matinal de livraisons à 20 clients → **15-30 GET/s** sur la même table. → backoff exponentiel + jitter.
- **CONC-4** — **Réconciliation `limit=1000` avec `contenu`+`photos` complets toutes les 60 s/onglet** (`script.js:13506,19350`). Egress qui grossit avec l'ancienneté ; **au-delà de 1000 contrôles → ré-upload en boucle = doublons**. → ne sélectionner que les champs de signature + fenêtre `date_controle >= now-7j`.
- **CONC-5** — **Lignes `__diag__` écrites en base** (2 par échec, `script.js:20269`) jamais purgées + GET sans filtre (`322`), en rafale au pire moment. → supprimer du build prod + purge.
- **CONC-6** — **`ETAB_ID='local-test'` réassignable** (`script.js:3418,17284,17405`) → tous les établissements en mode test partagent le même `code_client` = **pollution croisée prod/test**. → retirer du prod, rendre `ETAB_ID` non réassignable.
- **CONC-7** — **Collision de nom de fichier + `x-upsert:true`** (`script.js:140,171`) → écrasement silencieux intra-client de deux photos même seconde. → UUID (`crypto.randomUUID()`) dans le nom, `x-upsert:false`.
- **CONC-8** — **Verrous/timers par onglet** (`PHOTO_SYNC_ACTIF`, `_reconcileEnCours`, `setInterval`) → 2 onglets/appareils = **débit ×N** + races réintroduites. → élire un onglet « leader » (`navigator.locks`/`BroadcastChannel`), suspendre les timers si `document.hidden`.

### Perte / doublon de données
- **DATA-7** — **Cap 200 entrées/module évince un contrôle non synchronisé** (`script.js:13322`) ; l'espion 3 s détecte par **comparaison de count**, donc à 200 il **ne détecte plus** les nouveaux (`19390`). → dédup par contenu + garde `cloudOk`.
- **DATA-8** — **Faux doublon à la minute → perte d'un contrôle.** Signature de dédup = `pageId|timestamp|signataire` avec timestamp à la **minute** (`script.js:3220,13528`). 2 relevés même module/agent/minute → un disparaît des rapports. → secondes/ms + UUID client. *(R5)*
- **DATA-9** — **Doublons cloud** (course espion 3 s ↔ réconciliation 60 s, `_pushedSigs` en RAM) — pas de contrainte d'unicité serveur. → unicité serveur idempotente (`Prefer: resolution=ignore-duplicates`).
- **DATA-10** — **`seen` pollué par des entrées locales** injectées dans `_histoCloudRows` par l'UI (`script.js:19295,19503`) → la réconciliation croit synchronisé ce qui ne l'est pas → contrôle jamais envoyé. → reconstruire `seen` depuis les lignes serveur seules.
- **DATA-11** — **`_pushedSigs` posé *avant* confirmation d'envoi** (`script.js:13334`) → en offline, l'espion abandonne le contrôle et ne le réessaie jamais. → marquer après `res.ok`.
- **DATA-12** — **`date_controle` = heure d'upload, pas de saisie** (`script.js:19211`) → après une remontée offline, l'horodatage qui fait foi à l'affichage est faux, et l'ordre réel est perdu. → envoyer l'horodatage réel de validation. *(R5)*
- **DATA-13** — **`_lastSyncError` global écrasé + alerte one-shot** (`script.js:19259,19334`) : un succès efface l'erreur précédente ; une panne qui perd 1 contrôle sur 10 ne lève jamais d'alerte. → badge « N contrôles non synchronisés » persistant.

### Pack DDPP / rapports
- **PDF-3** — **`limit=1000` masque les contrôles anciens** du Pack (`script.js:13506`) → « Aucune donnée » alors que c'est en base = perte de preuve apparente. → filtrer par période côté serveur + paginer.
- **PDF-4** — **Bornes de dates incohérentes** : photos en UTC (`11592`) vs sessions en heure locale (`13415`) → photos/contrôles désappariés en limite de journée. → une seule définition de borne.
- **PDF-5** — **Fusion local/cloud par seuil « plus récent que »** (`script.js:13404-13409`) → un contrôle local **ancien** non synchro est perdu du Pack. → dédup par clé métier.
- **PDF-6** — **Pas de try/catch par module dans le Pack** (`script.js:11936-13078`) → une seule session au jsonb malformé **interrompt tout le rapport**. → envelopper chaque module.
- **PDF-7** — **Signataire absent des sections conformes** du Pack (`script.js:12944-13074`) ; la « signature » n'est qu'un nom tapé (le canvas n'est jamais sérialisé). → afficher le signataire par session ; décider du statut probant de l'émargement.

### Service worker / PWA / iOS
- **SW-4** — **`script.js` (1,1 Mo) sans `?v=`** (`index.html:109`) : invalidation reposant seulement sur le réseau-d'abord → en réseau faible (cuisine), l'iPhone **reste sur l'ancien JS** → désync HTML/JS = bugs irreproductibles. → empreinte de build dans l'URL. *(R4)*
- **SW-5** — **Bump du cache `CACHE='haccp-pro-v39'` manuel** (`sw.js:12`) : un déploiement sans bump = pas de purge, pas de reload auto. → générer `CACHE` en CI. *(R4)*
- **SW-6** — **DataCloneError iOS contourné au login seulement** : les écritures via SDK (`sbSauvegarderModule` 519, enceintes, historique) plantent encore sur certains iPhone, masquées par `console.warn` → **sauvegarde silencieusement perdue**. → généraliser le fetch REST.
- **SW-7** — **Numéros de version désynchronisés** (V80/V95/V111/V126 + cache v39, 305 occurrences) : impossible de savoir quel build tourne, HTML et JS peuvent diverger. → une constante `BUILD` unique en CI. *(R4)*
- **SW-8** — **Double init Supabase, deux clés différentes** (`script.js:34` et `562`) selon l'ordre de chargement defer → comportement « aléatoire » à l'init. → un seul client.

### Logique métier
- **BIZ-4** — **Garde « température implausible » mal placée** (`script.js:8363`) : ne s'exécute que dans la branche seuil custom → +250 °C / -99 °C acceptés pour les enceintes réglementaires. → déplacer en tête de `checkTempEnceinte`.
- **BIZ-5** — **Module Équipe : pas de nettoyage des demi-caractères** (`script.js:14519,14297`) → même `PGRST102` que celui déjà corrigé pour les enceintes, synchro équipe échoue en silence. → appliquer `_wellFormedStr`.
- **BIZ-6** — **Synchro Équipe par comparaison d'horloges** (`script.js:14370`) — l'approche abandonnée pour les enceintes (bug PC→iPhone) subsiste pour l'équipe. → aligner sur `created_at` serveur. *(R5)*
- **BIZ-7** — **ID HTML dupliqué `tcat_seuil_<id>`** (`script.js:3762` span + `3777` input) → l'input « Seuil » réception ne s'affiche jamais. → renommer.
- **BIZ-8** — **Virgule française dans les champs `type=number`** → `.value` vide → **NC non calculée** silencieusement (l'opérateur croit avoir saisi). → `inputmode="decimal"` + parsing `replace(',','.')`.
- **CONC-9 / DATA-14** — **Équipe & enceintes en « dernier écrit gagne »** : POST qui remplace tout le tableau (`script.js:14288,20384`) → deux appareils éditant en parallèle s'écrasent (pas de fusion par membre). → fusion par identité.

---

## 3. 🟡 MINEUR — performance, UX, robustesse, dette

- **MIN-1** — Pack : ~115 lignes de helpers seuils **dupliquées ×4** + 2 blocs de code mort (`script.js:11762-11877,12025-12114,12486-12646`).
- **MIN-2** — Pack : borne haute `23:59:59` sans `.999` exclut la dernière fraction de seconde (`script.js:13415`).
- **MIN-3** — Pack : photos des modules non mappés (`tracabilite`, `analyses_micro`) jamais injectées (`script.js:11611`).
- **MIN-4** — Pack : injection photos sur `setTimeout` fixes (80/300 ms) → course avec rendu volumineux / impression prématurée. → `requestAnimationFrame` + désactiver « Imprimer » pendant l'injection.
- **MIN-5** — Pack : `_secteurActifMatch` laisse passer les contrôles legacy sans `secteur` (`script.js:13390`) → fuite inter-secteurs sur données anciennes.
- **MIN-6** — Affichage `+-20°C` pour un seuil opérateur négatif (`script.js:8337,8366`). Calcul correct, affichage faux.
- **MIN-7** — Voix : nombre négatif dicté sans « moins » non détecté (`script.js:19942`) → +18 au lieu de -18 pour un congélateur.
- **MIN-8** — `hideNCAction(ncEl.id)` hors garde `if(ncEl)` (`script.js:8355`) — `TypeError` potentiel, fragile.
- **MIN-9** — Pull enceintes : `cloudArr` adopté sans re-sanitiser (`script.js:20384`).
- **MIN-10** — Session essai 16 j vs essai réel 3 j (`script.js:3170`) — valeur sans rapport, masque la dépendance au contrôle serveur (BIZ-2).
- **MIN-11** — `var ETAB_ID` / `MODE_LOCAL` déclarés **en double** (`script.js:24/40, 26/42`) — code collé.
- **MIN-12** — Table `enregistrements` écrite (SDK) mais **jamais relue** (`script.js:514`) — chemin mort, double écriture inutile.
- **MIN-13** — Pas de pull périodique des contrôles PC→iPhone (visible seulement à l'ouverture dashboard/rapports) — délai de cohérence.
- **MIN-14** — `navigator.storage.persist()` jamais appelé — augmente le risque d'éviction iOS.
- **MIN-15** — Boucle de reload possible si le shell réseau renvoie un HTML cassé en 200 (`index.html:26-32`) — pas de garde-fou temporel.

---

## 4. Conformité RGPD (rappel — détail dans `DIAGNOSTIC_SECURITE.md`)

- **Région UE à confirmer** dans le dashboard Supabase (`kiknaxuzpovvivkjqzss`).
- **Aucune procédure de purge / droit à l'oubli** ni durée de conservation appliquée (conservation indéfinie).
- **Données personnelles exposées** (noms employés, signatures) via Storage public (SEC-3) + mots de passe en clair (SEC-2) = manquement art. 32.
- **Registre des traitements** : tableau de départ fourni dans `DIAGNOSTIC_SECURITE.md`.

---

## 5. Feuille de route recommandée (ordre de rentabilité)

> Principe : attaquer les **causes racines** R1-R7, pas les symptômes un par un.

**Lot 0 — anti-perte immédiat (frontend seul, gros gain / faible risque)**
1. **DATA-6/R2** : flag `cloudOk` persisté par contrôle, posé **après** `res.ok` → verrou anti-purge.
2. **DATA-1** : ne jamais purger un `haccp_module_data_*` non confirmé cloud (purger d'abord brouillons, base64, `rapportHTML`).
3. **DATA-11** : marquer `_pushedSigs` après confirmation.
4. **DATA-2** : alerter visiblement si IndexedDB indisponible.
5. **DATA-5** : autoriser un login hors-ligne via session valide.

**Lot 1 — intégrité des preuves (frontend + petite RPC)**
6. **R3** : rattacher photo↔contrôle par **id explicite** (POST `Prefer: return=representation`) — règle DATA-3, DATA-4, CONC-2, PDF-4/5.
7. **CONC-2** : ajout de photo atomique via RPC `photos = photos || $1`.
8. **PDF-2/R6** : helper `esc()` appliqué partout dans les rapports.
9. **BIZ-1, BIZ-3, BIZ-4, BIZ-8** : seuils cohérents + refus de validation vide + garde valeur aberrante + virgule décimale.

**Lot 2 — robustesse build & charge**
10. **R4** : constante `BUILD` unique (CI) → `?v=` sur assets + `CACHE` du SW + libellé UI (règle SW-4,5,7).
11. **SW-1,2,3** : corriger le test de coquille, figer/héberger Dexie+Supabase, les cacher.
12. **CONC-3,4,8** : backoff+jitter, réconciliation allégée (champs + fenêtre 7 j), onglet leader + pause `document.hidden`.
13. **CONC-5,6** : retirer `__diag__` et `local-test` du prod.

**Lot 3 — backend (chantier de fond)**
14. **R1** : Supabase Auth (1 compte/établissement) + `establishment_id` + RLS + JWT utilisateur → règle SEC-1,2,3,4 et permet le rate-limit par tenant.
15. **R5** : horodatage serveur (`default now()`), scellement signature, tri/dedup serveur.
16. **RGPD** : purge programmée, procédure droit à l'oubli, confirmation région UE.

**Lot 4 — nettoyage** : MIN-1 à MIN-15 (code mort, doublons de déclaration, table morte, affichages).
