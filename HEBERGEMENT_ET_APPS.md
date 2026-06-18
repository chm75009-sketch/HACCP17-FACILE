# Hébergement unique + publication iOS / Android

Ce dépôt regroupe **deux applications** sous **un seul hébergement** (un seul site,
donc plus de double facture d'hébergement) :

| Application | Rôle | URL (depuis la racine du site) | Installable |
|---|---|---|---|
| **HACCP Pro** | Gestion quotidienne du PMS (relevés, traçabilité, NC, Pack DDPP…) | `/` (racine) | ✅ PWA |
| **ExpertAudit — Clean Food** | Audit hygiène multi-secteurs (grilles GBPH, score, rapport, documents, sanctions, tarifs) | `/audit/` | ✅ PWA |

Les deux applications restent **indépendantes** (chacune garde sa logique, sa base
Supabase et son service worker), mais elles sont **servies par le même domaine** et
**reliées entre elles** :

- Dans **HACCP Pro** : depuis l'écran « Que voulez-vous faire ? » → section
  **« Audit & conformité »** → carte *« Je réalise un audit hygiène complet »*
  qui ouvre `/audit/`.
- Dans **ExpertAudit** : lien **« ⟵ HACCP Pro »** en haut de la navigation, qui
  ramène à la racine.

## Arborescence

```
/                      → HACCP Pro (index.html, script.js, style.css, sw.js, manifest…)
/audit/                → ExpertAudit / Clean Food (index.html, audit.html, controles.html,
                          documents.html, sanctions.html, tarifs.html, shared.js,
                          sw.js, manifest.webmanifest, icônes)
```

Chaque dossier a **son propre `manifest.webmanifest` et son `sw.js`**, avec un
`scope` distinct (`/` pour HACCP Pro, `/audit/` pour ExpertAudit). Résultat : les
deux peuvent être **installées séparément** (deux icônes sur le téléphone), ou
utilisées dans le même onglet via les liens croisés.

---

## 1) Le plus simple et gratuit : installation PWA (« Ajouter à l'écran d'accueil »)

Aucun store, aucun frais. Les deux applis sont déjà des PWA hors-ligne.

- **Android (Chrome)** : ouvrir l'URL → menu ⋮ → *Installer l'application* /
  *Ajouter à l'écran d'accueil*.
- **iPhone/iPad (Safari)** : ouvrir l'URL → bouton Partager → *Sur l'écran d'accueil*.

Pour proposer les deux applis, on installe `/` (HACCP Pro) **et** `/audit/`
(ExpertAudit) : deux icônes distinctes.

> Prérequis : le site doit être servi en **HTTPS** (GitHub Pages, Netlify,
> Cloudflare Pages… le font automatiquement).

---

## 2) Publier sur le Play Store (Android)

Méthode recommandée : **TWA (Trusted Web Activity)** via
[PWABuilder](https://www.pwabuilder.com) ou
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

1. Déployer le site en HTTPS (URL publique stable).
2. Sur **pwabuilder.com**, coller l'URL (`https://…/` pour HACCP Pro, ou
   `https://…/audit/` pour ExpertAudit) → *Package for stores* → **Android**.
3. Télécharger le `.aab` généré + le fichier **`assetlinks.json`**.
4. Déposer `assetlinks.json` à la racine du site sous
   **`/.well-known/assetlinks.json`** (vérification Digital Asset Links — supprime
   la barre d'URL dans l'appli).
5. Publier le `.aab` sur la **Google Play Console** (compte développeur : 25 $ une fois).

Gabarit de `/.well-known/assetlinks.json` (remplacer le package et l'empreinte
SHA-256 fournis par PWABuilder) :

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.cleanfood.haccppro",
    "sha256_cert_fingerprints": ["VOTRE_EMPREINTE_SHA256"]
  }
}]
```

---

## 3) Publier sur l'App Store (iOS)

1. Sur **pwabuilder.com**, choisir **iOS** → télécharger le projet Xcode généré
   (enveloppe `WKWebView` autour de la PWA).
2. Ouvrir le projet dans **Xcode** (Mac requis), renseigner Bundle ID, icônes,
   nom, écran de lancement.
3. Archiver et envoyer via **App Store Connect** (compte
   **Apple Developer**, 99 $/an).

> Alternative équivalente : empaqueter avec **Capacitor**
> (`@capacitor/core`) si vous voulez ajouter des fonctions natives plus tard.

---

## Migration depuis l'ancien hébergement de l'audit

L'application d'audit était hébergée séparément (dépôt `audit-haccp3bis`). Pour
**supprimer le second hébergement** :

1. Déployer ce dépôt (HACCP Pro + `/audit/`) sur l'hébergeur unique.
2. Mettre une **redirection** de l'ancienne URL d'audit vers `https://…/audit/`
   (ou désactiver l'ancien site une fois les utilisateurs prévenus).
3. Les anciennes PWA installées depuis l'ancien domaine continueront de pointer
   vers l'ancien domaine : prévenir les utilisateurs de réinstaller depuis la
   nouvelle URL.
