# HACCP Pro — À faire (notes)

## En cours
- **Simplification de la navigation** (sans rien casser) :
  1. Bouton « ← Retour » toujours visible (ne plus avoir à remonter). ← *en cours*
  2. Bouton « ↑ Haut » flottant sur les longues pages.
  3. Vérifier/renforcer le bouton « précédent » du téléphone (popstate).

## Tableau de bord « Ce qu'il y a à faire »
- ✅ **V1 — Quotidien (fait)** : panneau « 📋 À faire aujourd'hui » sur l'accueil, sous le
  baromètre. Liste les contrôles quotidiens DDPP du secteur, ✅ fait / ⬜ à faire détecté
  automatiquement via `haccp_historique` (hors-ligne). Les contrôles à faire restent en
  évidence (rouge) tant qu'ils ne sont pas réalisés. Clic → ouvre le module.
- ⏳ **V2 — à venir** : tâches **périodiques** (hebdo/mensuel/trimestriel) avec **dates
  d'échéance**, **cases à cocher manuelles** (pour les tâches sans contrôle dédié, ex.
  vérif contrat dératisation), et **alerte persistante** tant que non cochée.
  ⚠️ Vérifier les fréquences réglementaires par secteur AVANT de les coder (cf. ci-dessous).

### Détails V2 — Tableau de bord « Ce qu'il y a à faire »
À l'ouverture de l'app, afficher un **tableau de bord** qui dit ce qu'il faut faire,
basé sur le **PMS**, la **réglementation** et l'**HACCP** :
- Tâches **quotidiennes** et **périodiques** (hebdo / mensuel / trimestriel…), avec **dates**.
- **Planning** clair par secteur (ex. boulangerie : tester le **refroidissement de 2–3 articles
  une fois par trimestre** — *À VÉRIFIER dans la réglementation avant de coder*).
- **Alerte** affichée tant que la tâche n'est pas faite : **case à cocher « fait »** ;
  si non cochée, l'alerte **reste affichée** (rappel persistant).

> Vérifier les obligations exactes par secteur (resto trad, rapide, boulangerie/pâtisserie…)
> avant d'inscrire des fréquences en dur. Sourcer (PMS / guides de bonnes pratiques / arrêtés).
