'use strict';
// Round 29 — Usine « Boulangerie » (outils/factory-boulangerie.js) :
// options CLI, habillage index/manifeste/service worker, verrou de secteur
// éprouvé contre le VRAI script.js, et build complet sur disque.
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
let pass = 0, fail = 0; const failures = [];
function ok(c, n) { if (c) pass++; else { fail++; failures.push(n); console.log('  ✗ FAIL: ' + n); } }
function leve(fn) { try { fn(); return null; } catch (e) { return e; } }

const RACINE = path.join(__dirname, '..');
const F = require(path.join(RACINE, 'outils', 'factory-boulangerie.js'));
const { buildContext } = require(path.join(__dirname, 'load_app.js'));

const INDEX_SRC = fs.readFileSync(path.join(RACINE, 'index.html'), 'utf8');
const SW_SRC = fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8');
const MANIFEST_SRC = fs.readFileSync(path.join(RACINE, 'manifest.webmanifest'), 'utf8');
const CFG = F.CONFIG_DEFAUT;

// ════════════ A) FONCTIONS PURES ════════════
ok(F.SECTEUR === 'bp', 'usine: secteur produit = bp');
ok(F.slug('Boulangerie Pâtisserie') === 'boulangerie-patisserie', 'slug: accents et espaces normalisés');
ok(F.slug('  ---  ') === 'build', 'slug: repli sur « build » si vide');
ok(F.slug('Éclair & Cie') === 'eclair-cie', 'slug: caractères spéciaux retirés');
ok(F.echapper('a<b>"&') === 'a&lt;b&gt;&quot;&amp;', 'echapper: HTML neutralisé');

const VERSION = F.lireVersion(INDEX_SRC);
ok(/^\d+$/.test(VERSION), 'lireVersion: version numérique lue dans index.html');
ok(leve(function () { F.lireVersion('<html></html>'); }) instanceof Error, 'lireVersion: échoue si le motif a disparu');

// ── Options de ligne de commande ──
const d = F.parseArgs([]);
ok(d.secteur === 'bp' && d.nom === CFG.nom, 'parseArgs: valeurs par défaut');
const c1 = F.parseArgs(['--nom', 'Au Bon Pain', '--couleur', '#000000']);
ok(c1.nom === 'Au Bon Pain' && c1.couleurTheme === '#000000', 'parseArgs: --nom et --couleur');
ok(c1.nomCourt === 'Au Bon Pain', 'parseArgs: nom court déduit du nom si assez court');
ok(F.parseArgs(['--nom', 'Boulangerie Patisserie Du Grand Marche']).nomCourt === CFG.nomCourt,
  'parseArgs: nom trop long → nom court par défaut');
ok(F.parseArgs(['--nom', 'X', '--nom-court', 'Y']).nomCourt === 'Y', 'parseArgs: --nom-court explicite');
ok(leve(function () { F.parseArgs(['--inconnu', 'x']); }) instanceof Error, 'parseArgs: option inconnue rejetée');
ok(leve(function () { F.parseArgs(['--nom']); }) instanceof Error, 'parseArgs: valeur manquante rejetée');
ok(leve(function () { F.parseArgs(['--nom', '--couleur']); }) instanceof Error, 'parseArgs: valeur ressemblant à une option rejetée');

