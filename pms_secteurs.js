/* ════════════════════════════════════════════════════════════════════════
   PMS_SECTEURS — Contenu du Plan de Maîtrise Sanitaire, adapté précisément
   à chaque secteur d'activité (HACCP Pro / HACCP17-FACILE).

   Sources réglementaires communes :
   - Règlement (CE) n° 178/2002 (traçabilité, retrait/rappel)
   - Règlement (CE) n° 852/2004 (hygiène des denrées alimentaires, PMS)
   - Règlement (CE) n° 853/2004 (règles spécifiques denrées animales)
   - Règlement (CE) n° 2073/2005 (critères microbiologiques)
   - Règlement (UE) n° 1169/2011 (information consommateur, 14 allergènes)
   - Arrêté du 21 décembre 2009 (températures de conservation)
   - Guides de Bonnes Pratiques d'Hygiène (GBPH) validés, propres à chaque métier

   Chaque secteur ci-dessous reprend la structure officielle d'un PMS :
     I.   Bonnes Pratiques d'Hygiène (BPH / prérequis)
     II.  Plan HACCP (7 principes — Codex Alimentarius)
     III. Mesures de gestion (traçabilité, non-conformités, retrait/rappel)

   ⚠️ Ce contenu est un MODÈLE pré-rempli. Le client reste seul responsable
   de l'adapter à son établissement et de le tenir à jour. HACCP Pro est un
   outil d'aide à l'autocontrôle, et non un organisme de certification.
   ════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  // ── Les 14 allergènes réglementaires (Règlement UE 1169/2011, annexe II) ──
  var ALLERGENES_14 = [
    'Céréales contenant du gluten (blé, seigle, orge, avoine, épeautre…)',
    'Crustacés', 'Œufs', 'Poissons', 'Arachides', 'Soja',
    'Lait (y compris lactose)', 'Fruits à coque (amande, noisette, noix…)',
    'Céleri', 'Moutarde', 'Graines de sésame', 'Anhydride sulfureux et sulfites (>10 mg/kg)',
    'Lupin', 'Mollusques'
  ];

  // ── Plan de nettoyage-désinfection générique (adapté ensuite par secteur) ──
  function planNettoyageBase(extra) {
    var base = [
      { zone: 'Plans de travail et surfaces en contact', freq: 'Après chaque usage + fin de service', produit: 'Détergent-désinfectant contact alimentaire (norme EN 1276 / EN 13697)', methode: 'Pré-nettoyage, application, temps de contact, rinçage, séchage' },
      { zone: 'Petit matériel, ustensiles, planches', freq: 'Après chaque usage', produit: 'Détergent-désinfectant agréé contact alimentaire', methode: 'Lavage manuel ou lave-vaisselle ≥ 60 °C' },
      { zone: 'Sols et siphons', freq: 'Fin de service quotidien', produit: 'Détergent dégraissant', methode: 'Balai-brosse, raclage, rinçage' },
      { zone: 'Enceintes froides (intérieur)', freq: 'Hebdomadaire', produit: 'Détergent-désinfectant', methode: 'Vidage, nettoyage, désinfection, contrôle des joints' },
      { zone: 'Hotte, filtres, conduits', freq: 'Mensuelle (filtres : hebdomadaire)', produit: 'Dégraissant alcalin', methode: 'Démontage filtres, dégraissage, séchage' },
      { zone: 'Poubelles et local déchets', freq: 'Quotidienne', produit: 'Détergent-désinfectant', methode: 'Vidage, lavage, désinfection' },
      { zone: 'Mains du personnel', freq: 'À chaque prise de poste et changement d\'activité', produit: 'Savon bactéricide + essuie-mains à usage unique', methode: 'Lavage 30 s, séchage, friction hydroalcoolique si besoin' }
    ];
    return base.concat(extra || []);
  }

  // ── Bloc « personnel » générique (adapté par secteur via notes) ──
  function personnelBase(notes) {
    return {
      formation: 'Au moins une personne de l\'établissement justifie d\'une formation en hygiène alimentaire adaptée à l\'activité de restauration commerciale (décret n° 2011-731). Formation HACCP du personnel renouvelée et tracée (plan de formation interne).',
      tenue: 'Tenue de travail propre et réservée à la production (veste/tablier, coiffe couvrant les cheveux, chaussures de sécurité). Changement dès souillure. Pas de tenue de ville en zone de production.',
      bijoux: 'Bijoux, montres et vernis à ongles interdits aux postes de manipulation. Ongles courts et propres. Plaies protégées par pansement étanche et coloré (détectable).',
      sante: 'Suivi médical à l\'embauche puis périodique. Toute personne atteinte d\'une affection transmissible par les aliments (gastro-entérite, plaie infectée…) est écartée des postes à risque. Déclaration au responsable.',
      mains: 'Lavage des mains obligatoire : prise de poste, sortie des toilettes, changement d\'activité, après manipulation de déchets, d\'emballages ou de produits crus. Lave-mains à commande non manuelle, savon, essuie-mains à usage unique.',
      visiteurs: 'Accès des visiteurs et livreurs en zone de production limité et encadré (tenue de protection, hygiène des mains).',
      notes: notes || ''
    };
  }

  // ── Mesures de gestion communes (III) ──
  var TRACABILITE = {
    principe: 'Traçabilité amont et aval conforme au Règlement (CE) n° 178/2002 : pouvoir identifier, pour chaque produit, le fournisseur (amont) et, le cas échéant, le destinataire (aval).',
    enregistrements: [
      'Conservation des bons de livraison, factures et étiquettes des produits réceptionnés',
      'Enregistrement des lots à réception (n° de lot, DLC/DDM, fournisseur, date)',
      'Étiquetage interne des produits décongelés, déconditionnés ou fabriqués (date de fabrication + DLC secondaire)',
      'Conservation des documents de traçabilité au minimum 6 mois (durée recommandée alignée sur la durée de vie des produits + marge)'
    ]
  };
  var NON_CONFORMITES = {
    principe: 'Toute non-conformité (température hors seuil, DLC dépassée, rupture de la chaîne du froid, anomalie de livraison, contamination suspectée) est enregistrée, analysée et fait l\'objet d\'une action corrective.',
    procedure: [
      'Identifier et isoler le produit non conforme (zone ou contenant dédié, étiquette « NON CONFORME — NE PAS UTILISER »)',
      'Enregistrer la non-conformité (nature, date, produit/lot, agent)',
      'Décider du traitement : refus à réception, destruction, retour fournisseur, déclassement',
      'Mettre en œuvre l\'action corrective et vérifier son efficacité',
      'Analyser la cause et, si récurrent, réviser la procédure ou la formation'
    ]
  };
  var RETRAIT_RAPPEL = {
    principe: 'En cas de produit susceptible de présenter un risque pour la santé, mise en œuvre immédiate de la procédure de retrait (hors circuit de distribution) et, si le produit a pu atteindre le consommateur, de rappel.',
    procedure: [
      'Identifier le produit et le(s) lot(s) concernés grâce à la traçabilité',
      'Retirer immédiatement de la vente / du service et isoler les stocks',
      'Informer sans délai la DD(ETS)PP (Direction départementale de la protection des populations)',
      'Informer le fournisseur et, si rappel, les consommateurs (affichage, communication)',
      'Enregistrer l\'opération et conserver les preuves (quantités, destination, destruction)'
    ],
    contact: 'Coordonnées de la DD(ETS)PP du département à afficher. En cas de toxi-infection alimentaire collective (TIAC) suspectée : déclaration obligatoire à l\'ARS et à la DD(ETS)PP.'
  };

  // Étapes HACCP : champ d'application & équipe — formulés par secteur, base commune
  function champBase(activite) {
    return 'Le présent plan HACCP s\'applique à l\'ensemble des activités de ' + activite +
      ' de l\'établissement, de la réception des matières premières jusqu\'à la remise au consommateur. ' +
      'Il est fondé sur les 7 principes du Codex Alimentarius et tient compte des prérequis (BPH) décrits en partie I.';
  }
  function equipeBase() {
    return [
      'Le responsable de l\'établissement (pilote du PMS, formé HACCP)',
      'Le ou les responsables de production / chef(s) de partie',
      'Toute personne ressource (référent hygiène, prestataire conseil le cas échéant)'
    ];
  }

  // ════════════════════════════════════════════════════════════════════════
  // 1) RESTAURATION TRADITIONNELLE  (clé interne : resto)
  // ════════════════════════════════════════════════════════════════════════
  var RESTO = {
    label: 'Restauration traditionnelle',
    emoji: '🍽️',
    activite: 'restauration commerciale traditionnelle (préparation et service de repas sur place)',
    references: [
      'Règlement (CE) n° 852/2004 — hygiène des denrées alimentaires',
      'Arrêté du 21 décembre 2009 — températures de conservation',
      'Règlement (CE) n° 2073/2005 — critères microbiologiques',
      'Règlement (UE) n° 1169/2011 — allergènes (information du consommateur)',
      'GBPH « Restaurateur » (guide validé, secteur de la restauration commerciale)',
      'Décret n° 2011-731 — obligation de formation en hygiène alimentaire'
    ],
    bph: {
      personnel: personnelBase('Restauration : rotation des postes chaud/froid maîtrisée, séparation des activités propres et souillées dans le temps et l\'espace.'),
      locaux: 'Marche en avant dans l\'espace ou, à défaut, dans le temps (séparation cru/cuit, propre/sale). Surfaces lisses, lavables, non absorbantes. Éclairage protégé. Ventilation suffisante. Réseau d\'évacuation adapté.',
      nettoyage: planNettoyageBase([
        { zone: 'Trancheuse, robot, mixeur', freq: 'Après chaque usage', produit: 'Détergent-désinfectant', methode: 'Démontage des pièces, lavage, désinfection, remontage' },
        { zone: 'Chambre froide positive / négative', freq: 'Hebdo + dès souillure', produit: 'Détergent-désinfectant', methode: 'Contrôle des joints, évaporateur, écoulement' }
      ]),
      nuisibles: 'Plan de lutte contre les nuisibles : contrat avec prestataire 3D ou dispositifs internes (postes d\'appâtage numérotés, plan d\'implantation, fiches d\'intervention). Ouvertures protégées (moustiquaires, bas de portes). Aucun produit raticide en zone alimentaire non sécurisée.',
      eau: 'Eau du réseau public potable. En cas de puits/forage : analyses périodiques. Glace alimentaire produite à partir d\'eau potable.',
      dechets: 'Évacuation fréquente, poubelles à commande non manuelle, local déchets séparé. Tri des biodéchets (obligation de tri à la source). Collecte des huiles alimentaires usagées par prestataire agréé (bordereaux conservés).',
      froidChaud: 'Respect permanent de la chaîne du froid et du chaud (cf. tableau des températures). Contrôle et enregistrement des températures des enceintes au moins quotidiennement.'
    },
    haccp: {
      champ: champBase('restauration traditionnelle'),
      equipe: equipeBase(),
      produits: [
        'Matières premières crues : viandes, volailles, poissons, produits de la mer, œufs, légumes, produits laitiers',
        'Préparations froides : entrées, sauces froides à base d\'œuf cru (mayonnaise), desserts',
        'Préparations chaudes : plats cuisinés, sauces, viandes et poissons cuits',
        'Préparations à l\'avance (PCEA) refroidies puis remises en température'
      ],
      diagramme: [
        'Réception des matières premières', 'Stockage (sec / froid positif / froid négatif)',
        'Déconditionnement / décongélation', 'Préparation froide / tranchage',
        'Cuisson', 'Refroidissement rapide (si préparation à l\'avance)',
        'Stockage des préparations', 'Remise en température', 'Maintien (chaud ≥ 63 °C / froid ≤ 3 °C)',
        'Dressage et service'
      ],
      dangers: [
        { etape: 'Réception', danger: 'Rupture chaîne du froid, DLC dépassée, contamination', type: 'Biologique', mesure: 'Contrôle T° et DLC à réception, refus si non conforme' },
        { etape: 'Stockage', danger: 'Développement microbien, contaminations croisées', type: 'Biologique', mesure: 'Respect des T°, séparation cru/cuit, filmage, rangement DLC' },
        { etape: 'Décongélation', danger: 'Multiplication microbienne', type: 'Biologique', mesure: 'Décongélation en enceinte froide 0–+4 °C, jamais à T° ambiante' },
        { etape: 'Préparation froide', danger: 'Salmonella (œufs crus), Listeria', type: 'Biologique', mesure: 'Ovoproduits pasteurisés conseillés, hygiène, T° maîtrisée, fabrication à la demande' },
        { etape: 'Cuisson', danger: 'Survie de pathogènes', type: 'Biologique', mesure: 'CCP — cuisson à cœur (voir limites critiques)' },
        { etape: 'Refroidissement', danger: 'Croissance des spores (Clostridium, Bacillus)', type: 'Biologique', mesure: 'CCP — +63 °C à +10 °C en moins de 2 h' },
        { etape: 'Maintien chaud', danger: 'Multiplication microbienne', type: 'Biologique', mesure: 'CCP — maintien ≥ 63 °C' },
        { etape: 'Toutes étapes', danger: 'Allergènes (contamination croisée)', type: 'Allergène', mesure: 'Identification des 14 allergènes, info consommateur, ustensiles dédiés' },
        { etape: 'Toutes étapes', danger: 'Corps étrangers (verre, métal, plastique)', type: 'Physique', mesure: 'Contrôle visuel, protection éclairage, état du matériel' }
      ],
      ccp: [
        { nom: 'CCP 1 — Cuisson à cœur', limite: 'Volaille ≥ 74 °C ; viande hachée ≥ 65 °C ; autres ≥ 63 °C à cœur', surveillance: 'Sonde à cœur, à chaque cuisson sensible', correction: 'Prolonger la cuisson, jeter si doute', verif: 'Étalonnage sonde, relecture enregistrements', enreg: 'Fiche de cuisson / contrôle T° à cœur' },
        { nom: 'CCP 2 — Refroidissement rapide', limite: 'De +63 °C à +10 °C en moins de 2 h', surveillance: 'Cellule de refroidissement, contrôle T° et durée', correction: 'Jeter le produit si délai dépassé', verif: 'Suivi des courbes cellule', enreg: 'Fiche de refroidissement' },
        { nom: 'CCP 3 — Maintien en température', limite: 'Chaud ≥ 63 °C / froid ≤ +3 °C', surveillance: 'Contrôle T° avant et pendant le service', correction: 'Remise en T° ou retrait du produit', verif: 'Contrôle thermomètres', enreg: 'Relevé de service' }
      ]
    },
    temperatures: [
      { denree: 'Préparations culinaires élaborées à l\'avance (PCEA)', valeur: '0 à +3 °C' },
      { denree: 'Viandes hachées et préparations de viandes', valeur: '+2 °C' },
      { denree: 'Abats', valeur: '+3 °C' },
      { denree: 'Volailles, lapins, gibier', valeur: '+4 °C' },
      { denree: 'Viandes découpées (autres)', valeur: '+7 °C' },
      { denree: 'Produits de la pêche frais', valeur: '0 à +2 °C (glace fondante)' },
      { denree: 'Produits laitiers frais, desserts à base de lait', valeur: '+4 °C' },
      { denree: 'Surgelés', valeur: '-18 °C' },
      { denree: 'Maintien au chaud (liaison chaude)', valeur: '≥ +63 °C' },
      { denree: 'Refroidissement rapide', valeur: '+63 → +10 °C en < 2 h' },
      { denree: 'Remise en température (réchauffage)', valeur: '≥ +63 °C à cœur en < 1 h' }
    ],
    autocontroles: [
      'Contrôle des températures des enceintes (matin et soir)',
      'Contrôle à réception (T°, DLC, intégrité, étiquetage)',
      'Cuisson à cœur des produits sensibles',
      'Refroidissement rapide (courbe T°/temps)',
      'Maintien en température au service',
      'Huiles de friture (contrôle visuel / composés polaires ≤ 25 %)',
      'Plan de nettoyage émargé',
      'Traçabilité des plats (étiquetage interne, DLC secondaires)'
    ]
  };

  // ════════════════════════════════════════════════════════════════════════
  // 2) BOULANGERIE & PÂTISSERIE  (clé interne : bp)
  // ════════════════════════════════════════════════════════════════════════
  var BP = {
    label: 'Boulangerie & Pâtisserie',
    emoji: '🥐',
    activite: 'boulangerie, pâtisserie, viennoiserie, et le cas échéant salon de thé / traiteur',
    references: [
      'Règlement (CE) n° 852/2004 — hygiène des denrées alimentaires',
      'Arrêté du 21 décembre 2009 — températures de conservation',
      'Règlement (CE) n° 2073/2005 — critères microbiologiques',
      'Règlement (UE) n° 1169/2011 — allergènes',
      'GBPH « Boulangerie-Pâtisserie » (guide validé de la filière)',
      'Décret n° 2011-731 — formation en hygiène alimentaire'
    ],
    bph: {
      personnel: personnelBase('Boulangerie-Pâtisserie : attention particulière à la manipulation des préparations à base d\'œufs et de crèmes (point sensible Salmonella).'),
      locaux: 'Séparation des zones farineuse (fournil) et pâtisserie (laboratoire crèmes). Stockage des farines isolé de l\'humidité, sur palettes. Surfaces lisses et lavables. Maîtrise des poussières de farine (risque ATEX et allergène gluten).',
      nettoyage: planNettoyageBase([
        { zone: 'Pétrin, batteur, laminoir', freq: 'Après chaque usage (laminoir : fin de service)', produit: 'Détergent alimentaire + désinfectant pour pièces en contact', methode: 'Démontage, brossage farine, lavage, désinfection des pièces en contact crème' },
        { zone: 'Matériel pâtisserie (poches, douilles, cuves crème)', freq: 'Après chaque usage', produit: 'Détergent-désinfectant', methode: 'Lavage immédiat, désinfection — usage unique conseillé pour les poches' },
        { zone: 'Four, chambre de pousse', freq: 'Hebdomadaire', produit: 'Dégraissant', methode: 'Nettoyage à froid, contrôle des joints de la chambre de pousse' }
      ]),
      nuisibles: 'Plan de lutte contre les nuisibles (3D) adapté : les farines et produits sucrés attirent rongeurs et insectes (mites alimentaires). Stockage en contenants fermés, rotation FIFO, postes d\'appâtage numérotés, contrôle des arrivages de farine.',
      eau: 'Eau potable du réseau pour le pétrissage et le nettoyage. Glace alimentaire (salon de thé) produite à partir d\'eau potable.',
      dechets: 'Tri des biodéchets, gestion des emballages (cartons farine, plastiques). Huiles de friture (beignets, viennoiseries frites) collectées par prestataire agréé.',
      froidChaud: 'Chaîne du froid stricte pour les crèmes, entremets et produits à base d\'œufs. Vitrines réfrigérées ≤ +4 °C. Surgélation maîtrisée des produits crus (pâtons, viennoiseries).'
    },
    haccp: {
      champ: champBase('boulangerie et pâtisserie'),
      equipe: equipeBase(),
      produits: [
        'Pains et viennoiseries (produits cuits stables à T° ambiante)',
        'Pâtisseries à base de crème (crème pâtissière, crème chantilly, mousses) — produits sensibles',
        'Produits à base d\'œufs crus ou peu cuits (mousses, crèmes)',
        'Produits réfrigérés : entremets, tartes, salades (activité traiteur)',
        'Produits surgelés crus (pâtons, viennoiseries) à cuire / pousser'
      ],
      diagramme: [
        'Réception (farines, œufs/ovoproduits, beurre, fruits, ingrédients)',
        'Stockage (sec / froid positif / froid négatif)',
        'Pétrissage / pesée', 'Fabrication des crèmes et appareils',
        'Façonnage', 'Pousse / fermentation', 'Cuisson (four)',
        'Refroidissement', 'Garnissage / montage (crèmes)',
        'Stockage réfrigéré des produits sensibles', 'Vente / remise au client'
      ],
      dangers: [
        { etape: 'Réception œufs / ovoproduits', danger: 'Salmonella', type: 'Biologique', mesure: 'Préférer ovoproduits pasteurisés ; contrôle DLC/DDM ; T° œufs maîtrisée' },
        { etape: 'Stockage farines', danger: 'Mites, rongeurs, humidité (moisissures, mycotoxines)', type: 'Biologique/Physique', mesure: 'Contenants fermés, local sec, FIFO, lutte nuisibles' },
        { etape: 'Fabrication crème pâtissière', danger: 'Survie/croissance de Salmonella', type: 'Biologique', mesure: 'CCP — cuisson de la crème ≥ 85 °C puis refroidissement rapide' },
        { etape: 'Refroidissement des crèmes', danger: 'Multiplication microbienne', type: 'Biologique', mesure: 'CCP — refroidissement rapide +63 → +10 °C en < 2 h' },
        { etape: 'Montage / garnissage', danger: 'Contamination par manipulation', type: 'Biologique', mesure: 'Hygiène stricte, matériel propre, fabrication à la demande, T° basse' },
        { etape: 'Stockage produits sensibles', danger: 'Croissance microbienne, DLC', type: 'Biologique', mesure: 'Vitrine ≤ +4 °C, étiquetage DLC, rotation' },
        { etape: 'Toutes étapes', danger: 'Allergènes (gluten, œuf, lait, fruits à coque)', type: 'Allergène', mesure: 'Information consommateur, séparation, nettoyage entre productions' },
        { etape: 'Toutes étapes', danger: 'Corps étrangers (coquilles, métal, ficelle)', type: 'Physique', mesure: 'Mirage des œufs, tamisage farine, contrôle visuel, état matériel' }
      ],
      ccp: [
        { nom: 'CCP 1 — Cuisson des crèmes à base d\'œuf', limite: 'Crème pâtissière portée à ≥ 85 °C', surveillance: 'Contrôle T° de la crème à la fabrication', correction: 'Poursuivre la cuisson ; jeter si doute', verif: 'Étalonnage sonde, relecture fiches', enreg: 'Fiche de fabrication des crèmes' },
        { nom: 'CCP 2 — Refroidissement des crèmes / entremets', limite: 'De +63 °C à +10 °C en moins de 2 h', surveillance: 'Cellule de refroidissement (T° / durée)', correction: 'Jeter si délai dépassé', verif: 'Courbes cellule', enreg: 'Fiche de refroidissement' },
        { nom: 'CCP 3 — Conservation au froid des produits sensibles', limite: 'Vitrine / chambre ≤ +4 °C', surveillance: 'Relevés T° quotidiens', correction: 'Retrait des produits, intervention frigoriste', verif: 'Contrôle thermomètres', enreg: 'Relevé de températures' }
      ]
    },
    temperatures: [
      { denree: 'Œufs coquille (stockage)', valeur: 'Température stable, sans choc thermique (≤ +5 °C conseillé)' },
      { denree: 'Ovoproduits pasteurisés', valeur: '≤ +4 °C (selon étiquetage)' },
      { denree: 'Crèmes, entremets, pâtisseries à base de crème', valeur: '≤ +4 °C' },
      { denree: 'Beurre, produits laitiers', valeur: '+4 °C' },
      { denree: 'Produits surgelés (pâtons, viennoiseries)', valeur: '-18 °C' },
      { denree: 'Cuisson crème pâtissière', valeur: '≥ +85 °C' },
      { denree: 'Refroidissement des crèmes', valeur: '+63 → +10 °C en < 2 h' },
      { denree: 'Vitrine de vente réfrigérée', valeur: '≤ +4 °C' }
    ],
    autocontroles: [
      'Contrôle des températures (chambres froides, vitrines) matin et soir',
      'Contrôle à réception (œufs/ovoproduits, beurre, fruits : T° et DLC/DDM)',
      'Cuisson des crèmes à base d\'œuf (≥ 85 °C)',
      'Refroidissement rapide des crèmes et entremets',
      'Étiquetage et DLC des produits à base de crème',
      'Contrôle des farines (rotation, absence de nuisibles)',
      'Affichage des 14 allergènes (produits vendus)',
      'Plan de nettoyage émargé (laboratoire crèmes en priorité)'
    ]
  };

  // ════════════════════════════════════════════════════════════════════════
  // 3) RESTAURATION RAPIDE  (clé interne : rapide)
  // ════════════════════════════════════════════════════════════════════════
  var RAPIDE = {
    label: 'Restauration rapide',
    emoji: '🍔',
    activite: 'restauration rapide (préparation et service rapide, vente à emporter, livraison, drive)',
    references: [
      'Règlement (CE) n° 852/2004 — hygiène des denrées alimentaires',
      'Arrêté du 21 décembre 2009 — températures de conservation',
      'Règlement (CE) n° 2073/2005 — critères microbiologiques',
      'Règlement (UE) n° 1169/2011 — allergènes',
      'GBPH « Restauration rapide » (guide validé du secteur)',
      'Décret n° 2011-731 — formation en hygiène alimentaire'
    ],
    bph: {
      personnel: personnelBase('Restauration rapide : forte rotation du personnel — formation d\'accueil hygiène systématique, fiches de poste simples et affichées.'),
      locaux: 'Postes de production en ligne (assemblage rapide). Séparation des flux crus/cuits. Zones de stockage chaud (bac-marie, lampes) et froid (saladettes réfrigérées) maîtrisées. Surfaces lavables.',
      nettoyage: planNettoyageBase([
        { zone: 'Grill, plancha, friteuse', freq: 'Fin de service + dégraissage régulier', produit: 'Dégraissant alimentaire', methode: 'Grattage, dégraissage, désinfection des surfaces froides' },
        { zone: 'Saladette / bac réfrigéré', freq: 'Quotidien + entre services', produit: 'Détergent-désinfectant', methode: 'Vidage des bacs, nettoyage, contrôle T°' },
        { zone: 'Machine à boissons / glaçons', freq: 'Quotidien (becs) + hebdo (circuits)', produit: 'Détergent-désinfectant agréé', methode: 'Démontage becs, désinfection, détartrage' }
      ]),
      nuisibles: 'Plan de lutte contre les nuisibles (3D) : restauration rapide souvent en zone de passage / centre commercial — vigilance accrue. Portes à fermeture automatique, sas, postes d\'appâtage, contrôle des livraisons.',
      eau: 'Eau potable du réseau. Glaçons et fontaines à boissons à partir d\'eau potable, circuits désinfectés régulièrement.',
      dechets: 'Volume d\'emballages important (tri carton/plastique). Huiles de friture : contrôle des composés polaires et collecte par prestataire agréé (bordereaux). Biodéchets triés.',
      froidChaud: 'Maintien chaud des produits prêts (≥ 63 °C) et froid des composants (≤ +3 °C en saladette). Maîtrise du temps d\'exposition des produits assemblés.'
    },
    haccp: {
      champ: champBase('restauration rapide'),
      equipe: equipeBase(),
      produits: [
        'Viandes hachées (steaks hachés, kebab, nuggets) — produits très sensibles',
        'Produits frits (frites, beignets, panés)',
        'Composants froids (crudités, sauces, fromages)',
        'Produits assemblés à la demande (burgers, sandwichs, salades, wraps)',
        'Boissons (fontaines, glaçons)'
      ],
      diagramme: [
        'Réception (surgelés, frais, secs)', 'Stockage (négatif / positif / sec)',
        'Décongélation maîtrisée', 'Préparation des composants froids',
        'Cuisson (grill, friteuse, four)', 'Maintien chaud',
        'Assemblage à la demande', 'Remise au client / emballage à emporter / livraison'
      ],
      dangers: [
        { etape: 'Réception', danger: 'Rupture chaîne du froid, surgelés décongelés', type: 'Biologique', mesure: 'Contrôle T° (surgelés ≤ -18 °C), DLC, refus si non conforme' },
        { etape: 'Décongélation', danger: 'Multiplication microbienne', type: 'Biologique', mesure: 'En enceinte froide ou cuisson directe sans décongélation préalable' },
        { etape: 'Cuisson viande hachée', danger: 'E. coli (STEC), Salmonella', type: 'Biologique', mesure: 'CCP — cuisson à cœur ≥ 65 °C (steak haché : à cœur, plus de jus rosé)' },
        { etape: 'Friture', danger: 'Composés polaires, acrylamide', type: 'Chimique', mesure: 'CCP — huile : composés polaires ≤ 25 %, T° ≤ 175 °C, renouvellement' },
        { etape: 'Maintien chaud', danger: 'Multiplication microbienne', type: 'Biologique', mesure: 'CCP — maintien ≥ 63 °C, limiter le temps de maintien' },
        { etape: 'Saladette / composants froids', danger: 'Croissance microbienne', type: 'Biologique', mesure: 'Bac ≤ +3 °C, réassort en petites quantités, étiquetage' },
        { etape: 'Toutes étapes', danger: 'Allergènes (gluten, sésame, lait, œuf, soja…)', type: 'Allergène', mesure: 'Information consommateur, fiches produits, séparation' },
        { etape: 'Toutes étapes', danger: 'Corps étrangers', type: 'Physique', mesure: 'Contrôle visuel, état du matériel' }
      ],
      ccp: [
        { nom: 'CCP 1 — Cuisson des viandes hachées', limite: '≥ 65 °C à cœur (cuisson complète, plus de jus rosé)', surveillance: 'Sonde à cœur / temps-température de l\'équipement', correction: 'Prolonger la cuisson, jeter si doute', verif: 'Étalonnage sonde', enreg: 'Fiche de cuisson' },
        { nom: 'CCP 2 — Maîtrise des huiles de friture', limite: 'Composés polaires ≤ 25 %, T° ≤ 175 °C', surveillance: 'Bandelette / testeur composés polaires, contrôle visuel', correction: 'Filtration / renouvellement du bain', verif: 'Suivi des changements de bain', enreg: 'Registre huiles de friture' },
        { nom: 'CCP 3 — Maintien en température', limite: 'Chaud ≥ 63 °C / saladette ≤ +3 °C', surveillance: 'Contrôle T° par service', correction: 'Retrait du produit, réglage équipement', verif: 'Contrôle thermomètres', enreg: 'Relevé de service' }
      ]
    },
    temperatures: [
      { denree: 'Viandes hachées et préparations de viandes', valeur: '+2 °C' },
      { denree: 'Surgelés (steaks, nuggets, frites)', valeur: '-18 °C' },
      { denree: 'Composants froids en saladette', valeur: '≤ +3 °C' },
      { denree: 'Produits laitiers, sauces fraîches', valeur: '+4 °C' },
      { denree: 'Maintien chaud (produits prêts)', valeur: '≥ +63 °C' },
      { denree: 'Huile de friture', valeur: '≤ 175 °C — composés polaires ≤ 25 %' },
      { denree: 'Décongélation', valeur: 'En enceinte froide 0 à +4 °C' }
    ],
    autocontroles: [
      'Contrôle des températures (négatif, positif, saladettes) par service',
      'Contrôle à réception (surgelés ≤ -18 °C, frais, DLC)',
      'Cuisson à cœur des viandes hachées (≥ 65 °C)',
      'Contrôle des huiles de friture (composés polaires)',
      'Maintien chaud / froid pendant le service',
      'Nettoyage des machines à boissons et fontaines à glaçons',
      'Affichage des allergènes (par produit)',
      'Hygiène des emballages à emporter / livraison'
    ]
  };

  // ════════════════════════════════════════════════════════════════════════
  // 4) BOUCHERIE & CHARCUTERIE  (clé interne : boucherie)
  // ════════════════════════════════════════════════════════════════════════
  var BOUCHERIE = {
    label: 'Boucherie & Charcuterie',
    emoji: '🥩',
    activite: 'boucherie, charcuterie et, le cas échéant, traiteur (préparation et vente de viandes et produits carnés)',
    references: [
      'Règlement (CE) n° 852/2004 — hygiène des denrées alimentaires',
      'Règlement (CE) n° 853/2004 — règles spécifiques aux denrées animales (agrément / dérogation)',
      'Arrêté du 21 décembre 2009 — températures de conservation des denrées animales',
      'Règlement (CE) n° 2073/2005 — critères microbiologiques (dont E. coli, Salmonella, Listeria)',
      'Règlement (UE) n° 1169/2011 — allergènes (charcuterie, traiteur)',
      'GBPH « Boucher » et « Charcutier-traiteur » (guides validés)'
    ],
    bph: {
      personnel: personnelBase('Boucherie : maîtrise du froid au poste de découpe, hygiène stricte des couteaux et des mains (risque E. coli STEC, contamination croisée).'),
      locaux: 'Statut sanitaire : remise directe au consommateur (dérogation à l\'agrément dans les limites de quantité et de distance) ou établissement agréé (CE 853/2004). Séparation des secteurs : réception, découpe, préparation, vente. Laboratoire à température dirigée (≤ +12 °C en zone de travail des viandes). Chambres froides séparées par familles de produits.',
      nettoyage: planNettoyageBase([
        { zone: 'Billot, table de découpe, scie à os', freq: 'Après chaque usage + fin de service', produit: 'Détergent-désinfectant', methode: 'Raclage, lavage, désinfection, séchage' },
        { zone: 'Hachoir, poussoir, trancheuse', freq: 'Après chaque usage', produit: 'Détergent-désinfectant', methode: 'Démontage complet, brossage, désinfection des pièces en contact' },
        { zone: 'Couteaux, fusil, gants maille', freq: 'En continu + stérilisateur à couteaux', produit: 'Eau ≥ 82 °C (stérilisateur) / désinfectant', methode: 'Stérilisateur à 82 °C entre les pièces' },
        { zone: 'Chambres froides (par famille)', freq: 'Hebdomadaire', produit: 'Détergent-désinfectant', methode: 'Contrôle des joints, crochets, évaporateurs' }
      ]),
      nuisibles: 'Plan 3D renforcé (produits carnés très attractifs). Aucun accès des nuisibles aux chambres froides et au labo. Postes d\'appâtage, contrôle des arrivages, protection des ouvertures.',
      eau: 'Eau potable du réseau. Stérilisateurs à couteaux maintenus ≥ 82 °C.',
      dechets: 'Gestion des sous-produits animaux (SPAn) : catégorisation, conservation au froid, enlèvement par équarrisseur agréé (bons d\'enlèvement conservés). Os, graisses, déchets de découpe tracés.',
      froidChaud: 'Chaîne du froid stricte tout au long de la découpe et de la transformation. Travail des viandes en zone à température dirigée. Cuisson maîtrisée pour les produits de charcuterie cuite.'
    },
    haccp: {
      champ: champBase('boucherie et charcuterie'),
      equipe: equipeBase(),
      produits: [
        'Viandes fraîches (bœuf, veau, porc, agneau, volailles) — carcasses, pièces, découpe',
        'Préparations de viandes (saucisses, chair à saucisse, brochettes, viande hachée)',
        'Charcuterie crue (saucisson sec, chorizo — affinage)',
        'Charcuterie cuite (pâté, jambon cuit, boudin, plats cuisinés traiteur)',
        'Abats'
      ],
      diagramme: [
        'Réception (carcasses, pièces, abats, ingrédients)',
        'Stockage froid (chambres séparées par famille)',
        'Désossage / découpe / parage', 'Hachage / préparation de viandes',
        'Transformation (salaison, embossage, cuisson charcuterie)',
        'Refroidissement (charcuterie cuite)', 'Conditionnement / étiquetage',
        'Stockage froid / vitrine', 'Vente au consommateur'
      ],
      dangers: [
        { etape: 'Réception', danger: 'Rupture chaîne du froid, contamination, T° non conforme', type: 'Biologique', mesure: 'Contrôle T° des viandes à réception, estampille sanitaire, DLC, refus si non conforme' },
        { etape: 'Stockage', danger: 'Croissance microbienne, contamination croisée', type: 'Biologique', mesure: 'Chambres séparées par famille, T° maîtrisées, crochets/bacs propres' },
        { etape: 'Découpe / désossage', danger: 'Contamination croisée (E. coli STEC, Salmonella)', type: 'Biologique', mesure: 'Hygiène des couteaux (stérilisateur 82 °C), des mains, T° de la zone ≤ +12 °C' },
        { etape: 'Hachage', danger: 'Multiplication microbienne (surface accrue)', type: 'Biologique', mesure: 'CCP — hachage à froid, viande à +2 °C, fabrication à la demande, DLC courte' },
        { etape: 'Charcuterie crue (salaison)', danger: 'Listeria, Salmonella, défaut de salaison', type: 'Biologique', mesure: 'Maîtrise sel/nitrites, pH, aw, durée et T° d\'affinage' },
        { etape: 'Cuisson charcuterie', danger: 'Survie de pathogènes', type: 'Biologique', mesure: 'CCP — cuisson à cœur ≥ 68–70 °C selon produit' },
        { etape: 'Refroidissement charcuterie cuite', danger: 'Germination des spores', type: 'Biologique', mesure: 'CCP — refroidissement rapide +63 → +10 °C en < 2 h' },
        { etape: 'Toutes étapes', danger: 'Allergènes (charcuterie : lait, soja, moutarde, sulfites, gluten)', type: 'Allergène', mesure: 'Étiquetage, fiches recettes, information consommateur' },
        { etape: 'Toutes étapes', danger: 'Corps étrangers (esquilles d\'os, métal, agrafes)', type: 'Physique', mesure: 'Contrôle visuel, parage, état du matériel, détection si applicable' }
      ],
      ccp: [
        { nom: 'CCP 1 — Maîtrise du froid au travail des viandes', limite: 'Viande à +2 °C (hachage) ; zone de travail ≤ +12 °C', surveillance: 'Contrôle T° des chambres et de la zone, T° produit avant hachage', correction: 'Remise au froid, arrêt si dépassement, retrait', verif: 'Étalonnage sondes', enreg: 'Relevés T° + fiche hachage' },
        { nom: 'CCP 2 — Cuisson des charcuteries', limite: 'Cuisson à cœur ≥ 68–70 °C selon produit', surveillance: 'Sonde à cœur en fin de cuisson', correction: 'Prolonger, jeter si doute', verif: 'Étalonnage sonde, relecture fiches', enreg: 'Fiche de cuisson charcuterie' },
        { nom: 'CCP 3 — Refroidissement de la charcuterie cuite', limite: '+63 → +10 °C en moins de 2 h', surveillance: 'Cellule de refroidissement (T°/durée)', correction: 'Jeter si délai dépassé', verif: 'Courbes cellule', enreg: 'Fiche de refroidissement' }
      ]
    },
    temperatures: [
      { denree: 'Carcasses, quartiers, demi-carcasses', valeur: '+7 °C' },
      { denree: 'Viandes découpées', valeur: '+4 °C (+7 °C maximum)' },
      { denree: 'Abats', valeur: '+3 °C' },
      { denree: 'Volailles, lapins, gibier', valeur: '+4 °C' },
      { denree: 'Viandes hachées et préparations de viandes', valeur: '+2 °C' },
      { denree: 'Charcuterie / produits transformés (selon étiquetage)', valeur: '+4 °C' },
      { denree: 'Zone de travail des viandes', valeur: '≤ +12 °C' },
      { denree: 'Surgelés', valeur: '-18 °C' },
      { denree: 'Cuisson charcuterie', valeur: '≥ +68 à +70 °C à cœur' },
      { denree: 'Refroidissement charcuterie cuite', valeur: '+63 → +10 °C en < 2 h' }
    ],
    autocontroles: [
      'Contrôle des températures des chambres froides (par famille) matin et soir',
      'Contrôle à réception (T° des viandes, estampille sanitaire, DLC, traçabilité)',
      'Température de la zone de travail des viandes (≤ +12 °C)',
      'Hachage à froid (viande +2 °C, fabrication à la demande)',
      'Cuisson à cœur des charcuteries',
      'Refroidissement rapide de la charcuterie cuite',
      'Stérilisateur à couteaux (≥ 82 °C)',
      'Gestion et enlèvement des sous-produits animaux (équarrissage)',
      'Étiquetage / allergènes des produits de charcuterie et traiteur',
      'Respect des limites de la dérogation à l\'agrément (quantités / distance) ou tenue de l\'agrément'
    ]
  };

  // ════════════════════════════════════════════════════════════════════════
  // 5) RESTAURATION COLLECTIVE  (clé interne : collective)
  // ════════════════════════════════════════════════════════════════════════
  var COLLECTIVE = {
    label: 'Restauration collective',
    emoji: '🏫',
    activite: 'restauration collective à caractère social (scolaire, petite enfance, EHPAD, hôpital, entreprise, cuisine centrale, portage)',
    references: [
      'Règlement (CE) n° 852/2004 — hygiène des denrées alimentaires',
      'Arrêté du 21 décembre 2009 — températures, plats témoins, remise en température',
      'Règlement (CE) n° 2073/2005 — critères microbiologiques',
      'Règlement (UE) n° 1169/2011 — allergènes',
      'GBPH « Restauration collective à caractère social » (guide validé)',
      'Arrêté du 8 juin 2006 / dispositions sur l\'agrément (cuisine centrale livrant des tiers)'
    ],
    bph: {
      personnel: personnelBase('Restauration collective : plan de formation HACCP de tout le personnel, gestion des effectifs importants, allergies des convives (PAI en milieu scolaire / médical).'),
      locaux: 'Marche en avant stricte. Secteurs séparés : réception/déboîtage, légumerie, préparations froides, cuisson, allotissement, plonge. Cuisine centrale livrant des tiers : agrément sanitaire requis. Liaison froide et/ou chaude maîtrisée. Zone de remise en température dédiée (satellites).',
      nettoyage: planNettoyageBase([
        { zone: 'Légumerie (bac de déboîtage, éplucheuse)', freq: 'Après chaque usage', produit: 'Détergent-désinfectant', methode: 'Nettoyage des bacs, désinfection, séparation des terres' },
        { zone: 'Cellule de refroidissement rapide', freq: 'Quotidien', produit: 'Détergent-désinfectant', methode: 'Nettoyage intérieur, contrôle sonde' },
        { zone: 'Bacs gastronormes, chariots de liaison', freq: 'Après chaque service', produit: 'Détergent-désinfectant + lave-batterie', methode: 'Lavage ≥ 60 °C, désinfection, séchage' },
        { zone: 'Véhicules de livraison (liaison)', freq: 'Quotidien', produit: 'Détergent-désinfectant', methode: 'Nettoyage de la caisse isotherme, contrôle T°' }
      ]),
      nuisibles: 'Plan de lutte contre les nuisibles (3D) formalisé avec prestataire (volume et exigences importants). Plan d\'implantation des postes, rapports d\'intervention archivés, contrôle des réceptions et des quais.',
      eau: 'Eau potable du réseau. Analyses si production propre. Contrôle des fontaines et machines.',
      dechets: 'Tri à la source des biodéchets (obligation), gros volumes. Gestion des emballages et des restes. Collecte des huiles usagées par prestataire agréé.',
      froidChaud: 'Maîtrise rigoureuse de la chaîne du froid et du chaud sur de gros volumes. Liaison froide (refroidissement rapide + stockage ≤ +3 °C + remise en T° à ≥ +63 °C) et/ou liaison chaude (maintien ≥ +63 °C jusqu\'au convive). Plats témoins obligatoires.'
    },
    haccp: {
      champ: champBase('restauration collective à caractère social'),
      equipe: equipeBase(),
      produits: [
        'Repas complets produits en grande quantité (entrées, plats, desserts)',
        'Préparations froides (hors-d\'œuvre, salades, desserts lactés)',
        'Préparations chaudes (plats cuisinés, sauces, viandes, poissons)',
        'Produits en liaison froide (refroidis puis remis en température)',
        'Produits en liaison chaude (maintenus ≥ 63 °C)',
        'Régimes spéciaux et textures modifiées (mixés), repas adaptés aux allergies (PAI)'
      ],
      diagramme: [
        'Réception / agréage', 'Stockage (sec / froid positif / froid négatif)',
        'Déconditionnement / légumerie', 'Préparations froides',
        'Cuisson', 'Refroidissement rapide (liaison froide)',
        'Stockage tampon ≤ +3 °C', 'Allotissement / conditionnement',
        'Transport (liaison froide / chaude)', 'Remise en température (satellites)',
        'Maintien et distribution', 'Prélèvement des plats témoins'
      ],
      dangers: [
        { etape: 'Réception / agréage', danger: 'Rupture chaîne du froid, non-conformité, DLC', type: 'Biologique', mesure: 'Contrôle T°, DLC, intégrité, agréage documenté, refus si non conforme' },
        { etape: 'Préparations froides', danger: 'Listeria, Salmonella (œufs)', type: 'Biologique', mesure: 'Ovoproduits pasteurisés, T° ≤ +3 °C, fabrication au plus près du service' },
        { etape: 'Cuisson', danger: 'Survie de pathogènes', type: 'Biologique', mesure: 'CCP — cuisson à cœur (≥ 63 °C, volaille ≥ 74 °C, haché ≥ 65 °C)' },
        { etape: 'Refroidissement rapide', danger: 'Germination des spores (gros volumes = risque accru)', type: 'Biologique', mesure: 'CCP — +63 → +10 °C en < 2 h, portions adaptées à la cellule' },
        { etape: 'Stockage tampon / transport', danger: 'Croissance microbienne', type: 'Biologique', mesure: 'CCP — liaison froide ≤ +3 °C tout au long' },
        { etape: 'Remise en température', danger: 'Survie / multiplication', type: 'Biologique', mesure: 'CCP — ≥ +63 °C à cœur en moins d\'1 h, pas de re-refroidissement' },
        { etape: 'Distribution', danger: 'Multiplication microbienne', type: 'Biologique', mesure: 'CCP — maintien chaud ≥ +63 °C / froid ≤ +3 °C, durée limitée' },
        { etape: 'Toutes étapes', danger: 'Allergènes (PAI, convives sensibles)', type: 'Allergène', mesure: 'Plan de maîtrise des allergènes, menus annotés, production dédiée, PAI' },
        { etape: 'Toutes étapes', danger: 'Corps étrangers', type: 'Physique', mesure: 'Contrôle visuel, tamisage, état du matériel, protection éclairage' }
      ],
      ccp: [
        { nom: 'CCP 1 — Cuisson à cœur', limite: 'Volaille ≥ 74 °C ; haché ≥ 65 °C ; autres ≥ 63 °C à cœur', surveillance: 'Sonde à cœur à chaque production sensible', correction: 'Prolonger la cuisson, jeter si doute', verif: 'Étalonnage sondes, relecture', enreg: 'Fiche de cuisson' },
        { nom: 'CCP 2 — Refroidissement rapide (liaison froide)', limite: '+63 → +10 °C en moins de 2 h', surveillance: 'Cellule (T°/durée), portions adaptées', correction: 'Jeter si délai dépassé', verif: 'Courbes cellule', enreg: 'Fiche de refroidissement' },
        { nom: 'CCP 3 — Maintien à froid de la liaison froide', limite: '≤ +3 °C jusqu\'à la remise en température', surveillance: 'Relevés T° (stockage + transport)', correction: 'Retrait, contrôle, destruction si rupture', verif: 'Contrôle thermomètres / enregistreurs', enreg: 'Relevés liaison froide' },
        { nom: 'CCP 4 — Remise en température', limite: '≥ +63 °C à cœur en moins d\'1 h', surveillance: 'Sonde à cœur en satellite', correction: 'Prolonger, jeter si délai dépassé', verif: 'Étalonnage sondes', enreg: 'Fiche de remise en température' },
        { nom: 'CCP 5 — Maintien en distribution', limite: 'Chaud ≥ +63 °C / froid ≤ +3 °C', surveillance: 'Contrôle T° à la distribution', correction: 'Retrait du produit', verif: 'Contrôle thermomètres', enreg: 'Relevé de distribution' }
      ]
    },
    platsTemoins: 'Plats témoins obligatoires : prélèvement d\'un échantillon représentatif (80–100 g) de chaque plat servi, conservé identifié et daté à ≤ +3 °C pendant au moins 5 jours après la dernière présentation au consommateur. Destinés aux analyses en cas de suspicion de TIAC.',
    temperatures: [
      { denree: 'Préparations froides / plats refroidis (liaison froide)', valeur: '0 à +3 °C' },
      { denree: 'Viandes hachées et préparations de viandes', valeur: '+2 °C' },
      { denree: 'Volailles', valeur: '+4 °C' },
      { denree: 'Produits laitiers, desserts lactés', valeur: '+4 °C' },
      { denree: 'Surgelés', valeur: '-18 °C' },
      { denree: 'Cuisson à cœur', valeur: '≥ +63 °C (volaille ≥ +74 °C, haché ≥ +65 °C)' },
      { denree: 'Refroidissement rapide', valeur: '+63 → +10 °C en < 2 h' },
      { denree: 'Liaison froide (stockage + transport)', valeur: '≤ +3 °C' },
      { denree: 'Remise en température', valeur: '≥ +63 °C à cœur en < 1 h' },
      { denree: 'Liaison chaude / maintien distribution', valeur: '≥ +63 °C' },
      { denree: 'Plats témoins', valeur: '≤ +3 °C — conservés 5 jours minimum' }
    ],
    autocontroles: [
      'Contrôle des températures des enceintes (matin et soir, gros volumes)',
      'Agréage à réception (T°, DLC, intégrité, documents)',
      'Cuisson à cœur des plats sensibles',
      'Refroidissement rapide (courbes cellule)',
      'Liaison froide : T° de stockage et de transport (enregistreurs)',
      'Remise en température (≥ 63 °C à cœur)',
      'Maintien en distribution',
      'Prélèvement et conservation des plats témoins (5 jours, ≤ +3 °C)',
      'Plan de maîtrise des allergènes / PAI',
      'Analyses microbiologiques périodiques (selon volume / convives sensibles)',
      'Plan de nettoyage et de désinfection émargé',
      'Nettoyage et contrôle T° des véhicules de liaison'
    ]
  };

  // ── Assemblage final + parties communes (III) attachées à chaque secteur ──
  var PMS_SECTEURS = { resto: RESTO, bp: BP, rapide: RAPIDE, boucherie: BOUCHERIE, collective: COLLECTIVE };
  Object.keys(PMS_SECTEURS).forEach(function (k) {
    PMS_SECTEURS[k].cle = k;
    PMS_SECTEURS[k].allergenes = ALLERGENES_14;
    PMS_SECTEURS[k].tracabilite = TRACABILITE;
    PMS_SECTEURS[k].nonConformites = NON_CONFORMITES;
    PMS_SECTEURS[k].retraitRappel = RETRAIT_RAPPEL;
  });

  // Exposition globale
  if (typeof window !== 'undefined') {
    window.PMS_SECTEURS = PMS_SECTEURS;
    window.PMS_ALLERGENES_14 = ALLERGENES_14;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PMS_SECTEURS: PMS_SECTEURS, ALLERGENES_14: ALLERGENES_14 };
  }
})();
