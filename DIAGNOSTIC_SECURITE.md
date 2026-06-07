# Diagnostic technique & réglementaire — HACCP17-FACILE (HACCP Pro)

> Analyse du code réel (`script.js`, `index.html`, `sw.js`, `patch_photo_bl.js`) — branche `claude/finalize-two-applications-PoqdU`.
> Backend : Supabase (projet `kiknaxuzpovvivkjqzss`). Frontend : PWA statique (GitHub Pages).
> Date : 2026-06-07.

---

## ⛔ Synthèse — le point central

L'application **n'a pas d'authentification réelle ni de cloisonnement serveur**. Tout passe par **une seule clé `anon` partagée par tous les clients**, et l'isolation des données est faite **uniquement côté navigateur** (un filtre `code_client=eq.…` dans l'URL). Or un filtre côté client n'isole rien : il suffit d'ouvrir la console pour le retirer.

Tant que ce point n'est pas corrigé, **les 4 risques CRITIQUES ci-dessous sont tous exploitables par n'importe quel utilisateur** avec la console du navigateur. C'est le chantier prioritaire avant toute mise en ligne commerciale.

---

## 1. CRITIQUE — Fuite / falsification de données entre clients

### C1. Aucun cloisonnement multi-locataire côté serveur
- **Constat** : toutes les lectures/écritures utilisent `SUPABASE_ANON` (`script.js:31`) en REST direct. Le tenant est filtré dans l'URL côté client, ex. `controles_haccp?code_client=eq.<ETAB_ID>` (`script.js:294`, `11584+`).
- **Preuve dans votre propre code** : la routine de diagnostic interroge `controles_haccp?select=id,code_client,module,date_controle&limit=5` **sans aucun filtre** et journalise « N contrôle(s) lisible(s) au total » (`script.js:321-330`). Si ce log renvoie > 0, c'est que la clé anon lit **tous les clients**.
- **Exploit** (depuis la console de n'importe quel client) :
  ```js
  fetch(SUPABASE_URL+'/rest/v1/controles_haccp?select=*',
    {headers:{apikey:SUPABASE_ANON, Authorization:'Bearer '+SUPABASE_ANON}})
    .then(r=>r.json()).then(console.log) // dump de TOUS les établissements
  ```
- **Aggravant structurel** : la RLS seule ne peut pas sauver l'architecture actuelle, car la clé `anon` est **identique pour tout le monde** → Postgres ne peut pas distinguer le client A du client B. Une policy RLS ne pourrait être que « tout autoriser » ou « tout refuser ». **Il faut une vraie identité par établissement.**

**Correctif (chantier de fond, recommandé) :**
1. Passer à **Supabase Auth** : un compte (email + mot de passe ou magic link) par établissement, ou une table `memberships(user_id, establishment_id)`.
2. Ajouter `establishment_id uuid` (FK) sur `controles_haccp`, `enregistrements`, `etablissements`, etc.
3. Activer **RLS** sur chaque table avec une policy d'isolation, ex. :
   ```sql
   alter table controles_haccp enable row level security;

   create policy tenant_select on controles_haccp for select
     using (establishment_id = (auth.jwt() ->> 'establishment_id')::uuid);
   create policy tenant_insert on controles_haccp for insert
     with check (establishment_id = (auth.jwt() ->> 'establishment_id')::uuid);
   -- idem update/delete (ou pas de delete : voir C/MAJEUR intégrité)
   ```
4. Le client envoie le **JWT utilisateur** (pas l'anon) → `Authorization: Bearer <session.access_token>`.

> Solution de transition rapide si Auth n'est pas possible tout de suite : router toutes les requêtes via des **Edge Functions / RPC `security definer`** qui dérivent le `establishment_id` d'un jeton signé serveur, et **fermer l'accès REST direct** aux tables (RLS `deny all` pour anon). Le navigateur ne touche plus jamais les tables en direct.

### C2. Identifiants en clair, vérifiés côté navigateur
- **Constat** : le login fait `GET etablissements?code_acces=eq.X` puis compare en JS `etab.mot_de_passe !== pwd` (`script.js:419,453`). Le **mot de passe est en clair en base et renvoyé au navigateur**.
- **Exploit** :
  ```js
  fetch(SUPABASE_URL+'/rest/v1/etablissements?select=code_acces,mot_de_passe,nom',
    {headers:{apikey:SUPABASE_ANON,Authorization:'Bearer '+SUPABASE_ANON}})
  // → dump de TOUS les codes d'accès + mots de passe de tous les clients
  ```
- **Aggravant** : identifiants en dur dans le source — `CODES_LOCAUX` avec mots de passe (`script.js:16-22`) et `ADMIN_PASSWORD: '826700'`, `ADMIN_EMAIL` (`script.js:555`).
- **Correctif** : mots de passe **jamais** en base en clair ni renvoyés au client → délégués à Supabase Auth (hash bcrypt géré par GoTrue). Retirer tous les secrets en dur du bundle. Vérification du mot de passe **côté serveur uniquement**.

### C3. Photos de traçabilité publiques et non signées
- **Constat** : bucket `haccp-photos`, URL **publique** `…/storage/v1/object/public/…` (`script.js:180`). Nom de fichier = `ETAB_ID_source_timestamp_random` (`script.js:129-153`) → `ETAB_ID` = le code d'accès, devinable.
- **Risque** : bons de livraison, étiquettes, plaques de véhicules, **signatures** → accessibles/énumérables sans authentification.
- **Correctif** :
  1. Bucket en **privé** (non public).
  2. RLS Storage par préfixe d'établissement.
  3. Servir les images via **URL signées** à durée courte :
     ```js
     const { data } = await sb.storage.from('haccp-photos')
       .createSignedUrl(path, 60); // 60 s
     ```
  4. Préfixer les chemins par `establishment_id/…` (et non par le code d'accès).

### C4. Enregistrements modifiables/supprimables après coup (intégrité)
- **Constat** : l'app fait des `PATCH controles_haccp?id=eq.<id>` arbitraires pour rattacher les photos (`script.js:360-369`). Avec la clé anon, **n'importe qui peut PATCH/DELETE n'importe quelle ligne** si la RLS l'autorise — donc réécrire un contrôle signé. Le commentaire de réconciliation mentionne d'ailleurs « 401/403 = RLS bloque l'écriture » (`script.js:19333-19339`), ce qui suggère que les écritures anon sont aujourd'hui ouvertes.
- **Enjeu HACCP** : une preuve réglementaire doit être **infalsifiable / append-only**.
- **Correctif** : pas de `DELETE`/`UPDATE` client sur les contrôles signés (RLS `insert only`). Si une correction est nécessaire → nouvelle ligne « rectificative » horodatée serveur, l'originale reste. Idéalement, sceller chaque contrôle (hash du contenu + signature + horodatage serveur) stocké en colonne non modifiable.

---

## 2. MAJEUR — Bugs bloquants / non-conformité RGPD-HACCP

### M1. Horodatage falsifiable (heure du téléphone)
- **Constat** : `date_controle: new Date().toISOString()` = **horloge de l'appareil** (`script.js:19211`, `14316`, `20331`). Reculer/avancer l'heure du téléphone falsifie la date du contrôle.
- **Correctif** : laisser Postgres remplir l'horodatage : colonne `recorded_at timestamptz not null default now()` et **ne pas l'envoyer depuis le client** (ou colonne serveur séparée infalsifiable, en gardant la date « déclarée » à part). Pour DDPP, c'est `recorded_at` (serveur) qui fait foi.

### M2. Signatures non scellées
- **Constat** : la signature est une simple chaîne/dataURL dans la colonne `signature` + `contenu` (`script.js:19209`), sans hachage ni lien cryptographique au contenu. Couplé à C4, le contenu reste modifiable après signature.
- **Correctif** : au moment de signer, calculer un hash (`sha-256`) de `{contenu + signataire + recorded_at}` côté serveur (trigger/RPC) et le stocker en colonne non modifiable → toute altération ultérieure devient détectable.

### M3. Rattachement photo ↔ contrôle par fenêtre temporelle (preuve mal étiquetée)
- **Constat** : `lierPhotoAuControle` cherche le contrôle par `module ilike` + fenêtre `-5 min / +2 h` et prend le **premier** (`script.js:288-300`). Deux réceptions dans la même fenêtre → la photo peut être collée au **mauvais** contrôle.
- **Correctif** : rattacher la photo par **identifiant explicite** du contrôle (id retourné à la création via `Prefer: return=representation`), pas par heuristique temporelle.

### M4. Conformité RGPD
- **Hébergement / localisation** : à **vérifier dans le dashboard Supabase** que le projet `kiknaxuzpovvivkjqzss` est en **région UE** (`eu-central-1` / `eu-west-…`). Non vérifiable depuis le code — à confirmer et documenter (sous-traitant + clauses).
- **Données personnelles exposées** : noms d'employés + signatures dans des photos/URLs publiques (cf. C3) = manquement à l'art. 32 (« mesures appropriées »). Mots de passe en clair (C2) = idem.
- **Droit à l'oubli / résiliation** : **aucune** procédure de suppression définitive (contrôles + médias Storage) trouvée dans le code. À créer (purge `controles_haccp` + `enregistrements` + objets Storage du tenant).
- **Durée de conservation** : aucun mécanisme de purge. Le pied de page du Pack DDPP indique « conserver 3 ans » (`script.js:13080`) mais rien n'expire en base → conservation indéfinie. Prévoir un job de purge (Supabase cron / `pg_cron`) selon la durée légale retenue (typiquement contrôles T°/traçabilité : conservation de l'ordre de l'année en cours + N).
- **Registre des traitements** : voir tableau dédié plus bas.

---

## 3. MINEUR — Performance / UX / robustesse

- **m1. Pack DDPP — mémoire mobile** : le Pack rend **toutes** les photos de la période en `<img>` dans le DOM puis impression navigateur (jsPDF est désactivé, `script.js:2085,3145`). Pas de crash jsPDF, mais sur iPhone, des centaines de photos → pages blanches / saturation mémoire. **Correctif** : paginer/limiter (lazy-load, miniatures, plafonner la résolution d'export, ou générer par lots).
- **m2. Compression** : `compresserPhoto` (maxW 1280, JPEG 0.82, `script.js:5952-5967`) est bien fait — mais vérifier que **tous** les chemins d'upload passent par lui (la file Dexie stocke du base64 ; un chemin non compressé saturerait Storage/quota).
- **m3. Double init Supabase** : deux clients créés avec deux clés différentes (`script.js:34` avec `SUPABASE_ANON`, `script.js:562` avec `sb_publishable_…`). Code mort / source de confusion → en garder un seul.
- **m4. Session** : 12 h (payant) / 16 j (essai) (`script.js:3170`). Le risque « déconnexion en plein service » est correctement couvert (12 h ≈ un service complet). À garder, mais l'expiration ne se prolonge qu'à la reconnexion — OK.
- **m5. Offline** : bien géré globalement — file photos Dexie/IndexedDB (`script.js:53-66`), polling 5 s + relance `online` (`script.js:389-404`), réconciliation contrôles toutes les 60 s (`script.js:19279+`). Robuste. Seule réserve : la réconciliation déduplique par `pageId|timestamp|signataire` (`script.js:19299,19322`) — si l'utilisateur fait deux contrôles identiques à la même minute, l'un peut être considéré comme doublon.

---

## 📋 Registre des traitements (données collectées — base de départ)

| Donnée | Où | Catégorie | Remarque |
|---|---|---|---|
| Email établissement / admin | `etablissements`, config | Identification | `ADMIN_EMAIL` en dur à retirer |
| Code d'accès + mot de passe | `etablissements` (clair ⚠️) | Authentification | À hacher / déléguer à Auth |
| Nom commercial, SIRET, adresse | `etablissements` | Établissement | — |
| Nom / prénom signataire | `controles_haccp.contenu`, `signe_par` | Donnée perso employé | — |
| Signature manuscrite (image) | `signature`, Storage | **Donnée perso sensible** | URLs publiques ⚠️ |
| Photos (BL, étiquettes, véhicules) | Storage `haccp-photos` (public ⚠️) | Peut contenir données perso | Passer en signé |
| Horodatages de contrôle | `date_controle` | Preuve réglementaire | Horloge client ⚠️ |
| Email (EmailJS souscription) | EmailJS | Prospection/contrat | Clés en clair dans le bundle |
| IP / logs | Supabase (côté infra) | Technique | À mentionner dans le registre |

---

## ✅ Ordre de traitement conseillé

1. **C1 + C2** (cloisonnement + auth) — c'est le même chantier : Supabase Auth + RLS. Tout le reste en dépend.
2. **C3 + C4** (Storage privé/signé + écriture append-only).
3. **M1 + M2** (horodatage serveur + scellement signature).
4. **M4** (purge RGPD, procédure droit à l'oubli, confirmer région UE).
5. **M3 / mineurs** (fiabilité preuve, perf Pack DDPP).