// ════════════ B) HABILLAGE DU BUILD ════════════
const idx = F.patchIndex(INDEX_SRC, CFG, VERSION);
ok(idx.indexOf('<title>' + CFG.nom + '</title>') > -1, 'index: titre remplacé');
ok(idx.indexOf('<title>HACCP Pro</title>') === -1, 'index: ancien titre absent');
ok(idx.indexOf('content="' + CFG.couleurTheme + '"') > -1, 'index: couleur de thème appliquée');
ok(idx.indexOf('apple-mobile-web-app-title" content="' + CFG.nomCourt + '"') > -1, 'index: nom d\'icône iOS appliqué');
ok(idx.indexOf('<script src="' + F.NOM_SURCOUCHE + '?v=' + VERSION + '"></script>') > -1, 'index: surcouche injectée');
ok(idx.indexOf(F.NOM_SURCOUCHE) < idx.indexOf('script.js?v='), 'index: surcouche AVANT script.js');
ok(!/<script src="factory-boulangerie\.js[^>]*defer/.test(idx), 'index: surcouche NON différée (s\'exécute avant les defer)');
ok(idx.indexOf('<script src="pms_secteurs.js?v=' + VERSION + '" defer></script>') > -1, 'index: chargement de pms_secteurs préservé');
ok(idx.length > INDEX_SRC.length - 50, 'index: aucune perte de contenu');
// Idempotence défensive : rejouer le patch sur un index déjà patché doit échouer
// bruyamment plutôt que produire deux surcouches.
ok(leve(function () { F.patchIndex(idx, CFG, VERSION); }) instanceof Error, 'index: re-patch d\'un build refusé');
ok(leve(function () { F.patchIndex('<html><title>HACCP Pro</title></html>', CFG, VERSION); }) instanceof Error,
  'index: ancrage manquant → erreur explicite');

const man = JSON.parse(F.patchManifest(MANIFEST_SRC, CFG));
const manSrc = JSON.parse(MANIFEST_SRC);
ok(man.name === CFG.nom && man.short_name === CFG.nomCourt, 'manifeste: nom et nom court');
ok(man.description === CFG.description && /boulangerie/i.test(man.description), 'manifeste: description métier');
ok(man.theme_color === CFG.couleurTheme && man.background_color === CFG.couleurFond, 'manifeste: couleurs');
ok(man.start_url === manSrc.start_url && man.scope === manSrc.scope, 'manifeste: portée PWA inchangée');
ok(man.icons.length === manSrc.icons.length, 'manifeste: icônes conservées');

const sw = F.patchSW(SW_SRC, CFG, VERSION);
ok(sw.indexOf("const CACHE = '" + F.slug(CFG.nomCourt) + '-v' + VERSION + "';") > -1, 'sw: cache dédié au build');
ok(sw.indexOf('haccp-pro-v') === -1, 'sw: plus aucune référence au cache de l\'app principale');
ok(sw.indexOf("  './" + F.NOM_SURCOUCHE + "',") > -1, 'sw: surcouche pré-cachée (CORE)');
ok(sw.indexOf("  './pms_secteurs.js',") > -1, 'sw: CORE d\'origine préservé');
ok(/patch_photo_bl\\\.js\|factory-boulangerie\\\.js\)\$\//.test(sw), 'sw: surcouche servie en stratégie « coquille »');
ok(leve(function () { new RegExp(/\/(index\.html|script\.js|style\.css|patch_photo_bl\.js|factory-boulangerie\.js)$/); }) === null,
  'sw: regex coquille valide');
ok(leve(function () { F.patchSW(sw, CFG, VERSION); }) instanceof Error, 're-patch du sw refusé');

// ════════════ C) VERROU DE SECTEUR CONTRE LE VRAI script.js ════════════
// La surcouche pose des accesseurs sur `window` AVANT script.js. En navigateur,
// `window === globalThis` : on reproduit fidèlement cette condition ici.
function chargerAppAvecSurcouche(surcouche) {
  const ctx = buildContext();
  ctx.window = ctx;              // fidèle au navigateur (window === global)
  vm.createContext(ctx);
  if (surcouche) vm.runInContext(surcouche, ctx, { filename: 'surcouche.js', timeout: 5000 });
  const erreurs = [];
  try {
    vm.runInContext(fs.readFileSync(path.join(RACINE, 'script.js'), 'utf8'), ctx,
      { filename: 'script.js', timeout: 20000 });
  } catch (e) { erreurs.push(e); }
  ctx._erreurs = erreurs;
  return ctx;
}

const SURCOUCHE = F.construireSurcouche(CFG, VERSION);
ok(SURCOUCHE.indexOf("'bp'") > -1 || SURCOUCHE.indexOf('"bp"') > -1, 'surcouche: secteur bp présent');
ok(leve(function () { new vm.Script(SURCOUCHE); }) === null, 'surcouche: JavaScript syntaxiquement valide');

// Référence : sans surcouche, l'app démarre bien sur « resto ».
const ref = chargerAppAvecSurcouche(null);
ok(ref.SECTEUR_ACTIF === 'resto', 'témoin: sans surcouche, secteur par défaut = resto');

const app = chargerAppAvecSurcouche(SURCOUCHE);
ok(app._erreurs.length === ref._erreurs.length, 'surcouche: aucune erreur de chargement supplémentaire');
ok(app.SECTEUR_ACTIF === 'bp', 'verrou: SECTEUR_ACTIF = bp après chargement de script.js');
ok(app.CLIENT_MODE === true, 'verrou: CLIENT_MODE forcé (secteur non modifiable)');
ok(app.FACTORY && app.FACTORY.secteur === 'bp', 'surcouche: métadonnées FACTORY exposées');
ok(app.FACTORY.nom === CFG.nom && app.FACTORY.version === VERSION, 'surcouche: nom et version du build exposés');

// Le verrou résiste aux écritures que fait l'app (connexion, reprise de session).
vm.runInContext('SECTEUR_ACTIF = "boucherie";', app);
ok(app.SECTEUR_ACTIF === 'bp', 'verrou: écriture directe ignorée');
vm.runInContext('CLIENT_MODE = false;', app);
ok(app.CLIENT_MODE === true, 'verrou: CLIENT_MODE non désactivable');
vm.runInContext('ETAB.secteur = "collective";', app);
ok(vm.runInContext('ETAB.secteur', app) === 'bp', 'verrou: ETAB.secteur ignoré');
vm.runInContext('ETAB = { nom: "X", secteur: "rapide" };', app);
ok(vm.runInContext('ETAB.secteur', app) === 'bp', 'verrou: ETAB réaffecté puis re-verrouillé');
ok(vm.runInContext('ETAB.nom', app) === 'X', 'verrou: les autres champs d\'ETAB restent libres');
// Lecture non qualifiée (comme dans le code métier : `SECTEUR_ACTIF === "bp"`).
ok(vm.runInContext('(function(){ return SECTEUR_ACTIF; })()', app) === 'bp', 'verrou: lecture non qualifiée = bp');
// Le contenu réglementaire du secteur reste accessible et cohérent.
ok(vm.runInContext('typeof INGREDIENTS_BP', app) !== 'undefined', 'app: catalogue ingrédients boulangerie disponible');

// ════════════ D) BUILD COMPLET SUR DISQUE ════════════
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'usine-bp-'));
const res = F.construire(Object.assign({}, CFG, { nom: 'Boulangerie Test', sortie: tmp }), { silencieux: true });
ok(res.dest === tmp && res.version === VERSION, 'build: dossier et version retournés');
function existe(f) { return fs.existsSync(path.join(tmp, f)); }
['index.html', F.NOM_SURCOUCHE, 'manifest.webmanifest', 'sw.js', 'README.md',
 'script.js', 'style.css', 'pms_secteurs.js', 'pms_generateur.js',
 'mentions.html', 'politique-confidentialite.html', 'cgv.html', 'cgu.html',
 'registre-traitements.html', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png',
 'slides/slide-1.webp'].forEach(function (f) { ok(existe(f), 'build: ' + f + ' présent'); });
