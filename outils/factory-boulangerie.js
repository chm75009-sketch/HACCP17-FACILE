'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
 * USINE « BOULANGERIE » — factory-boulangerie.js
 *
 * Génère, en une commande, un build AUTONOME et LIVRABLE de l'application,
 * pré-configuré pour le secteur Boulangerie & Pâtisserie (clé interne « bp ») :
 *
 *   node outils/factory-boulangerie.js --nom "Boulangerie Martin"
 *   → dist/boulangerie/  (dossier à déposer tel quel sur un hébergement statique)
 *
 * Ce que fait l'usine :
 *   1. copie la coquille applicative telle quelle (script.js, style.css…) — le
 *      code métier n'est JAMAIS dupliqué ni modifié, donc aucune divergence ;
 *   2. ajoute une SURCOUCHE (`factory-boulangerie.js` dans le build) chargée
 *      AVANT script.js, qui verrouille le secteur sur « bp » ;
 *   3. réécrit l'habillage : titre, manifeste PWA, couleurs, nom du cache du
 *      service worker (pour ne pas entrer en collision avec l'app principale) ;
 *   4. embarque le PMS boulangerie pré-généré + une notice de livraison.
 *
 * Aucune dépendance externe. Les fonctions de transformation sont PURES et
 * exportées : elles sont couvertes par tests/run_tests29.js.
 * ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const RACINE = path.join(__dirname, '..');

// Secteur produit par cette usine. Doit exister dans pms_secteurs.js.
const SECTEUR = 'bp';

// ── Configuration par défaut du build ──────────────────────────────────────
const CONFIG_DEFAUT = {
  secteur: SECTEUR,
  nom: 'Boulangerie Pro',
  nomCourt: 'Boulangerie',
  description: 'Application HACCP pour boulangerie & pâtisserie — relevés de '
    + 'température, cuisson et refroidissement des crèmes, traçabilité, '
    + 'non-conformités et preuve DDPP.',
  couleurTheme: '#7c2d12',   // brun fournil (au lieu de l'indigo HACCP Pro)
  couleurFond: '#1c1917',
  sortie: path.join('dist', 'boulangerie')
};

// Fichiers de code recopiés tels quels (la coquille applicative partagée).
const FICHIERS_CODE = [
  'script.js', 'style.css', 'pms_secteurs.js', 'pms_generateur.js',
  'patch_photo_bl.js'
];

// Pages légales : obligatoires, recopiées telles quelles.
const FICHIERS_LEGAUX = [
  'mentions.html', 'politique-confidentialite.html', 'cgv.html', 'cgu.html',
  'registre-traitements.html'
];

// Icônes et visuels.
const FICHIERS_MEDIAS = [
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'apple-touch-icon.png', 'icon.svg'
];

// Nom du fichier de surcouche dans le build.
const NOM_SURCOUCHE = 'factory-boulangerie.js';

// ═══════════════════════════════════════════════════════════════════════════
// 1) FONCTIONS PURES (testables)
// ═══════════════════════════════════════════════════════════════════════════

/** Transforme un libellé en identifiant utilisable dans un nom de cache. */
function slug(txt) {
  return String(txt || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'build';
}

/**
 * Lit la version de cache-busting utilisée par l'app (les `?v=NNN` d'index.html).
 * On la relit dans la source plutôt que dans ver.txt : c'est elle qui fait foi
 * pour les navigateurs, et elle doit rester alignée entre index.html et sw.js.
 */
function lireVersion(indexHtml) {
  const m = /pms_secteurs\.js\?v=(\d+)/.exec(indexHtml);
  if (!m) throw new Error('Version introuvable dans index.html (motif « pms_secteurs.js?v=NNN » déplacé ?)');
  return m[1];
}

/** Remplace une occurrence UNIQUE, sinon échoue bruyamment (anti-build silencieusement cassé). */
function remplacerUnique(texte, motif, remplacement, quoi) {
  const trouve = texte.match(motif);
  if (!trouve || trouve.length !== 1) {
    throw new Error('Ancrage « ' + quoi + ' » introuvable ou ambigu ('
      + (trouve ? trouve.length : 0) + ' occurrence(s)) — la source a changé, l\'usine doit être mise à jour.');
  }
  return texte.replace(motif, remplacement);
}

/**
 * Habille index.html et y injecte la surcouche.
 * La surcouche est un script NON différé placé avant les scripts `defer` :
 * elle s'exécute donc forcément AVANT script.js (qui déclare SECTEUR_ACTIF).
 */
function patchIndex(html, cfg, version) {
  let out = html;
  out = remplacerUnique(out, /<title>HACCP Pro<\/title>/g,
    '<title>' + echapper(cfg.nom) + '</title>', 'title');
  out = remplacerUnique(out, /<meta name="apple-mobile-web-app-title" content="HACCP Pro">/g,
    '<meta name="apple-mobile-web-app-title" content="' + echapper(cfg.nomCourt) + '">',
    'apple-mobile-web-app-title');
  out = remplacerUnique(out, /<meta name="theme-color" content="#1e1b4b">/g,
    '<meta name="theme-color" content="' + cfg.couleurTheme + '">', 'theme-color');
  // Injection AVANT le premier script applicatif différé.
  out = remplacerUnique(out, /<script src="pms_secteurs\.js\?v=\d+" defer><\/script>/g,
    '<script src="' + NOM_SURCOUCHE + '?v=' + version + '"></script>\n'
    + '    <script src="pms_secteurs.js?v=' + version + '" defer></script>',
    'injection surcouche');
  return out;
}

/** Réécrit le manifeste PWA (identité de l'app installée sur le téléphone). */
function patchManifest(json, cfg) {
  const m = JSON.parse(json);
  m.name = cfg.nom;
  m.short_name = cfg.nomCourt;
  m.description = cfg.description;
  m.theme_color = cfg.couleurTheme;
  m.background_color = cfg.couleurFond;
  return JSON.stringify(m, null, 2) + '\n';
}

/**
 * Adapte le service worker : nom de cache DÉDIÉ (sinon le build boulangerie et
 * l'app principale, servis sur le même domaine, se videraient mutuellement le
 * cache à chaque `activate`), et prise en compte de la surcouche.
 */
function patchSW(js, cfg, version) {
  let out = js;
  out = remplacerUnique(out, /const CACHE = 'haccp-pro-v\d+';/g,
    "const CACHE = '" + slug(cfg.nomCourt) + "-v" + version + "';", 'nom du cache');
  // La surcouche fait partie de la coquille : pré-cache + stratégie « shell ».
  out = remplacerUnique(out, /^  '\.\/pms_secteurs\.js',$/gm,
    "  './" + NOM_SURCOUCHE + "',\n  './pms_secteurs.js',", 'CORE — surcouche');
  out = remplacerUnique(out, /\/\\\/\(index\\\.html\|script\\\.js\|style\\\.css\|patch_photo_bl\\\.js\)\$\//g,
    '/\\/(index\\.html|script\\.js|style\\.css|patch_photo_bl\\.js|'
    + NOM_SURCOUCHE.replace(/\./g, '\\.') + ')$/', 'regex coquille');
  return out;
}

/**
 * Code de la surcouche déposée dans le build.
 *
 * Principe : on définit des ACCESSEURS sur `window` AVANT le chargement de
 * script.js. Les déclarations `var SECTEUR_ACTIF = …` / `var CLIENT_MODE = …`
 * de script.js ne recréent alors pas la propriété (elle existe déjà) : leur
 * initialiseur passe par notre `set`, qui l'ignore. Résultat : le secteur est
 * verrouillé sans modifier UNE SEULE LIGNE du code métier partagé.
 */
function construireSurcouche(cfg, version) {
  const meta = JSON.stringify({
    secteur: cfg.secteur, nom: cfg.nom, nomCourt: cfg.nomCourt, version: version
  });
  return "'use strict';\n"
+ "/* Surcouche générée par outils/factory-boulangerie.js — NE PAS ÉDITER À LA MAIN.\n"
+ " * Verrouille l'application sur le secteur « " + cfg.secteur + " » (Boulangerie & Pâtisserie).\n"
+ " * Doit être chargée AVANT script.js. */\n"
+ "(function () {\n"
+ "  var SECTEUR = " + JSON.stringify(cfg.secteur) + ";\n"
+ "  window.FACTORY = " + meta + ";\n"
+ "\n"
+ "  // Verrou 1 — secteur actif : toute écriture (connexion, reprise de session,\n"
+ "  // choix manuel) est ramenée au secteur du build.\n"
+ "  try {\n"
+ "    Object.defineProperty(window, 'SECTEUR_ACTIF', {\n"
+ "      configurable: true, enumerable: true,\n"
+ "      get: function () { return SECTEUR; },\n"
+ "      set: function () { /* ignoré : build mono-secteur */ }\n"
+ "    });\n"
+ "  } catch (e) { window.SECTEUR_ACTIF = SECTEUR; }\n"
+ "\n"
+ "  // Verrou 2 — mode client : l'écran de choix du secteur reste grisé.\n"
+ "  try {\n"
+ "    Object.defineProperty(window, 'CLIENT_MODE', {\n"
+ "      configurable: true, enumerable: true,\n"
+ "      get: function () { return true; },\n"
+ "      set: function () { /* ignoré */ }\n"
+ "    });\n"
+ "  } catch (e) { window.CLIENT_MODE = true; }\n"
+ "\n"
+ "  // Verrou 3 — fiche établissement : `ETAB` est réaffecté à plusieurs endroits\n"
+ "  // (reprise de session, déconnexion). On normalise `secteur` à chaque\n"
+ "  // réaffectation ET sur l'objet courant.\n"
+ "  function verrouillerEtab(o) {\n"
+ "    if (!o || typeof o !== 'object') return o;\n"
+ "    try {\n"
+ "      Object.defineProperty(o, 'secteur', {\n"
+ "        configurable: true, enumerable: true,\n"
+ "        get: function () { return SECTEUR; },\n"
+ "        set: function () { /* ignoré */ }\n"
+ "      });\n"
+ "    } catch (e) { o.secteur = SECTEUR; }\n"
+ "    return o;\n"
+ "  }\n"
+ "  try {\n"
+ "    var _etab = verrouillerEtab(window.ETAB);\n"
+ "    Object.defineProperty(window, 'ETAB', {\n"
+ "      configurable: true, enumerable: true,\n"
+ "      get: function () { return _etab; },\n"
+ "      set: function (v) { _etab = verrouillerEtab(v); }\n"
+ "    });\n"
+ "  } catch (e) {}\n"
+ "\n"
+ "  // Verrou 4 — mémoire locale : un secteur mémorisé par un ancien build ne\n"
+ "  // doit pas ressurgir. On purge les clés `haccp_secteur_actif_*`.\n"
+ "  try {\n"
+ "    for (var i = localStorage.length - 1; i >= 0; i--) {\n"
+ "      var k = localStorage.key(i);\n"
+ "      if (k && k.indexOf('haccp_secteur_actif_') === 0 && localStorage.getItem(k) !== SECTEUR) {\n"
+ "        localStorage.setItem(k, SECTEUR);\n"
+ "      }\n"
+ "    }\n"
+ "  } catch (e) {}\n"
+ "})();\n";
}

/** Échappement minimal pour insertion dans du HTML (titres, métas). */
function echapper(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Notice de livraison déposée à la racine du build. */
function construireNotice(cfg, version) {
  return '# ' + cfg.nom + ' — build boulangerie\n\n'
    + 'Build **autonome** généré par `outils/factory-boulangerie.js` '
    + '(secteur `' + cfg.secteur + '` — Boulangerie & Pâtisserie, version `v' + version + '`).\n\n'
    + '## Déploiement\n\n'
    + 'Déposer le contenu de ce dossier sur un hébergement **statique en HTTPS** '
    + '(GitHub Pages, Netlify, OVH…). Aucune étape de compilation, aucun serveur applicatif.\n\n'
    + '> ⚠️ HTTPS obligatoire : sans lui, le service worker ne s\'enregistre pas et le mode hors-ligne est perdu.\n\n'
    + '## Ce qui change par rapport à l\'app principale\n\n'
    + '| Élément | Valeur |\n'
    + '|---|---|\n'
    + '| Secteur | verrouillé sur `' + cfg.secteur + '` (non modifiable par l\'utilisateur) |\n'
    + '| Nom / PWA | ' + cfg.nom + ' (' + cfg.nomCourt + ') |\n'
    + '| Couleur de thème | `' + cfg.couleurTheme + '` |\n'
    + '| Cache service worker | `' + slug(cfg.nomCourt) + '-v' + version + '` (isolé de l\'app principale) |\n\n'
    + 'Le code métier (`script.js`, `pms_secteurs.js`, `style.css`…) est **identique à la source** : '
    + 'aucune divergence à maintenir. Le verrouillage est assuré par la seule surcouche `'
    + NOM_SURCOUCHE + '`.\n\n'
    + '## Régénérer\n\n'
    + '```bash\n'
    + 'node outils/factory-boulangerie.js --nom "' + cfg.nom + '"\n'
    + '```\n\n'
    + 'Le dossier de sortie est **écrasé** à chaque génération : ne rien y modifier à la main.\n';
}

/** Analyse les arguments de ligne de commande (`--cle valeur`). */
function parseArgs(argv) {
  const cfg = Object.assign({}, CONFIG_DEFAUT);
  const alias = {
    'nom': 'nom', 'nom-court': 'nomCourt', 'description': 'description',
    'couleur': 'couleurTheme', 'fond': 'couleurFond', 'sortie': 'sortie'
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.indexOf('--') !== 0) continue;
    const cle = a.slice(2);
    if (!Object.prototype.hasOwnProperty.call(alias, cle)) {
      throw new Error('Option inconnue : --' + cle
        + '\nOptions : ' + Object.keys(alias).map(function (k) { return '--' + k; }).join(', '));
    }
    const val = argv[i + 1];
    if (val === undefined || val.indexOf('--') === 0) throw new Error('Valeur manquante pour --' + cle);
    cfg[alias[cle]] = val;
    i++;
  }
  // Un nom court non fourni suit le nom complet (utile pour l'icône du téléphone).
  if (cfg.nom !== CONFIG_DEFAUT.nom && cfg.nomCourt === CONFIG_DEFAUT.nomCourt) {
    cfg.nomCourt = cfg.nom.length <= 12 ? cfg.nom : CONFIG_DEFAUT.nomCourt;
  }
  return cfg;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2) GÉNÉRATION (effets de bord)
// ═══════════════════════════════════════════════════════════════════════════

function copier(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
}

function construire(cfg, opts) {
  opts = opts || {};
  const log = opts.silencieux ? function () {} : console.log;
  const dest = path.isAbsolute(cfg.sortie) ? cfg.sortie : path.join(RACINE, cfg.sortie);

  // Garde-fou : le secteur doit exister dans le contenu réglementaire.
  const { PMS_SECTEURS } = require(path.join(RACINE, 'pms_secteurs.js'));
  if (!PMS_SECTEURS[cfg.secteur]) throw new Error('Secteur inconnu : ' + cfg.secteur);

  const indexSrc = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
  const version = lireVersion(indexSrc);

  // Sortie repartie de zéro (build reproductible, pas de résidu d'une version précédente).
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(dest, { recursive: true });

  fs.writeFileSync(path.join(dest, 'index.html'), patchIndex(indexSrc, cfg, version));
  fs.writeFileSync(path.join(dest, NOM_SURCOUCHE), construireSurcouche(cfg, version));
  fs.writeFileSync(path.join(dest, 'manifest.webmanifest'),
    patchManifest(fs.readFileSync(path.join(RACINE, 'manifest.webmanifest'), 'utf8'), cfg));
  fs.writeFileSync(path.join(dest, 'sw.js'),
    patchSW(fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8'), cfg, version));
  fs.writeFileSync(path.join(dest, 'README.md'), construireNotice(cfg, version));

  FICHIERS_CODE.concat(FICHIERS_LEGAUX, FICHIERS_MEDIAS).forEach(function (f) {
    const src = path.join(RACINE, f);
    if (fs.existsSync(src)) copier(src, path.join(dest, f));
    else log('  ⚠️  absent de la source, ignoré : ' + f);
  });

  // Visuels de la présentation (slides/slide-N.webp) — pré-cachés par le SW.
  const slidesSrc = path.join(RACINE, 'slides');
  if (fs.existsSync(slidesSrc)) {
    fs.readdirSync(slidesSrc).forEach(function (f) {
      copier(path.join(slidesSrc, f), path.join(dest, 'slides', f));
    });
  }

  // PMS boulangerie pré-généré : livré avec le build (document réglementaire).
  const modele = path.join(RACINE, 'modeles_pms', 'PMS-modele-boulangerie-patisserie.html');
  if (fs.existsSync(modele)) copier(modele, path.join(dest, 'PMS-boulangerie-patisserie.html'));

  log('✅ Build « ' + cfg.nom +' » (secteur ' + cfg.secteur + ', v' + version + ') → ' + dest);
  return { dest: dest, version: version };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3) CLI / exports
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
  try {
    construire(parseArgs(process.argv.slice(2)));
  } catch (e) {
    console.error('❌ ' + e.message);
    process.exit(1);
  }
}

module.exports = {
  SECTEUR: SECTEUR, CONFIG_DEFAUT: CONFIG_DEFAUT, NOM_SURCOUCHE: NOM_SURCOUCHE,
  slug: slug, lireVersion: lireVersion, echapper: echapper,
  patchIndex: patchIndex, patchManifest: patchManifest, patchSW: patchSW,
  construireSurcouche: construireSurcouche, construireNotice: construireNotice,
  parseArgs: parseArgs, construire: construire
};
