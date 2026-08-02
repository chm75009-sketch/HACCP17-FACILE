# Outils

Scripts Node sans dépendance, à lancer depuis la racine du dépôt.

| Outil | Rôle |
|---|---|
| `verif-rapports.js` | Filet automatique — analyse statique de `script.js` (fuites inter-secteurs, lectures DOM dans le Pack DDPP, doubles déclarations…). |
| `factory-boulangerie.js` | **Usine Boulangerie** — génère un build autonome, livrable, verrouillé sur le secteur Boulangerie & Pâtisserie. |

---

## Usine Boulangerie

Produit en une commande un dossier statique prêt à déployer pour un client
boulangerie/pâtisserie, sans dupliquer ni modifier le code métier.

```bash
node outils/factory-boulangerie.js
node outils/factory-boulangerie.js --nom "Boulangerie Martin" --couleur "#7c2d12"
```

Sortie par défaut : `dist/boulangerie/` (dossier **ignoré par git**, écrasé à
chaque génération). Il se dépose tel quel sur n'importe quel hébergement
statique **en HTTPS** — sans HTTPS, le service worker ne s'enregistre pas et le
mode hors-ligne est perdu.

### Options

| Option | Défaut | Effet |
|---|---|---|
| `--nom` | `Boulangerie Pro` | Titre de la page et nom de l'application installée. |
| `--nom-court` | déduit du `--nom` | Libellé sous l'icône du téléphone (12 caractères max conseillés). |
| `--description` | description métier boulangerie | Description du manifeste PWA. |
| `--couleur` | `#7c2d12` | Couleur de thème (barre du navigateur). |
| `--fond` | `#1c1917` | Couleur de fond de l'écran de démarrage. |
| `--sortie` | `dist/boulangerie` | Dossier de sortie. |

### Comment le secteur est verrouillé

Le build embarque une **surcouche** (`factory-boulangerie.js`, générée) chargée
**avant** `script.js`. Elle installe des accesseurs sur `window` pour
`SECTEUR_ACTIF`, `CLIENT_MODE` et `ETAB` : les déclarations `var` de `script.js`
ne recréent pas ces propriétés, leur initialiseur passe donc par un `set` qui
l'ignore. Toute tentative ultérieure de changer de secteur (connexion, reprise
de session, choix manuel, valeur mémorisée par un ancien build) est ramenée à
`bp`.

Conséquence : **`script.js`, `style.css`, `pms_secteurs.js` et
`pms_generateur.js` sont copiés octet pour octet** depuis la source. Aucun fork,
aucune divergence à maintenir — une correction dans l'app principale se retrouve
dans le build boulangerie à la génération suivante.

Le service worker reçoit un **nom de cache dédié** (`boulangerie-vNNN`) : sans
cela, le build et l'app principale servis sur le même domaine se videraient
mutuellement le cache à chaque activation.

### Garde-fous

Chaque point d'ancrage dans la source (titre, méta thème, ligne de chargement de
`pms_secteurs.js`, nom du cache, liste `CORE`…) doit correspondre à **exactement
une** occurrence. Si un ancrage disparaît ou devient ambigu, la génération
**échoue avec un message explicite** au lieu de produire un build silencieusement
cassé. Une refonte de `index.html` ou `sw.js` peut donc demander une mise à jour
de l'usine — le test le signale.

### Tests

```bash
node tests/run_tests29.js
```

84 scénarios : options CLI, habillage (index/manifeste/service worker), build sur
disque et reproductibilité, plus une vérification du verrou **contre le vrai
`script.js`** (chargé dans un navigateur simulé, avec et sans surcouche).
