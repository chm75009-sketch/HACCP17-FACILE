# Robots de test — HACCP Pro

Tests automatiques qui rejouent l'application comme de vrais clients, pour
vérifier qu'aucune modification ne casse quoi que ce soit.

## Lancer tous les tests
```
cd tests
node run_tests.js    # Gestion clients (admin) : créer/modifier/supprimer/sélection
node run_tests2.js   # Secteurs, températures, photos, dictée vocale
node run_tests3.js   # Catalogues, fmtTemp, actions correctives, impressions
node run_tests4.js   # DLC étiquettes, huiles, refroidissement, cloisonnement
node run_tests5.js   # Hors-ligne / anti-perte : éviction, réconciliation cloud
node run_tests6.js   # Signatures obligatoires + propagation payload cloud
node run_tests7.js   # Pack DDPP / rapports par période (sélection des contrôles)
node run_tests8.js   # Traçabilité (lots/fournisseurs) + gestion d'équipe (anti-écrasement)
node run_tests9.js   # Connexion (local + hors-ligne 7j) + quota stockage (preuves protégées)
```
Chaque fichier affiche « X passed, Y failed ». Tout doit être à 0 failed.

## Fichiers
- `harness.js`   : faux Supabase + faux DOM pour la gestion clients (admin)
- `load_app.js`  : charge tout script.js dans un navigateur simulé
- `run_tests*.js`: les scénarios

Couverture actuelle : 431 scénarios, 0 échec.
