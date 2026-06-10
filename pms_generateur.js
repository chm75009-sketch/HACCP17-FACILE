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
    'ul.l{margin:4px 0 8px;padding-left:18px}ul.l li{margin-bottom:4px}' +
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

    // ════ SOMMAIRE ════
    html += '<div class="page-break"></div>';
    html += sec('', 'Sommaire',
      '<div class="toc">' +
      '<div class="toc-part">Présentation</div><ul><li>Identification de l\'établissement</li><li>Textes réglementaires de référence</li></ul>' +
      '<div class="toc-part">Partie I — Bonnes Pratiques d\'Hygiène (prérequis)</div>' +
      '<ul><li>I.1 — Personnel (formation, hygiène, santé)</li><li>I.2 — Locaux, équipements et maintenance</li>' +
      '<li>I.3 — Plan de nettoyage et de désinfection</li><li>I.4 — Lutte contre les nuisibles</li>' +
      '<li>I.5 — Approvisionnement en eau</li><li>I.6 — Gestion des déchets</li><li>I.7 — Maîtrise des températures</li></ul>' +
      '<div class="toc-part">Partie II — Plan HACCP (7 principes)</div>' +
      '<ul><li>II.1 — Champ d\'application &amp; équipe</li><li>II.2 — Description des produits</li>' +
      '<li>II.3 — Diagramme de fabrication</li><li>II.4 — Analyse des dangers</li>' +
      '<li>II.5 — Points critiques (CCP)</li>' + (S.platsTemoins ? '<li>II.6 — Plats témoins &amp; excédents</li>' : '') +
      '<li>II.' + (S.platsTemoins ? '7' : '6') + ' — Maîtrise des allergènes</li></ul>' +
      '<div class="toc-part">Partie III — Mesures de gestion</div>' +
      '<ul><li>III.1 — Traçabilité</li><li>III.2 — Gestion des non-conformités</li>' +
      '<li>III.3 — Procédure de retrait / rappel</li><li>III.4 — Synthèse des autocontrôles</li></ul>' +
      '</div>');

    // ════ PRÉSENTATION ════
    html += '<div class="page-break"></div>';
    html += sec('', 'Identification de l\'établissement',
      '<table class="info">' +
      infoRow('Raison sociale', E.nom) + infoRow('Adresse', adr) + infoRow('SIRET', E.siret) +
      infoRow('Téléphone', E.tel) + infoRow('E-mail', E.email) +
      infoRow('Responsable (gérant du PMS)', E.responsable) + infoRow('Secteur d\'activité', S.label) +
      infoRow('Date d\'établissement', dateStr) + '</table>');

    html += sec('', 'Textes réglementaires de référence', liste(S.references));

    // ════ PARTIE I — BPH ════
    html += part('I', 'Bonnes Pratiques d\'Hygiène (prérequis)');
    var p = S.bph.personnel;
    html += sec('I.1', 'Personnel — formation, hygiène, santé',
      '<table class="info">' +
      infoRow('Formation', p.formation) + infoRow('Tenue de travail', p.tenue) +
      infoRow('Bijoux, ongles, plaies', p.bijoux) + infoRow('Suivi médical / santé', p.sante) +
      infoRow('Hygiène des mains', p.mains) + infoRow('Visiteurs / livreurs', p.visiteurs) +
      (p.notes ? infoRow('Spécificité du secteur', p.notes) : '') + '</table>');

    html += sec('I.2', 'Locaux, équipements et maintenance', para(S.bph.locaux));

    var pn = '<table><thead><tr><th>Zone / matériel</th><th>Fréquence</th><th>Produit</th><th>Méthode</th></tr></thead><tbody>';
    (S.bph.nettoyage || []).forEach(function (n) {
      pn += '<tr><td style="font-weight:600">' + esc(n.zone) + '</td><td>' + esc(n.freq) +
        '</td><td>' + esc(n.produit) + '</td><td>' + esc(n.methode) + '</td></tr>';
    });
    pn += '</tbody></table>';
    html += sec('I.3', 'Plan de nettoyage et de désinfection', pn);

    html += sec('I.4', 'Lutte contre les nuisibles', para(S.bph.nuisibles));
    html += sec('I.5', 'Approvisionnement en eau', para(S.bph.eau));
    html += sec('I.6', 'Gestion des déchets', para(S.bph.dechets));
    html += sec('I.7', 'Maîtrise des températures (froid / chaud)', para(S.bph.froidChaud) + tableauTemperatures(S));

    // ════ PARTIE II — HACCP ════
    html += part('II', 'Plan HACCP (7 principes — Codex Alimentarius)');
    html += sec('II.1', 'Champ d\'application & équipe HACCP', para(S.haccp.champ) + liste(S.haccp.equipe));
    html += sec('II.2', 'Description des produits', liste(S.haccp.produits));

    var diag = '<div class="flow">' + (S.haccp.diagramme || []).map(function (e, i) {
      return '<span class="st">' + (i + 1) + '. ' + esc(e) + '</span>';
    }).join('<span class="ar">→</span>') + '</div>';
    html += sec('II.3', 'Diagramme de fabrication', diag);

    var dg = '<table><thead><tr><th>Étape</th><th>Danger</th><th>Type</th><th>Mesure de maîtrise</th></tr></thead><tbody>';
    (S.haccp.dangers || []).forEach(function (d) {
      dg += '<tr><td style="font-weight:600">' + esc(d.etape) + '</td><td>' + esc(d.danger) +
        '</td><td>' + esc(d.type) + '</td><td>' + esc(d.mesure) + '</td></tr>';
    });
    dg += '</tbody></table>';
    html += sec('II.4', 'Analyse des dangers et mesures de maîtrise', dg);

    var cc = '<table class="ccp"><thead><tr><th>CCP / PrPo</th><th>Limite critique</th><th>Surveillance</th><th>Action corrective</th><th>Enregistrement</th></tr></thead><tbody>';
    (S.haccp.ccp || []).forEach(function (c) {
      cc += '<tr><td style="font-weight:700">' + esc(c.nom) + '</td><td>' + esc(c.limite) +
        '</td><td>' + esc(c.surveillance) + '</td><td>' + esc(c.correction) + '</td><td>' + esc(c.enreg) + '</td></tr>';
    });
    cc += '</tbody></table><p class="muted">Vérification : étalonnage des sondes, relecture des enregistrements, revue annuelle du plan HACCP et après tout changement de process.</p>';
    html += sec('II.5', 'Points critiques (CCP) et points d\'attention', cc);

    var numAllerg = '6';
    if (S.platsTemoins || S.gestionExcedents) {
      numAllerg = '7';
      var pt = '';
      if (S.platsTemoins) pt += '<div class="callout cy"><b>Plats témoins (obligatoires) — </b>' + esc(S.platsTemoins) + '</div>';
      if (S.gestionExcedents) {
        var ge = S.gestionExcedents;
        pt += '<p style="margin-top:6px">' + esc(ge.principe) + '</p>' +
          '<div class="callout cb">' + esc(ge.froides) + '</div>' +
          '<div class="callout co">' + esc(ge.chaudes) + '</div>' +
          '<div class="callout cg">' + esc(ge.satellite) + '</div>';
      }
      html += sec('II.6', 'Plats témoins & gestion des excédents de fin de service', pt);
    }

    html += sec('II.' + numAllerg, 'Maîtrise des allergènes (14 allergènes réglementaires)',
      '<p>Information du consommateur obligatoire (Règlement UE 1169/2011). Identification dans chaque recette et prévention des contaminations croisées :</p>' +
      liste(S.allergenes));

    // ════ PARTIE III — Mesures de gestion ════
    html += part('III', 'Mesures de gestion');
    html += sec('III.1', 'Traçabilité', para(S.tracabilite.principe) + liste(S.tracabilite.enregistrements));
    html += sec('III.2', 'Gestion des non-conformités', para(S.nonConformites.principe) + liste(S.nonConformites.procedure));
    html += sec('III.3', 'Procédure de retrait / rappel',
      para(S.retraitRappel.principe) + liste(S.retraitRappel.procedure) +
      '<p class="muted" style="font-size:11px;color:#374151">' + esc(S.retraitRappel.contact) + '</p>');
    html += sec('III.4', 'Synthèse des autocontrôles (enregistrements tenus dans HACCP Pro)', liste(S.autocontroles));

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