ok(existe('PMS-boulangerie-patisserie.html'), 'build: PMS boulangerie livré avec le build');

// Le code métier doit être STRICTEMENT identique à la source (zéro divergence).
['script.js', 'style.css', 'pms_secteurs.js', 'pms_generateur.js', 'patch_photo_bl.js'].forEach(function (f) {
  ok(fs.readFileSync(path.join(tmp, f)).equals(fs.readFileSync(path.join(RACINE, f))),
    'build: ' + f + ' copié à l\'identique');
});
ok(fs.readFileSync(path.join(tmp, 'index.html'), 'utf8').indexOf('Boulangerie Test') > -1, 'build: nom du client appliqué');
ok(JSON.parse(fs.readFileSync(path.join(tmp, 'manifest.webmanifest'), 'utf8')).name === 'Boulangerie Test',
  'build: manifeste au nom du client');
ok(fs.readFileSync(path.join(tmp, 'README.md'), 'utf8').indexOf('HTTPS') > -1, 'build: notice rappelle l\'exigence HTTPS');

// Reproductible : une 2e génération repart de zéro et donne le même résultat.
const avant = fs.readFileSync(path.join(tmp, 'index.html'), 'utf8');
fs.writeFileSync(path.join(tmp, 'residu.txt'), 'x');
F.construire(Object.assign({}, CFG, { nom: 'Boulangerie Test', sortie: tmp }), { silencieux: true });
ok(!existe('residu.txt'), 'build: régénération repart d\'un dossier propre');
ok(fs.readFileSync(path.join(tmp, 'index.html'), 'utf8') === avant, 'build: régénération reproductible');

// Secteur inexistant : refus net.
ok(leve(function () {
  F.construire(Object.assign({}, CFG, { secteur: 'zzz', sortie: tmp }), { silencieux: true });
}) instanceof Error, 'build: secteur inconnu rejeté');

fs.rmSync(tmp, { recursive: true, force: true });

// ════════════ RÉSULTAT ════════════
console.log('\nRound 29 — Usine Boulangerie : ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('Échecs :\n - ' + failures.join('\n - ')); process.exit(1); }
