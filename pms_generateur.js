/* ════════════════════════════════════════════════════════════════════════
   PMS_GENERATEUR — Génère un Plan de Maîtrise Sanitaire complet, pré-rempli
   avec les informations de l'établissement et adapté à son secteur.

   Le document s'ouvre dans une fenêtre imprimable (bouton « Imprimer / PDF »).
   Aucune donnée n'est envoyée : tout est construit localement à partir de
   pms_secteurs.js + de la fiche établissement (ETAB). Le client reste seul
   responsable de relire, compléter et tenir à jour son PMS.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // Source du contenu : window (navigateur) ou require (Node, scripts/tests)
  function getPMS() {
    if (typeof window !== 'undefined' && window.PMS_SECTEURS) return window.PMS_SECTEURS;
    try { return require('./pms_secteurs.js').PMS_SECTEURS; } catch (e) { return null; }
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Récupère le secteur actif (clé interne : resto/bp/rapide/boucherie/collective)
  function secteurActif() {
    try { if (typeof SECTEUR_ACTIF !== 'undefined' && SECTEUR_ACTIF) return SECTEUR_ACTIF; } catch (e) {}
    try { if (window.ETAB && window.ETAB.secteur) return window.ETAB.secteur; } catch (e) {}
    try {
      var ls = (typeof _ls === 'function') ? _ls : (typeof lsGet === 'function' ? lsGet : null);
      if (ls) { var v = ls('haccp_secteur_actif') || ls('haccp_secteur'); if (v) return v; }
    } catch (e) {}
    return 'resto';
  }

  function etab() {
    try { if (window.ETAB) return window.ETAB; } catch (e) {}
    return {};
  }

  // ── Feuille de styles du document (mise en forme propre, format A4) ──
  var PMS_CSS =
    '@page{size:A4;margin:16mm 15mm 18mm}' +
    '*{box-sizing:border-box}' +
    'body{font-family:"Segoe UI",Arial,Helvetica,sans-serif;color:#1f2937;font-size:11.5px;line-height:1.55;margin:0;background:#e5e7eb}' +
    '.sheet{background:#fff;max-width:800px;margin:0 auto;padding:26px 30px 40px;box-shadow:0 1px 14px rgba(0,0,0,.14)}' +
    'h1,h2,h3,h4{font-family:"Segoe UI",Arial,sans-serif;margin:0}' +
    'p{margin:0 0 8px}' +
    '.part{display:flex;align-items:center;gap:10px;background:#1e1b4b;color:#fff;padding:10px 14px;border-radius:8px;margin:26px 0 14px;font-size:15px;font-weight:800;letter-spacing:.2px}' +
    '.part .pn{background:rgba(255,255,255,.18);border-radius:6px;padding:2px 9px;font-size:13px}' +
    '.sec{margin:0 0 16px}' +
    '.sec>h3{display:flex;gap:8px;align-items:baseline;font-size:13px;font-weight:700;color:#1e1b4b;border-left:4px solid #4338ca;background:#eef2ff;padding:7px 11px;border-radius:0 6px 6px 0;margin:0 0 9px}' +
    '.sec>h3 .num{color:#4338ca;font-weight:800}' +
    '.body{padding:0 2px}' +
    'table{width:100%;border-collapse:collapse;font-size:11px;margin:4px 0 6px}' +
    'th{background:#1e1b4b;color:#fff;text-align:left;padding:6px 8px;border:1px solid #cbd5e1;font-weight:700;font-size:10.5px}' +
    'td{padding:5px 8px;border:1px solid #d7dce3;vertical-align:top}' +
    'tbody tr:nth-child(even){background:#f8fafc}' +
    'table.info td:first-child{font-weight:700;width:34%;background:#f1f5f9;color:#374151}' +
    'table.ccp th{background:#b91c1c}table.ccp tbody tr:nth-child(even){background:#fef4f4}' +
    'table.temp th{background:#0f766e}table.temp tbody tr:nth-child(even){background:#f0fdfa}' +
    'table.temp td:last-child{font-weight:700;white-space:nowrap;color:#0f766e}' +
    'ul.l,ol.l{margin:4px 0 8px;padding-left:20px}ul.l li,ol.l li{margin-bottom:4px}' +
    '.avert{margin:16px 0 0;padding:11px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:11px;color:#92400e}' +
    'table.form td{height:22px}table.form{margin-bottom:14px}' +
    '.flow{line-height:2.1}.flow .st{display:inline-block;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:4px 9px;margin:2px;font-size:11px;font-weight:600;color:#1e1b4b}.flow .ar{color:#94a3b8;margin:0 1px;font-weight:700}' +
    '.callout{border-radius:6px;padding:9px 12px;margin:0 0 8px}' +
    '.cy{background:#fef9c3;border:1px solid #fde047}' +
    '.cb{background:#eff6ff;border-left:4px solid #3b82f6}' +
    '.co{background:#fff7ed;border-left:4px solid #f97316}' +
    '.cg{background:#f8fafc;border-left:4px solid #94a3b8}' +
    '.muted{color:#6b7280;font-size:10.5px}' +
    '.disclaimer{margin:24px 0 0;padding:12px 14px;background:#f1f5f9;border-left:4px solid #4338ca;border-radius:4px;font-size:11px;color:#475569}' +
    /* page de garde plein format */
    '.cover{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:235mm;padding:0 10mm}' +
    '.cover .kicker{font-size:13px;letter-spacing:3px;color:#6b7280;font-weight:700}' +
    '.cover h1{font-size:34px;line-height:1.15;color:#1e1b4b;margin:14px 0 6px;font-weight:800}' +
    '.cover .emoji{font-size:54px;margin:6px 0 10px}' +
    '.cover .secteur{font-size:20px;color:#4338ca;font-weight:700;margin-bottom:26px}' +
    '.cover .etab{font-size:16px;color:#111827;font-weight:600}' +
    '.cover .rule{width:120px;height:3px;background:#4338ca;border-radius:2px;margin:22px auto}' +
    '.cover .base{font-size:12px;color:#6b7280;max-width:460px}' +
    '.cover .foot{margin-top:auto;padding-top:24px;font-size:11px;color:#94a3b8}' +
    /* sommaire */
    '.toc{margin:0 0 8px}.toc .toc-part{font-weight:800;color:#1e1b4b;margin:12px 0 4px;font-size:13px}' +
    '.toc ul{list-style:none;margin:0 0 4px;padding:0}.toc li{padding:3px 0;border-bottom:1px dotted #d1d5db;font-size:11.5px;color:#374151}' +
    '@media screen{.toolbar{position:sticky;top:0;z-index:9;background:#1e1b4b;color:#fff;padding:11px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px}' +
    '.toolbar .t{font-weight:700;font-size:14px}.toolbar button{background:#fff;color:#1e1b4b;border:none;border-radius:8px;font-weight:700;font-size:13px;padding:8px 16px;cursor:pointer}}' +
    '@media print{body{background:#fff}.sheet{box-shadow:none;max-width:none;margin:0;padding:0}.noprint{display:none!important}' +
    '.page-break{break-before:page}.part,.sec,table,tr,.callout,.flow{break-inside:avoid}thead{display:table-header-group}h3{break-after:avoid}}';

  // ── Briques de mise en forme ──
  function infoRow(label, valeur) {
    return '<tr><td>' + esc(label) + '</td><td>' +
      (valeur ? esc(valeur) : '<span style="color:#9ca3af">à compléter</span>') + '</td></tr>';
  }
  function liste(arr) {
    if (!arr || !arr.length) return '';
    return '<ul class="l">' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
  }
  function part(num, titre) {
    return '<h2 class="part"><span class="pn">PARTIE ' + esc(num) + '</span>' + esc(titre) + '</h2>';
  }
  function sec(num, titre, contenuHtml) {
    return '<section class="sec"><h3>' + (num ? '<span class="num">' + esc(num) + '</span>' : '') +
      '<span>' + esc(titre) + '</span></h3><div class="body">' + contenuHtml + '</div></section>';
  }
  function para(txt) { return '<p>' + esc(txt) + '</p>'; }

  function tableauTemperatures(S) {
    var t = '<table class="temp"><thead><tr><th>Denrée / opération</th><th>Température réglementaire</th></tr></thead><tbody>';
    (S.temperatures || []).forEach(function (r) {
      t += '<tr><td>' + esc(r.denree) + '</td><td>' + esc(r.valeur) + '</td></tr>';
    });
    return t + '</tbody></table>';
  }

  // Construit le corps HTML du PMS pour un secteur donné
  function corpsPMS(S, E) {
    var nom = E.nom || '';
    var adr = [E.adresse, [E.cp, E.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    var dateStr = new Date().toLocaleDateString('fr-FR');
    var html = '';

    // ════ PAGE DE GARDE ════
    html += '<div class="cover">' +
      '<div class="kicker">PLAN DE MAÎTRISE SANITAIRE</div>' +
      '<div class="emoji">' + S.emoji + '</div>' +
      '<h1>Plan de Maîtrise<br>Sanitaire</h1>' +
      '<div class="secteur">' + esc(S.label) + '</div>' +
      '<div class="etab">' + (nom ? esc(nom) : '<span style="color:#9ca3af">[ Nom de l\'établissement ]</span>') + '</div>' +
      '<div class="rule"></div>' +
      '<div class="base">Document établi d\'après le Règlement (CE) n° 852/2004 et le Guide de Bonnes Pratiques d\'Hygiène (GBPH) du secteur.</div>' +
      '<div class="foot">Établi le ' + dateStr + ' · Généré avec HACCP Pro</div>' +
      '</div>';

    html += '<div class="avert">⚠️ <b>Avertissement :</b> le présent Plan de Maîtrise Sanitaire est un modèle. Il doit être ' +
      'complété, adapté et validé par l\'exploitant en fonction de l\'activité réelle, puis fait vivre au quotidien (relevés, ' +
      'plan de nettoyage émargé, fiches de réception et de non-conformité…). HACCP Pro est un outil d\'aide à l\'autocontrôle ; ' +
      'l\'exploitant reste seul responsable de la conformité de son établissement et de la sauvegarde de ses documents.</div>';

    // ── Outils de mise en forme locaux ──
    var chap = function (num, titre) {
      return '<h2 class="part"><span class="pn">' + esc(num) + '</span>' + esc(titre) + '</h2>';
    };
    var listeNum = function (arr) {
      return '<ol class="l">' + (arr || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    };
    var tbl = function (headers, rows, cls) {
      var h = '<table' + (cls ? ' class="' + cls + '"' : '') + '><thead><tr>' +
        headers.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
      (rows || []).forEach(function (r) { h += '<tr>' + r.map(function (c) { return '<td>' + (c == null ? '' : c) + '</td>'; }).join('') + '</tr>'; });
      return h + '</tbody></table>';
    };
    var blankTable = function (headers, nRows) {
      var rows = [];
      for (var i = 0; i < (nRows || 10); i++) rows.push(headers.map(function () { return '<div style="height:15px"></div>'; }));
      return tbl(headers, rows, 'form');
    };

    // ════ SOMMAIRE ════
    html += '<div class="page-break"></div>';
    var ptNum = S.platsTemoins ? '3.6' : '';
    html += sec('', 'Sommaire',
      '<div class="toc">' +
      '<div class="toc-part">1. Présentation de l\'établissement et champ d\'application</div>' +
      '<ul><li>1.1 — Objet du PMS</li><li>1.2 — Champ d\'application</li><li>1.3 — Obligations réglementaires préalables</li></ul>' +
      '<div class="toc-part">2. Les Bonnes Pratiques d\'Hygiène (BPH)</div>' +
      '<ul><li>2.1 — Personnel</li><li>2.2 — Locaux & matériel</li><li>2.3 — Plan de nettoyage</li><li>2.4 — Nuisibles</li>' +
      '<li>2.5 — Eau</li><li>2.6 — Températures</li><li>2.7 — Déchets</li></ul>' +
      '<div class="toc-part">3. Le plan HACCP</div>' +
      '<ul><li>3.1 — Méthode (7 principes / 12 étapes)</li><li>3.2 — Équipe & champ</li><li>3.3 — Diagramme</li>' +
      '<li>3.4 — Analyse des dangers</li><li>3.5 — Points critiques (CCP)</li>' + (S.platsTemoins ? '<li>3.6 — Plats témoins & excédents</li>' : '') + '</ul>' +
      '<div class="toc-part">4. Traçabilité et gestion des non-conformités</div>' +
      '<ul><li>4.1 — Traçabilité & durées de conservation</li><li>4.2 — Produits non conformes</li><li>4.3 — Retrait / rappel & TIAC</li></ul>' +
      '<div class="toc-part">5. Information du consommateur — allergènes</div>' +
      '<div class="toc-part">6. Procédures de vérification et d\'autocontrôle</div>' +
      '<div class="toc-part">7. Documents d\'enregistrement (fiches & registres)</div>' +
      '<div class="toc-part">Validation du PMS</div>' +
      '<div class="toc-part">Annexes 1 à 9 — Fiches d\'enregistrement · Annexe 10 — Affichages · Annexe 11 — Affiches</div>' +
      '</div>');

    // ════ 1. PRÉSENTATION ════
    html += '<div class="page-break"></div>';
    html += chap('1', 'Présentation de l\'établissement et champ d\'application');
    html += sec('', 'Identification de l\'établissement',
      '<table class="info">' +
      infoRow('Raison sociale', E.nom) + infoRow('Adresse', adr) + infoRow('SIRET', E.siret) +
      infoRow('Téléphone', E.tel) + infoRow('E-mail', E.email) +
      infoRow('Responsable de l\'hygiène', E.responsable) + infoRow('Secteur d\'activité', S.label) +
      infoRow('Eau potable réseau public', 'Oui') + infoRow('Date d\'établissement', dateStr) + '</table>');
    html += sec('1.1', 'Objet du PMS', para(S.objetPMS));
    html += sec('1.2', 'Champ d\'application', para(S.haccp.champ) + liste(S.references));
    html += sec('1.3', 'Obligations réglementaires préalables',
      '<p><b>Déclaration d\'activité :</b> ' + esc(S.obligations.cerfa) + '</p>' +
      '<p><b>Formation / instructions à l\'hygiène :</b> ' + esc(S.obligations.formation) + '</p>' +
      '<p><b>Tenue et conservation des enregistrements :</b></p>' +
      tbl(['Document à archiver', 'Durée de conservation'],
        S.obligations.conservation.map(function (r) { return [esc(r.doc), '<b>' + esc(r.duree) + '</b>']; })));

    // ════ 2. BPH ════
    html += chap('2', 'Les Bonnes Pratiques d\'Hygiène (BPH)');
    var p = S.bph.personnel;
    html += sec('2.1', 'Hygiène et formation du personnel',
      '<table class="info">' +
      infoRow('Formation', p.formation) + infoRow('Tenue de travail', p.tenue) +
      infoRow('Bijoux, ongles, plaies', p.bijoux) + infoRow('Suivi médical / santé', p.sante) +
      infoRow('Hygiène des mains', p.mains) + infoRow('Visiteurs / livreurs', p.visiteurs) +
      (p.notes ? infoRow('Spécificité du secteur', p.notes) : '') + '</table>');
    html += sec('2.2', 'Locaux, équipements et matériel', para(S.bph.locaux));
    var pn = '<table><thead><tr><th>Zone / matériel</th><th>Fréquence</th><th>Produit</th><th>Méthode</th></tr></thead><tbody>';
    (S.bph.nettoyage || []).forEach(function (n) {
      pn += '<tr><td style="font-weight:600">' + esc(n.zone) + '</td><td>' + esc(n.freq) +
        '</td><td>' + esc(n.produit) + '</td><td>' + esc(n.methode) + '</td></tr>';
    });
    pn += '</tbody></table>';
    html += sec('2.3', 'Plan de nettoyage et de désinfection (PND)',
      '<p>Protocole en 5 étapes : pré-nettoyage → lavage (détergent) → rinçage → désinfection → rinçage final / séchage. ' +
      'Produits d\'entretien stockés dans un local fermé séparé des denrées, avec leurs fiches de données de sécurité (FDS).</p>' + pn);
    html += sec('2.4', 'Lutte contre les nuisibles', para(S.bph.nuisibles));
    html += sec('2.5', 'Approvisionnement en eau', para(S.bph.eau));
    html += sec('2.6', 'Maîtrise des températures (chaîne du froid et du chaud)',
      para(S.bph.froidChaud) + tableauTemperatures(S) +
      '<p class="muted">Relevés de température quotidiens (1 à 2 fois/jour) sur fiche émargée pour chaque enceinte (conservation 12 mois). ' +
      'Toute dérive déclenche une action corrective. Décongélation en enceinte réfrigérée (0 à +4 °C), jamais à température ambiante. ' +
      'Enregistrement automatique continu obligatoire pour les enceintes négatives de plus de 10 m².</p>');
    html += sec('2.7', 'Gestion des déchets', para(S.bph.dechets));

    // ════ 3. HACCP ════
    html += chap('3', 'Le plan HACCP');
    html += sec('3.1', 'La méthode HACCP : 7 principes et 12 étapes',
      '<p><b>Les 7 principes</b> (Codex Alimentarius) :</p>' + listeNum(S.methodeHACCP.principes) +
      '<p><b>Les 12 étapes d\'application :</b></p>' + listeNum(S.methodeHACCP.etapes));
    html += sec('3.2', 'Équipe et champ d\'application', para(S.haccp.champ) + liste(S.haccp.equipe));
    var diag = '<div class="flow">' + (S.haccp.diagramme || []).map(function (e, i) {
      return '<span class="st">' + (i + 1) + '. ' + esc(e) + '</span>';
    }).join('<span class="ar">→</span>') + '</div>';
    html += sec('3.3', 'Diagramme de fabrication', '<p>' + esc(S.haccp.produits.join(' · ')) + '</p>' + diag);
    var dg = '<table><thead><tr><th>Étape</th><th>Danger</th><th>Type</th><th>Mesure de maîtrise</th></tr></thead><tbody>';
    (S.haccp.dangers || []).forEach(function (d) {
      dg += '<tr><td style="font-weight:600">' + esc(d.etape) + '</td><td>' + esc(d.danger) +
        '</td><td>' + esc(d.type) + '</td><td>' + esc(d.mesure) + '</td></tr>';
    });
    dg += '</tbody></table>';
    html += sec('3.4', 'Analyse des dangers', dg);
    var cc = '<table class="ccp"><thead><tr><th>CCP / PrPo</th><th>Limite critique</th><th>Surveillance</th><th>Action corrective</th><th>Enregistrement</th></tr></thead><tbody>';
    (S.haccp.ccp || []).forEach(function (c) {
      cc += '<tr><td style="font-weight:700">' + esc(c.nom) + '</td><td>' + esc(c.limite) +
        '</td><td>' + esc(c.surveillance) + '</td><td>' + esc(c.correction) + '</td><td>' + esc(c.enreg) + '</td></tr>';
    });
    cc += '</tbody></table><p class="muted">Vérification : étalonnage des sondes, relecture des enregistrements, revue annuelle du plan HACCP et après tout changement de process.</p>';
    html += sec('3.5', 'Tableau de maîtrise des points critiques (CCP / PrPo)', cc);
    if (S.platsTemoins || S.gestionExcedents) {
      var pt = '';
      if (S.platsTemoins) pt += '<div class="callout cy"><b>Plats témoins (obligatoires) — </b>' + esc(S.platsTemoins) + '</div>';
      if (S.gestionExcedents) {
        var ge = S.gestionExcedents;
        pt += '<p style="margin-top:6px">' + esc(ge.principe) + '</p>' +
          '<div class="callout cb">' + esc(ge.froides) + '</div>' +
          '<div class="callout co">' + esc(ge.chaudes) + '</div>' +
          '<div class="callout cg">' + esc(ge.satellite) + '</div>';
      }
      html += sec('3.6', 'Plats témoins & gestion des excédents de fin de service', pt);
    }

    // ════ 4. TRAÇABILITÉ & NON-CONFORMITÉS ════
    html += chap('4', 'Traçabilité et gestion des non-conformités');
    html += sec('4.1', 'Traçabilité',
      para(S.tracabilite.principe) + liste(S.tracabilite.enregistrements) +
      '<p><b>Durées de vie indicatives des produits finis</b> (dès fabrication, conservation au froid) :</p>' +
      tbl(['Produit', 'Durée de vie'], (S.dureesVie || []).map(function (r) { return [esc(r.produit), '<b>' + esc(r.duree) + '</b>']; })));
    html += sec('4.2', 'Gestion des produits non conformes', para(S.nonConformites.principe) + liste(S.nonConformites.procedure));
    html += sec('4.3', 'Procédure de retrait / rappel',
      para(S.retraitRappel.principe) + listeNum(S.retraitRappel.procedure) +
      '<div class="callout cy"><b>En cas de suspicion de TIAC </b>(toxi-infection alimentaire collective) : conserver les plats témoins / échantillons, ' +
      'noter les produits et symptômes, alerter la DD(ETS)PP, coopérer à l\'enquête.</div>' +
      '<p class="muted">' + esc(S.retraitRappel.contact) + '</p>');

    // ════ 5. ALLERGÈNES ════
    html += chap('5', 'Information du consommateur — allergènes');
    html += sec('', 'Les 14 allergènes à déclaration obligatoire',
      '<p>Conformément au Règlement (UE) n° 1169/2011 (INCO), l\'information sur la présence des 14 allergènes est mise à disposition ' +
      'du consommateur pour les denrées non préemballées : par affichage et/ou via un <b>registre des allergènes</b> consultable, tenu à jour par produit ' +
      '(voir Annexe 4). Les produits vendus décongelés portent la mention « décongelé ».</p>' + liste(S.allergenes));

    // ════ 6. VÉRIFICATION & AUTOCONTRÔLE ════
    html += chap('6', 'Procédures de vérification et d\'autocontrôle');
    html += sec('', 'Vérifications', liste(S.verification));
    html += sec('', 'Critères microbiologiques de référence (produits sensibles)',
      tbl(['Germe', 'Critère (Règl. CE 2073/2005)'], (S.criteresMicro || []).map(function (r) { return [esc(r.germe), esc(r.critere)]; })));

    // ════ 7. DOCUMENTS D'ENREGISTREMENT ════
    html += chap('7', 'Documents d\'enregistrement (fiches & registres)');
    html += sec('', 'Le classeur « Hygiène »',
      '<p>Les fiches suivantes constituent le classeur « Hygiène ». Elles sont renseignées et émargées au quotidien, et fournies vierges en annexe :</p>' +
      listeNum(S.fichesEnreg));

    // ════ VALIDATION ════
    html += chap('✓', 'Validation du PMS');
    html += '<table class="info">' +
      infoRow('Rédigé / proposé par', 'HACCP Pro (RTH NETGOCE)') +
      infoRow('Validé par (exploitant)', E.responsable) +
      '<tr><td>Date de mise en application</td><td></td></tr>' +
      '<tr><td>Signature de l\'exploitant</td><td style="height:34px"></td></tr>' +
      infoRow('Date de révision prévue', 'Annuelle, ou après tout changement majeur') + '</table>';

    // ════════ ANNEXES ════════
    html += '<div class="page-break"></div>';
    html += chap('A', 'Annexes — Fiches d\'enregistrement & affiches');
    html += '<p class="muted">Les fiches d\'enregistrement (Annexes 1 à 9) sont à imprimer, renseigner et émarger au quotidien, ' +
      'puis à conserver dans le classeur « Hygiène ». Les Annexes 10 et 11 listent les affichages à apposer dans l\'établissement.</p>';

    html += sec('Annexe 1', 'Fiche de relevé des températures (quotidienne, par enceinte)',
      blankTable(['Date', 'Enceinte', 'T° matin', 'T° soir', 'Conforme (O/N)', 'Action corrective', 'Visa'], 12));
    html += sec('Annexe 2', 'Plan de nettoyage et de désinfection — émargement',
      blankTable(['Date', 'Zone / matériel', 'Fréquence prévue', 'Produit utilisé', 'Fait (✔)', 'Visa'], 12));
    html += sec('Annexe 3', 'Fiche de contrôle à la réception',
      blankTable(['Date', 'Fournisseur', 'Produit', 'T° relevée', 'État colis', 'DLC / DDM', 'N° lot', 'Conforme', 'Visa'], 12));
    html += sec('Annexe 4', 'Registre des allergènes (par produit / recette)',
      blankTable(['Produit / recette', 'Allergènes présents', 'Traces possibles', 'Mis à jour le', 'Visa'], 12));
    html += sec('Annexe 5', 'Fiche de non-conformité et de retrait / rappel',
      blankTable(['Date', 'Produit / lot', 'Nature de la non-conformité', 'Cause', 'Action corrective', 'Devenir (destruction / retour)', 'Visa'], 10));
    html += sec('Annexe 6', 'Fiche de traçabilité (bons de livraison, lots, origine)',
      blankTable(['Date', 'Produit', 'Fournisseur', 'N° lot', 'Origine', 'DLC / DDM', 'N° bon de livraison'], 12));
    html += sec('Annexe 7', 'Suivi de la maintenance et des attestations',
      blankTable(['Équipement', 'Opération (ramonage, étalonnage, entretien froid…)', 'Date', 'Prestataire / interne', 'Prochaine échéance', 'Visa'], 10));
    html += sec('Annexe 8', 'Fiche de contrôle de l\'huile de friture (le cas échéant)',
      blankTable(['Date', 'Bain / friteuse', 'Composés polaires (%)', 'Conforme (≤ 25 %)', 'Action (filtration / renouvellement)', 'Visa'], 10));
    html += sec('Annexe 9', 'Fiche de conservation & DLC secondaires',
      blankTable(['Produit', 'Date de fabrication / ouverture', 'DLC secondaire', 'N° lot', 'Visa'], 12));

    html += sec('Annexe 10', 'Affichages obligatoires & supports visuels affichés dans l\'établissement',
      '<p class="muted">Cocher « Oui » lorsque l\'affiche est en place. Les affiches doivent être personnalisées au nom de l\'établissement.</p>' +
      tbl(['Catégorie', 'Affiche / support', 'Emplacement conseillé', 'Affiché (O/N)'],
        (S.affichesOblig || []).map(function (a) { return [esc(a.cat), esc(a.affiche), esc(a.lieu), '']; })));
    html += sec('Annexe 11', 'Affiches à afficher dans l\'établissement (format A4)',
      '<p>Affiches à imprimer (une par page) et à apposer aux postes concernés (atelier, plonge, réception, vente, vestiaire, chambre froide) :</p>' +
      liste(S.affichesA4));

    html += '<div class="disclaimer"><b>Note importante :</b> ce Plan de Maîtrise Sanitaire est un modèle pré-rempli, ' +
      'généré automatiquement à partir des informations de votre établissement et du Guide de Bonnes Pratiques d\'Hygiène de votre secteur. ' +
      'Il doit être relu, complété (plans des locaux, fiches techniques de vos produits, coordonnées de vos prestataires) et tenu à jour. ' +
      'L\'éditeur de HACCP Pro fournit un outil d\'aide à l\'autocontrôle ; l\'exploitant reste seul responsable de la conformité de son établissement et de la sauvegarde de ses documents.</div>';

    return html;
  }

  // ── Construit le document HTML complet (autonome, imprimable en PDF) ──
  // Réutilisé par l'application (fenêtre) ET par les scripts Node (fichiers).
  function buildPMSDocument(cle, E) {
    var PMS = getPMS();
    if (!PMS) return '';
    var S = PMS[cle] || PMS.resto;
    E = E || {};
    var titre = 'PMS — ' + (E.nom || S.label);
    return '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(titre) + '</title><style>' + PMS_CSS + '</style></head><body>' +
      '<div class="toolbar noprint"><span class="t">📄 Plan de Maîtrise Sanitaire — ' + esc(S.label) + '</span>' +
      '<button onclick="window.print()">🖨️ Imprimer / PDF</button></div>' +
      '<div class="sheet">' + corpsPMS(S, E) + '</div></body></html>';
  }

  // ── Point d'entrée navigateur : ouvre le PMS imprimable du secteur actif ──
  if (typeof window !== 'undefined') {
    window.genererPMS = function (secteurForce) {
      var PMS = getPMS();
      if (!PMS) {
        if (typeof showToast === 'function') showToast('Contenu PMS indisponible', 'warn', 3000);
        else alert('Contenu PMS indisponible.');
        return;
      }
      var cle = secteurForce || secteurActif();
      var w = window.open('', '_blank');
      if (!w) {
        if (typeof showToast === 'function') showToast('Autorisez les fenêtres pop-up pour générer le PMS', 'warn', 4000);
        else alert('Autorisez les fenêtres pop-up pour générer le PMS.');
        return;
      }
      w.document.open();
      w.document.write(buildPMSDocument(cle, etab()));
      w.document.close();
    };

    // Choix du secteur avant génération (depuis l'admin / multi-secteurs)
    window.genererPMSChoix = function () {
      var PMS = getPMS(); if (!PMS) return;
      var labels = Object.keys(PMS).map(function (k) { return PMS[k].emoji + ' ' + PMS[k].label + ' (' + k + ')'; }).join('\n');
      var rep = window.prompt('Secteur du PMS à générer :\n' + labels + '\n\nTapez la clé (resto / bp / rapide / boucherie / collective) :', secteurActif());
      if (!rep) return;
      rep = String(rep).trim().toLowerCase();
      if (!PMS[rep]) { alert('Secteur inconnu : ' + rep); return; }
      window.genererPMS(rep);
    };
  }

  // ── Export Node (scripts de génération de fichiers + tests) ──
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { buildPMSDocument: buildPMSDocument, corpsPMS: corpsPMS };
  }
})();
