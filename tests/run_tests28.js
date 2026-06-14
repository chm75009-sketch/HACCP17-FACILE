'use strict';
// Round 28 — Non-régression des correctifs d'audit (virgule décimale, échappement XSS).
const { loadApp } = require('./load_app.js');
let pass = 0, fail = 0; const failures = [];
function ok(c, n) { if (c) pass++; else { fail++; failures.push(n); console.log('  ✗ FAIL: ' + n); } }

const ctx = loadApp();
if (ctx._loadErrors.length) { console.log('LOAD ERRORS:', ctx._loadErrors.map(e => e.message)); process.exit(2); }

// ── A) fmtTemp : la virgule décimale FR ne doit JAMAIS être tronquée (BLOCKER corrigé) ──
ok(ctx.fmtTemp('3,5') === '+3.5°C', 'fmtTemp("3,5") = +3.5°C (décimale préservée, plus de "+3°C")');
ok(ctx.fmtTemp('3.5') === '+3.5°C', 'fmtTemp("3.5") = +3.5°C');
ok(ctx.fmtTemp('-18,5') === '-18.5°C', 'fmtTemp("-18,5") = -18.5°C (congélateur)');
ok(ctx.fmtTemp('4') === '+4°C', 'fmtTemp("4") = +4°C (entier)');
ok(ctx.fmtTemp('3,5°C') === '+3.5°C', 'fmtTemp("3,5°C") gère l\'unité + virgule');
ok(ctx.fmtTemp('') === '', 'fmtTemp("") = vide');
ok(ctx.fmtTemp(null) === '', 'fmtTemp(null) = vide');

// ── B) _echap : neutralise le HTML hostile (anti-XSS) ──
ok(ctx._echap('<img src=x onerror=alert(1)>').indexOf('<') === -1, 'XSS: _echap retire les chevrons <');
ok(ctx._echap('a & b').indexOf('&amp;') > -1, 'XSS: _echap encode &');
ok(ctx._echap('"quote"').indexOf('&quot;') > -1, 'XSS: _echap encode les guillemets');
ok(ctx._echap(null) === '', '_echap(null) = vide');
ok(ctx._echap('Frigo N°1') === 'Frigo N°1', '_echap laisse passer un texte normal');

// ── C) Tableau Excel : colonnes = heures EXACTES (jamais Jour/Matin/Soir si heure connue) ──
{
  var cols = ctx._ttColonnes([
    { jour: '2026-06-14', hour: '16:45', enceinte: 'Enceinte N°1', temp: -13.4, isNC: true },
    { jour: '2026-06-14', hour: '17:00', enceinte: 'Enceinte N°1', temp: -11.3, isNC: true }
  ]);
  var labs = (cols[0] && cols[0].subs ? cols[0].subs.map(function (s) { return s.label; }) : []);
  ok(labs.indexOf('16:45') > -1 && labs.indexOf('17:00') > -1, 'Excel: 2 relevés capteur affichés à leur heure exacte (16:45 | 17:00)');
  ok(labs.indexOf('Matin') === -1 && labs.indexOf('Soir') === -1 && labs.indexOf('Jour') === -1, 'Excel: plus de libellés Jour/Matin/Soir quand l\'heure est connue');
}
// ── D) Multiplicité : 2 relevés à la même minute (capteur + manuel) → 2 colonnes ──
{
  var cols2 = ctx._ttColonnes([
    { jour: '2026-06-14', hour: '16:45', enceinte: 'Enceinte N°1', temp: -13.4, isNC: true, auto: true },
    { jour: '2026-06-14', hour: '16:45', enceinte: 'Enceinte N°1', temp: -20, isNC: false, auto: false }
  ]);
  var l2 = (cols2[0] && cols2[0].subs ? cols2[0].subs.map(function (s) { return s.label; }) : []);
  ok(l2.filter(function (x) { return x === '16:45'; }).length === 2, 'Excel: 2 relevés à la même minute → 2 colonnes (aucun relevé masqué)');
}
// ── E) VERROU : AUCUN relevé ne peut être perdu (matched + merged + orphelins == total) ──
{
  var rel = [];
  for (var d = 1; d <= 5; d++) {
    var j = '2026-06-0' + d;
    rel.push({ jour: j, hour: '08:00', enceinte: 'Enceinte N°1', temp: -19, isNC: false, auto: true, sig: 'Relevé auto. (UbiBot)' });
    rel.push({ jour: j, hour: '08:00', enceinte: 'Enceinte N°1', temp: -12, isNC: true, auto: false, sig: 'Mounir' }); // même minute → 2e colonne
    rel.push({ jour: j, hour: '14:33', enceinte: 'Enceinte N°2', temp: 3, isNC: false, auto: false, sig: 'Léa' });
    rel.push({ jour: j, hour: '19:05', enceinte: 'Enceinte N°1', temp: -20, isNC: false, auto: true, sig: 'Relevé auto. (UbiBot)' }); // hors créneau
  }
  rel.push({ jour: '2026-06-03', hour: '10:00', enceinte: '', temp: 5, isNC: false }); // sans nom → signalé orphelin
  var diag = { found: rel.length, matched: 0, merged: 0, orphans: {} };
  var cols = ctx._ttColonnes(rel);
  ctx._ttIndexer(cols, rel, diag);
  var orphTot = Object.keys(diag.orphans).reduce(function (a, k) { return a + diag.orphans[k]; }, 0);
  var compte = diag.matched + diag.merged + orphTot;
  ok(compte === rel.length, 'VERROU: tous les relevés comptabilisés (' + compte + '/' + rel.length + ') — aucun perdu');
}
// ── F) SMOKE : la génération de la feuille Excel ne doit PAS planter (erreurs runtime) ──
{
  function _mkWs() { var cs = {}; return { getCell: function (a, b) { var k = (b === undefined) ? ('' + a) : (a + '_' + b); return cs[k] || (cs[k] = {}); }, mergeCells: function () {}, getColumn: function () { return {}; }, getRow: function () { return {}; }, views: null }; }
  var relF = [
    { jour: '2026-06-14', hour: '08:00', enceinte: 'Enceinte N°1', temp: -19, isNC: false, auto: true, sig: 'Relevé auto. (UbiBot)' },
    { jour: '2026-06-14', hour: '08:00', enceinte: 'Enceinte N°1', temp: -12, isNC: true, auto: false, sig: 'Mounir' },
    { jour: '2026-06-14', hour: '12:30', enceinte: 'Enceinte N°2', temp: 3.5, isNC: false, auto: false, sig: 'Léa' }
  ];
  var colsF = ctx._ttColonnes(relF);
  var diagF = { found: relF.length, matched: 0, merged: 0, orphans: {} };
  var threw = false;
  try { ctx._ttRemplirFeuille(_mkWs(), colsF, ['2026-06-14'], relF, 'Test', 'Sous-titre', diagF); }
  catch (e) { threw = true; console.log('  (smoke erreur: ' + e.message + ')'); }
  ok(!threw, 'SMOKE: génération de la feuille Excel sans erreur d\'exécution');
}

console.log('\n════════════════════════════════════════');
console.log('ROUND 28 (non-régression audit) RESULTS: ' + pass + ' passed, ' + fail + ' failed');
console.log('════════════════════════════════════════');
if (failures.length) console.log('FAILURES:\n  ' + failures.join('\n  '));
process.exit(fail ? 1 : 0);
