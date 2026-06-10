'use strict';
// Round 27 — Contenu PMS par secteur (pms_secteurs.js) + générateur (pms_generateur.js)
const path = require('path');
let pass = 0, fail = 0; const failures = [];
function ok(c, n) { if (c) pass++; else { fail++; failures.push(n); console.log('  ✗ FAIL: ' + n); } }

// ── Chargement du contenu ──
const { PMS_SECTEURS, ALLERGENES_14 } = require(path.join(__dirname, '..', 'pms_secteurs.js'));

const CLES = ['resto', 'bp', 'rapide', 'boucherie', 'collective'];

// ════════════ A) STRUCTURE COMPLÈTE POUR LES 5 SECTEURS ════════════
ok(PMS_SECTEURS && Object.keys(PMS_SECTEURS).length === 5, 'PMS: 5 secteurs présents');
ok(ALLERGENES_14.length === 14, 'PMS: 14 allergènes réglementaires');

CLES.forEach(function (k) {
  const S = PMS_SECTEURS[k];
  ok(!!S, 'secteur ' + k + ' présent');
  if (!S) return;
  ok(S.cle === k, k + ': clé interne cohérente');
  ok(typeof S.label === 'string' && S.label.length > 3, k + ': label défini');
  ok(Array.isArray(S.references) && S.references.length >= 4, k + ': textes de référence (≥4)');
  ok(S.references.some(function (r) { return /852\/2004/.test(r); }), k + ': référence Règlement 852/2004');
  ok(S.references.some(function (r) { return /GBPH/i.test(r); }), k + ': référence GBPH du secteur');
  // BPH — 7 prérequis
  ok(S.bph && S.bph.personnel && S.bph.personnel.formation, k + ': BPH personnel/formation');
  ok(S.bph.personnel.mains && /lavage/i.test(S.bph.personnel.mains), k + ': BPH hygiène des mains');
  ok(typeof S.bph.locaux === 'string' && S.bph.locaux.length > 20, k + ': BPH locaux');
  ok(Array.isArray(S.bph.nettoyage) && S.bph.nettoyage.length >= 5, k + ': plan de nettoyage (≥5 lignes)');
  ok(S.bph.nettoyage.every(function (n) { return n.zone && n.freq && n.produit && n.methode; }), k + ': nettoyage — 4 colonnes par ligne');
  ok(/nuisible/i.test(S.bph.nuisibles), k + ': BPH lutte nuisibles');
  ok(/eau/i.test(S.bph.eau), k + ': BPH eau');
  ok(/déchet|dechet/i.test(S.bph.dechets), k + ': BPH déchets');
  ok(typeof S.bph.froidChaud === 'string', k + ': BPH froid/chaud');
  // HACCP
  ok(typeof S.haccp.champ === 'string' && /Codex|852/i.test(S.haccp.champ), k + ': HACCP champ d\'application');
  ok(Array.isArray(S.haccp.equipe) && S.haccp.equipe.length >= 2, k + ': HACCP équipe');
  ok(Array.isArray(S.haccp.produits) && S.haccp.produits.length >= 3, k + ': HACCP description produits');
  ok(Array.isArray(S.haccp.diagramme) && S.haccp.diagramme.length >= 6, k + ': HACCP diagramme (≥6 étapes)');
  ok(Array.isArray(S.haccp.dangers) && S.haccp.dangers.length >= 6, k + ': HACCP analyse des dangers (≥6)');
  ok(S.haccp.dangers.every(function (d) { return d.etape && d.danger && d.type && d.mesure; }), k + ': dangers — 4 colonnes par ligne');
  ok(S.haccp.dangers.some(function (d) { return /Allergène/i.test(d.type); }), k + ': danger allergène identifié');
  ok(S.haccp.dangers.some(function (d) { return /Physique/i.test(d.type); }), k + ': danger physique identifié');
  ok(Array.isArray(S.haccp.ccp) && S.haccp.ccp.length >= 3, k + ': HACCP au moins 3 CCP');
  ok(S.haccp.ccp.every(function (c) { return c.nom && c.limite && c.surveillance && c.correction && c.enreg; }), k + ': CCP — 5 colonnes par ligne');
  // Mesures de gestion (III)
  ok(S.tracabilite && /178\/2002/.test(S.tracabilite.principe), k + ': traçabilité (Règl. 178/2002)');
  ok(S.nonConformites && Array.isArray(S.nonConformites.procedure), k + ': procédure non-conformités');
  ok(S.retraitRappel && /DD.*PP|DDPP/.test(S.retraitRappel.contact), k + ': retrait/rappel + DDPP');
  ok(Array.isArray(S.allergenes) && S.allergenes.length === 14, k + ': 14 allergènes rattachés');
  ok(Array.isArray(S.temperatures) && S.temperatures.length >= 5, k + ': tableau températures');
  ok(S.temperatures.every(function (t) { return t.denree && t.valeur; }), k + ': températures — denrée + valeur');
  ok(Array.isArray(S.autocontroles) && S.autocontroles.length >= 6, k + ': liste des autocontrôles');
});

