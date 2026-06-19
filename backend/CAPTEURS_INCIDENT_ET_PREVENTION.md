# Capteurs UbiBot — Incident du 19/06/2026, correctif & PRÉVENTION

> Note durable (à NE PAS oublier). Tout le système de relevé automatique des
> températures vit côté serveur Supabase (projet HACCP Pro = `kiknaxuzpovvivkjqzss`).
> Fichier de référence du moteur : `backend/releves_auto_ubibot.sql` (le re-lancer
> en entier restaure tout — prouvé le 19/06/2026).

## 1. Ce qui s'est passé (incident du 19/06/2026)
Le relevé automatique des températures ne remontait plus. **Deux causes cumulées**, toutes deux côté serveur (rien à voir avec les déploiements front-end) :

1. **Réglage capteur sur « externe »** alors qu'aucune sonde externe n'était branchée.
   → le moteur lisait des champs vides (EXT1/EXT2/RS485, datés 2018) et enregistrait
   « Capteur hors ligne » au lieu de la vraie température (capteur intégré = `field1`).

2. **Les fonctions du moteur avaient disparu de la base** (`ubibot_traiter_reponses`
   notamment) → la tâche planifiée `ubibot-releves-auto` (chaque minute) tournait dans
   le vide → plus aucun relevé.

### Cause de la disparition des fonctions — NON prouvée
Enquête menée (19/06) :
- Pas de migrations Supabase (`supabase_migrations.schema_migrations` n'existe pas)
  → exclut une reconstruction de schéma par migration.
- Aucune tâche cron destructrice (seules : `purge_controles_3ans`, `ubibot-surveillance`,
  `ubibot-releves-auto`).
- Pas un reset complet (les données + `ubibot_surveiller`/`supervision_capteurs` ont survécu).
- Pas d'historique cron (`cron.job_run_details` absent — vieille version de pg_cron) → pas de datation.

➡️ **Conclusion probable (non certaine)** : suppression **manuelle** des fonctions
(SQL tapé à la main pendant la mise en place « test capteur vendredi » : script joué
partiellement, ou un `drop` resté dans un onglet et ré-exécuté).
**Preuve définitive possible uniquement dans les Postgres Logs du tableau de bord**
(chercher `drop function` / `ubibot`).

## 2. Correctif appliqué le 19/06/2026 (déjà fait)
1. Réglage capteur repassé en **interne (`field1`)** :
   ```sql
   update controles_haccp
   set contenu = jsonb_set(
         jsonb_set(contenu::jsonb, '{sondes,0,champ}', '""'::jsonb, true),
         '{maj}', to_jsonb((extract(epoch from now())*1000)::bigint), true)
   where id = (select id from controles_haccp where module='__sondes_config__'
               order by created_at desc limit 1);
   ```
2. **Moteur réinstallé** en relançant `backend/releves_auto_ubibot.sql` en entier
   (tâche planifiée recréée, jobid courant).
   → Vérifié : relevé `27.6°C`, `hors_ligne = false`. ✅

## 3. PRÉVENTION — pour que ça ne se reproduise PLUS (à mettre en place)

### (1) Garde-fou : bloquer la suppression accidentelle des fonctions  ⬅️ À APPLIQUER
N'empêche PAS les mises à jour `create or replace` ; bloque seulement un vrai `DROP`.
```sql
create or replace function public.guard_protege_capteurs()
returns event_trigger language plpgsql as $$
declare obj record;
begin
  for obj in select * from pg_event_trigger_dropped_objects() loop
    if obj.object_type = 'function'
       and obj.object_identity ~* '(ubibot_tick|ubibot_lancer_releves|ubibot_traiter_reponses|ubibot_surveiller)'
    then
      raise exception 'PROTECTION : suppression de "%" bloquée. Pour la retirer volontairement, faites d''abord : drop event trigger trg_protege_capteurs;', obj.object_identity;
    end if;
  end loop;
end; $$;

drop event trigger if exists trg_protege_capteurs;
create event trigger trg_protege_capteurs on sql_drop
  execute function public.guard_protege_capteurs();
```

### (2) Alerte si les relevés s'arrêtent  ⬅️ À VÉRIFIER
La tâche `ubibot-surveillance` (#5, horaire) appelle `ubibot_surveiller()` (fonction
présente). **À confirmer** : qu'elle crée bien une alerte VISIBLE dans les rapports
quand un capteur devient muet → un arrêt se voit en 1 h, pas en 3 jours.

### (3) Discipline (vraie cause de l'incident)
- Toute la logique base = fichiers `backend/*.sql` (déjà le cas).
- Ne lancer QUE ces fichiers, EN ENTIER ; jamais des bouts à la main.
- Jamais de `drop` qui traîne dans un onglet SQL sur la prod.
- Idéal (avec un développeur) : passer en **migrations Supabase** → schéma versionné, inviolable.

## 4. Rappels utiles
- Lecture par capteur (clé stable, pas la clé de compte fragile « force_log_off ») :
  `https://api.ubibot.com/channels/{channel_id}?api_key={cle_de_lecture}`
- Température = `field1` (capteur intégré WS1 Pro). Champ « externe » seulement si une
  vraie sonde déportée est branchée.
- Le panneau capteurs « manuel » de l'app (caché `#capteurs`) est bloqué par le navigateur
  (CORS) — non utilisé : c'est le relevé AUTOMATIQUE serveur qui fait le travail.
- Seuils de test actuels : -25/-18 (congélateur). À régler selon l'enceinte réelle.

## 5. Autres chantiers en attente (pour mémoire)
- **Sécurité ExpertAudit** (dépôt `audit-haccp3bis`, projet Supabase `zdwdeavcwivvdtrjqwme`) :
  en pause. Risques connus : clé anon lit/écrit `demandes`, `codes`, `audits`, `prospects`
  sans RLS ; mot de passe admin en clair (`826700`). À reprendre avec accès Supabase, et
  à faire valider par un développeur humain avant commercialisation.
