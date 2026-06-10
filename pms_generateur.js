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
  if (typeof window === 'undefined') return;

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

  function ligneInfo(label, valeur) {
    return '<tr><td style="font-weight:700;width:38%;padding:5px 8px;border:1px solid #d1d5db;background:#f8fafc">' +
      esc(label) + '</td><td style="padding:5px 8px;border:1px solid #d1d5db">' +
      (valeur ? esc(valeur) : '<span style="color:#9ca3af">à compléter</span>') + '</td></tr>';
  }

  function liste(arr) {
    if (!arr || !arr.length) return '';
    return '<ul style="margin:6px 0 12px;padding-left:20px">' +
      arr.map(function (x) { return '<li style="margin-bottom:4px">' + esc(x) + '</li>'; }).join('') + '</ul>';
  }

  function bloc(titre, contenuHtml) {
    return '<section style="margin:0 0 18px;break-inside:avoid">' +
      '<h3 style="font:700 14px/1.3 Arial,sans-serif;color:#1e1b4b;background:#eef2ff;padding:7px 10px;border-radius:6px;margin:0 0 8px">' +
      esc(titre) + '</h3>' + contenuHtml + '</section>';
  }

  // Construit le corps HTML du PMS pour un secteur donné
  function corpsPMS(S, E) {
    var nom = E.nom || '';
    var adr = [E.adresse, [E.cp, E.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    var dateStr = new Date().toLocaleDateString('fr-FR');

    var html = '';

    // ── Page de garde / identification ──
    html += '<div style="text-align:center;margin:0 0 22px;padding-bottom:14px;border-bottom:3px solid #4338ca">' +
      '<div style="font:700 13px Arial;color:#6b7280;letter-spacing:1px">PLAN DE MAÎTRISE SANITAIRE (PMS)</div>' +
      '<div style="font:800 22px/1.2 Arial;color:#1e1b4b;margin:6px 0">' + S.emoji + ' ' + esc(S.label) + '</div>' +
      '<div style="font:600 14px Arial;color:#374151">' + (nom ? esc(nom) : 'Votre établissement') + '</div>' +
      '<div style="font:12px Arial;color:#6b7280;margin-top:6px">Établi le ' + dateStr +
      ' — d\'après le Règlement (CE) n° 852/2004 et le GBPH du secteur</div>' +
      '</div>';

    // ── Identification de l'établissement ──
    html += bloc('Identification de l\'établissement',
      '<table style="width:100%;border-collapse:collapse;font:12px Arial">' +
      ligneInfo('Raison sociale', E.nom) +
      ligneInfo('Adresse', adr) +
      ligneInfo('SIRET', E.siret) +
      ligneInfo('Téléphone', E.tel) +
      ligneInfo('E-mail', E.email) +
      ligneInfo('Responsable (gérant du PMS)', E.responsable) +
      ligneInfo('Secteur d\'activité', S.label) +
      '</table>');

    // ── Sommaire / textes de référence ──
    html += bloc('Textes réglementaires de référence', liste(S.references));

    // ════ PARTIE I — BPH ════
    html += '<h2 style="font:800 16px Arial;color:#fff;background:#1e1b4b;padding:9px 12px;border-radius:6px;margin:22px 0 14px">' +
      'PARTIE I — Bonnes Pratiques d\'Hygiène (prérequis)</h2>';

    var p = S.bph.personnel;
    html += bloc('1. Personnel — formation, hygiène, santé',
      '<table style="width:100%;border-collapse:collapse;font:12px Arial">' +
      ligneInfo('Formation', p.formation) +
      ligneInfo('Tenue de travail', p.tenue) +
      ligneInfo('Bijoux, ongles, plaies', p.bijoux) +
      ligneInfo('Suivi médical / santé', p.sante) +
      ligneInfo('Hygiène des mains', p.mains) +
      ligneInfo('Visiteurs / livreurs', p.visiteurs) +
      (p.notes ? ligneInfo('Spécificité du secteur', p.notes) : '') +
      '</table>');

    html += bloc('2. Locaux, équipements et maintenance',
      '<p style="font:12px/1.5 Arial;margin:0 0 8px">' + esc(S.bph.locaux) + '</p>');

    var pn = '<table style="width:100%;border-collapse:collapse;font:11.5px Arial"><thead><tr style="background:#1e1b4b;color:#fff">' +
      '<th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left">Zone / matériel</th>' +
      '<th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left">Fréquence</th>' +
      '<th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left">Produit</th>' +
      '<th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left">Méthode</th></tr></thead><tbody>';
    (S.bph.nettoyage || []).forEach(function (n, i) {
      pn += '<tr style="background:' + (i % 2 ? '#f8fafc' : '#fff') + '">' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db;font-weight:600">' + esc(n.zone) + '</td>' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db">' + esc(n.freq) + '</td>' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db">' + esc(n.produit) + '</td>' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db">' + esc(n.methode) + '</td></tr>';
    });
    pn += '</tbody></table>';
    html += bloc('3. Plan de nettoyage et de désinfection', pn);

    html += bloc('4. Lutte contre les nuisibles', '<p style="font:12px/1.5 Arial;margin:0">' + esc(S.bph.nuisibles) + '</p>');
    html += bloc('5. Approvisionnement en eau', '<p style="font:12px/1.5 Arial;margin:0">' + esc(S.bph.eau) + '</p>');
    html += bloc('6. Gestion des déchets', '<p style="font:12px/1.5 Arial;margin:0">' + esc(S.bph.dechets) + '</p>');
    html += bloc('7. Maîtrise des températures (froid / chaud)',
      '<p style="font:12px/1.5 Arial;margin:0 0 8px">' + esc(S.bph.froidChaud) + '</p>' + tableauTemperatures(S));

    // ════ PARTIE II — HACCP ════
    html += '<h2 style="font:800 16px Arial;color:#fff;background:#1e1b4b;padding:9px 12px;border-radius:6px;margin:22px 0 14px">' +
      'PARTIE II — Plan HACCP (7 principes)</h2>';

    html += bloc('Champ d\'application', '<p style="font:12px/1.5 Arial;margin:0">' + esc(S.haccp.champ) + '</p>');
    html += bloc('Équipe HACCP', liste(S.haccp.equipe));
    html += bloc('Description des produits', liste(S.haccp.produits));

    // Diagramme de fabrication (étapes)
    var diag = (S.haccp.diagramme || []).map(function (e, i) {
      return '<div style="display:inline-block;background:#eef2ff;border:1px solid #c7d2fe;border-radius:6px;padding:5px 10px;margin:3px;font:600 11.5px Arial;color:#1e1b4b">' +
        (i + 1) + '. ' + esc(e) + '</div>';
    }).join('<span style="color:#94a3b8;margin:0 2px">→</span>');
    html += bloc('Diagramme de fabrication', '<div style="line-height:2">' + diag + '</div>');

    // Tableau d'analyse des dangers
    var dg = '<table style="width:100%;border-collapse:collapse;font:11px Arial"><thead><tr style="background:#1e1b4b;color:#fff">' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">Étape</th>' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">Danger</th>' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">Type</th>' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">Mesure de maîtrise</th></tr></thead><tbody>';
    (S.haccp.dangers || []).forEach(function (d, i) {
      dg += '<tr style="background:' + (i % 2 ? '#f8fafc' : '#fff') + '">' +
        '<td style="padding:5px;border:1px solid #d1d5db;font-weight:600">' + esc(d.etape) + '</td>' +
        '<td style="padding:5px;border:1px solid #d1d5db">' + esc(d.danger) + '</td>' +
        '<td style="padding:5px;border:1px solid #d1d5db">' + esc(d.type) + '</td>' +
        '<td style="padding:5px;border:1px solid #d1d5db">' + esc(d.mesure) + '</td></tr>';
    });
    dg += '</tbody></table>';
    html += bloc('Analyse des dangers et mesures de maîtrise', dg);

    // Tableau des CCP
    var cc = '<table style="width:100%;border-collapse:collapse;font:10.5px Arial"><thead><tr style="background:#b91c1c;color:#fff">' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">CCP / PrPo</th>' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">Limite critique</th>' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">Surveillance</th>' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">Action corrective</th>' +
      '<th style="padding:6px;border:1px solid #cbd5e1;text-align:left">Enregistrement</th></tr></thead><tbody>';
    (S.haccp.ccp || []).forEach(function (c, i) {
      cc += '<tr style="background:' + (i % 2 ? '#fef2f2' : '#fff') + '">' +
        '<td style="padding:5px;border:1px solid #d1d5db;font-weight:700">' + esc(c.nom) + '</td>' +
        '<td style="padding:5px;border:1px solid #d1d5db">' + esc(c.limite) + '</td>' +
        '<td style="padding:5px;border:1px solid #d1d5db">' + esc(c.surveillance) + '</td>' +
        '<td style="padding:5px;border:1px solid #d1d5db">' + esc(c.correction) + '</td>' +
        '<td style="padding:5px;border:1px solid #d1d5db">' + esc(c.enreg) + '</td></tr>';
    });
    cc += '</tbody></table>' +
      '<p style="font:11px/1.4 Arial;color:#6b7280;margin:6px 0 0">Vérification : étalonnage des sondes, relecture des enregistrements, revue annuelle du plan HACCP et après tout changement de process.</p>';
    html += bloc('Points critiques (CCP) et points d\'attention', cc);

    // Plats témoins (collective uniquement)
    if (S.platsTemoins) {
      html += bloc('Plats témoins (obligatoires)', '<p style="font:12px/1.5 Arial;margin:0;background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:8px 10px">' + esc(S.platsTemoins) + '</p>');
    }

    // Gestion des excédents de fin de service (collective uniquement)
    if (S.gestionExcedents) {
      var ge = S.gestionExcedents;
      html += bloc('Gestion des excédents de fin de service',
        '<p style="font:12px/1.5 Arial;margin:0 0 8px">' + esc(ge.principe) + '</p>' +
        '<p style="font:12px/1.5 Arial;margin:0 0 6px;background:#eff6ff;border-left:3px solid #3b82f6;padding:7px 10px;border-radius:4px">' + esc(ge.froides) + '</p>' +
        '<p style="font:12px/1.5 Arial;margin:0 0 6px;background:#fff7ed;border-left:3px solid #f97316;padding:7px 10px;border-radius:4px">' + esc(ge.chaudes) + '</p>' +
        '<p style="font:12px/1.5 Arial;margin:0;background:#f8fafc;border-left:3px solid #94a3b8;padding:7px 10px;border-radius:4px">' + esc(ge.satellite) + '</p>');
    }

    // Allergènes
    html += bloc('Maîtrise des allergènes (14 allergènes réglementaires)',
      '<p style="font:12px/1.4 Arial;margin:0 0 6px">Information du consommateur obligatoire (Règlement UE 1169/2011). Identification dans chaque recette et prévention des contaminations croisées :</p>' +
      liste(S.allergenes));

    // ════ PARTIE III — Mesures de gestion ════
    html += '<h2 style="font:800 16px Arial;color:#fff;background:#1e1b4b;padding:9px 12px;border-radius:6px;margin:22px 0 14px">' +
      'PARTIE III — Mesures de gestion</h2>';

    html += bloc('Traçabilité',
      '<p style="font:12px/1.5 Arial;margin:0 0 6px">' + esc(S.tracabilite.principe) + '</p>' + liste(S.tracabilite.enregistrements));
    html += bloc('Gestion des non-conformités',
      '<p style="font:12px/1.5 Arial;margin:0 0 6px">' + esc(S.nonConformites.principe) + '</p>' + liste(S.nonConformites.procedure));
    html += bloc('Procédure de retrait / rappel',
      '<p style="font:12px/1.5 Arial;margin:0 0 6px">' + esc(S.retraitRappel.principe) + '</p>' + liste(S.retraitRappel.procedure) +
      '<p style="font:12px/1.4 Arial;color:#374151;margin:0">' + esc(S.retraitRappel.contact) + '</p>');

    // ── Autocontrôles ──
    html += bloc('Synthèse des autocontrôles (enregistrements tenus dans HACCP Pro)', liste(S.autocontroles));

    // ── Avertissement de responsabilité ──
    html += '<div style="margin:22px 0 0;padding:12px 14px;background:#f1f5f9;border-left:4px solid #4338ca;border-radius:4px;font:11.5px/1.5 Arial;color:#475569">' +
      '<b>Note importante :</b> ce Plan de Maîtrise Sanitaire est un modèle pré-rempli, généré automatiquement à partir des informations de votre établissement et du Guide de Bonnes Pratiques d\'Hygiène de votre secteur. ' +
      'Il doit être relu, complété (plans des locaux, fiches techniques de vos produits, coordonnées de vos prestataires) et tenu à jour. ' +
      'L\'éditeur de HACCP Pro fournit un outil d\'aide à l\'autocontrôle ; l\'exploitant reste seul responsable de la conformité de son établissement et de la sauvegarde de ses documents.</div>';

    return html;
  }

  function tableauTemperatures(S) {
    var t = '<table style="width:100%;border-collapse:collapse;font:11.5px Arial;margin-top:6px"><thead><tr style="background:#0f766e;color:#fff">' +
      '<th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left">Denrée / opération</th>' +
      '<th style="padding:6px 8px;border:1px solid #cbd5e1;text-align:left">Température réglementaire</th></tr></thead><tbody>';
    (S.temperatures || []).forEach(function (r, i) {
      t += '<tr style="background:' + (i % 2 ? '#f0fdfa' : '#fff') + '">' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db">' + esc(r.denree) + '</td>' +
        '<td style="padding:5px 8px;border:1px solid #d1d5db;font-weight:700;white-space:nowrap">' + esc(r.valeur) + '</td></tr>';
    });
    t += '</tbody></table>';
    return t;
  }

  // ── Point d'entrée : ouvre le PMS imprimable du secteur (ou d'un secteur donné) ──
  window.genererPMS = function (secteurForce) {
    var PMS = window.PMS_SECTEURS;
    if (!PMS) {
      if (typeof showToast === 'function') showToast('Contenu PMS indisponible', 'warn', 3000);
      else alert('Contenu PMS indisponible.');
      return;
    }
    var cle = secteurForce || secteurActif();
    var S = PMS[cle] || PMS.resto;
    var E = etab();

    var w = window.open('', '_blank');
    if (!w) {
      if (typeof showToast === 'function') showToast('Autorisez les fenêtres pop-up pour générer le PMS', 'warn', 4000);
      else alert('Autorisez les fenêtres pop-up pour générer le PMS.');
      return;
    }

    var titre = 'PMS — ' + (E.nom || S.label);
    var docHtml = '<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>' + esc(titre) + '</title>' +
      '<style>@media print{.noprint{display:none!important}h2,h3,section{break-inside:avoid}}' +
      'body{margin:0;background:#f3f4f6;color:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'table{page-break-inside:auto}</style></head><body>' +
      '<div class="noprint" style="position:sticky;top:0;z-index:9;background:#1e1b4b;color:#fff;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px">' +
      '<div style="font:700 14px Arial">📄 Plan de Maîtrise Sanitaire — ' + esc(S.label) + '</div>' +
      '<button onclick="window.print()" style="background:#fff;color:#1e1b4b;border:none;border-radius:8px;font:700 13px Arial;padding:8px 16px;cursor:pointer">🖨️ Imprimer / PDF</button>' +
      '</div>' +
      '<div style="padding:20px 16px;max-width:880px;margin:0 auto;background:#fff;box-shadow:0 2px 16px rgba(0,0,0,.08)">' +
      corpsPMS(S, E) + '</div>' +
      '<div style="height:30px"></div></body></html>';

    w.document.open();
    w.document.write(docHtml);
    w.document.close();
  };

  // Choix du secteur avant génération (depuis l'admin / multi-secteurs)
  window.genererPMSChoix = function () {
    var PMS = window.PMS_SECTEURS; if (!PMS) return;
    var labels = Object.keys(PMS).map(function (k) { return PMS[k].emoji + ' ' + PMS[k].label + ' (' + k + ')'; }).join('\n');
    var rep = window.prompt('Secteur du PMS à générer :\n' + labels + '\n\nTapez la clé (resto / bp / rapide / boucherie / collective) :', secteurActif());
    if (!rep) return;
    rep = String(rep).trim().toLowerCase();
    if (!PMS[rep]) { alert('Secteur inconnu : ' + rep); return; }
    window.genererPMS(rep);
  };
})();