// ════════════ B) PRÉCISION SECTORIELLE (chaque secteur a SES spécificités) ════════════
// Restauration : cuisson volaille 74°C + refroidissement < 2h
ok(PMS_SECTEURS.resto.haccp.ccp.some(function (c) { return /74/.test(c.limite); }), 'resto: cuisson volaille ≥ 74 °C');
ok(PMS_SECTEURS.resto.haccp.ccp.some(function (c) { return /< 2 h|moins de 2 h/i.test(c.limite); }), 'resto: refroidissement < 2 h');

// Boulangerie : crème pâtissière 85°C + Salmonella œufs
ok(PMS_SECTEURS.bp.haccp.ccp.some(function (c) { return /85/.test(c.limite); }), 'bp: cuisson crème ≥ 85 °C');
ok(PMS_SECTEURS.bp.haccp.dangers.some(function (d) { return /Salmonella/i.test(d.danger); }), 'bp: danger Salmonella (œufs)');
ok(PMS_SECTEURS.bp.references.some(function (r) { return /Boulangerie|Pâtisserie/i.test(r); }), 'bp: GBPH Boulangerie-Pâtisserie');

// Restauration rapide : huiles de friture (composés polaires) + viande hachée
ok(PMS_SECTEURS.rapide.haccp.ccp.some(function (c) { return /polaire/i.test(c.limite) || /polaire/i.test(c.nom); }), 'rapide: CCP huiles de friture (composés polaires)');
ok(PMS_SECTEURS.rapide.haccp.dangers.some(function (d) { return /STEC|E\. coli/i.test(d.danger); }), 'rapide: danger E. coli (viande hachée)');

// Boucherie : Règlement 853/2004 + zone ≤ 12°C + sous-produits animaux
ok(PMS_SECTEURS.boucherie.references.some(function (r) { return /853\/2004/.test(r); }), 'boucherie: référence Règlement 853/2004 (agrément)');
ok(PMS_SECTEURS.boucherie.haccp.ccp.some(function (c) { return /12 ?°C/.test(c.limite); }) ||
   PMS_SECTEURS.boucherie.temperatures.some(function (t) { return /12 ?°C/.test(t.valeur); }), 'boucherie: zone de travail ≤ 12 °C');
ok(/équarriss|sous-produit|SPAn/i.test(PMS_SECTEURS.boucherie.bph.dechets), 'boucherie: gestion des sous-produits animaux (équarrissage)');
ok(PMS_SECTEURS.boucherie.autocontroles.some(function (a) { return /stérilisateur|82/i.test(a); }), 'boucherie: stérilisateur à couteaux 82 °C');

