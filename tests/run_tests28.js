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

console.log('\n════════════════════════════════════════');
console.log('ROUND 28 (non-régression audit) RESULTS: ' + pass + ' passed, ' + fail + ' failed');
console.log('════════════════════════════════════════');
if (failures.length) console.log('FAILURES:\n  ' + failures.join('\n  '));
process.exit(fail ? 1 : 0);