// Collective : plats témoins (5 jours) + remise en température (CCP) + liaison froide ≤ 3°C
ok(/5 jours/.test(PMS_SECTEURS.collective.platsTemoins || ''), 'collective: plats témoins conservés 5 jours');
ok(PMS_SECTEURS.collective.haccp.ccp.some(function (c) { return /remise en température/i.test(c.nom); }), 'collective: CCP remise en température');
ok(PMS_SECTEURS.collective.haccp.ccp.some(function (c) { return /≤ ?\+?3 ?°C/.test(c.limite); }), 'collective: liaison froide ≤ +3 °C');
ok(PMS_SECTEURS.collective.haccp.ccp.length >= 5, 'collective: au moins 5 CCP (liaison froide/chaude)');
// Enrichissements guide CDG76 :
ok(PMS_SECTEURS.collective.references.some(function (r) { return /853\/2004/.test(r); }), 'collective: référence 853/2004 (températures DAOA)');
ok(PMS_SECTEURS.collective.references.some(function (r) { return /GEM-RCN/.test(r); }), 'collective: référence GEM-RCN (grammages)');
ok(PMS_SECTEURS.collective.temperatures.some(function (t) { return /-12 ?°C/.test(t.valeur); }), 'collective: autres congelés -12 °C');
ok(PMS_SECTEURS.collective.gestionExcedents && /24 ?h/.test(PMS_SECTEURS.collective.gestionExcedents.froides), 'collective: gestion excédents froids (24 h)');
ok(/refroidissement rapide/i.test(PMS_SECTEURS.collective.gestionExcedents.chaudes), 'collective: gestion excédents chauds (refroidissement rapide)');
ok(PMS_SECTEURS.collective.autocontroles.some(function (a) { return /laboratoire agréé/i.test(a); }), 'collective: analyses micro — fréquence définie avec labo agréé');
ok(PMS_SECTEURS.collective.autocontroles.some(function (a) { return /estampille/i.test(a); }), 'collective: contrôle réception — estampille des viandes');

// ════════════ C) GÉNÉRATEUR — produit un document HTML pré-rempli ════════════
(function () {
  // shim navigateur minimal
  let written = '';
  const fakeWin = {
    PMS_SECTEURS: PMS_SECTEURS,
    ETAB: { nom: 'Cuisine Test', adresse: '1 rue de Paris', cp: '75009', ville: 'Paris', siret: '44424477600019', responsable: 'Léa C.', secteur: 'collective', tel: '0102030405', email: 't@t.fr' },
    open: function () { return { document: { open: function () {}, close: function () {}, write: function (h) { written = h; } } }; },
    print: function () {},
    prompt: function () { return null; }
  };
  global.window = fakeWin;
  global.SECTEUR_ACTIF = 'collective';
  require(path.join(__dirname, '..', 'pms_generateur.js'));
  ok(typeof fakeWin.genererPMS === 'function', 'générateur: genererPMS() exposé');

  fakeWin.genererPMS('collective');
  ok(/Plan de Maîtrise Sanitaire/i.test(written), 'générateur: titre PMS présent');
  ok(/Cuisine Test/.test(written), 'générateur: nom de l\'établissement injecté');
  ok(/44424477600019/.test(written), 'générateur: SIRET injecté');
  ok(/PARTIE I/.test(written) && /PARTIE II/.test(written) && /PARTIE III/.test(written), 'générateur: 3 parties (BPH/HACCP/Gestion)');
  ok(/plats? témoins?/i.test(written), 'générateur (collective): section plats témoins');
  ok(/excédents de fin de service/i.test(written), 'générateur (collective): section gestion des excédents');
  ok(/852\/2004/.test(written), 'générateur: référence réglementaire affichée');
  ok(/Imprimer/.test(written), 'générateur: bouton Imprimer/PDF');
  ok(/Modèle|responsable de sa mise à jour|seul responsable/i.test(written), 'générateur: clause de responsabilité (modèle)');

  // secteur différent => contenu différent
  let w2 = '';
  fakeWin.open = function () { return { document: { open: function () {}, close: function () {}, write: function (h) { w2 = h; } } }; };
  fakeWin.genererPMS('boucherie');
  ok(/853\/2004/.test(w2), 'générateur (boucherie): référence 853/2004 présente');
  ok(!/plats? témoins?/i.test(w2), 'générateur (boucherie): pas de plats témoins (spécifique collective)');
})();

console.log('\n══════════════════════════════════════');
console.log('ROUND 27 (PMS par secteur + générateur) RESULTS: ' + pass + ' passed, ' + fail + ' failed');
if (failures.length) { console.log('FAILURES:'); failures.forEach(function (f) { console.log('  - ' + f); }); }
console.log('══════════════════════════════════════');
process.exit(fail ? 1 : 0);
