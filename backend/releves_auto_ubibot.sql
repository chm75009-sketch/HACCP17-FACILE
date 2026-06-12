-- ════════════════════════════════════════════════════════════════════════
--  BRIQUE 1 — RELEVÉ AUTOMATIQUE DES TEMPÉRATURES (capteurs UbiBot)
--  HACCP Pro — enregistrement serveur, même application fermée
-- ════════════════════════════════════════════════════════════════════════
--  But : aux heures réglées par le client (config « __sondes_config__ »), le
--  SERVEUR lit la température du/des capteur(s) UbiBot et écrit une preuve
--  dans controles_haccp (module « Températures enceintes »). Le relevé
--  apparaît alors dans « Mes Rapports » et le « Pack DDPP », sans aucune
--  action du client. Le serveur n'a pas la limite « CORS » du navigateur :
--  c'est pour ça que cette lecture marche côté serveur alors que le bouton
--  « Lire » du téléphone ne le peut pas.
--
--  Mécanique : pg_cron + pg_net (comme la purge photos). pg_net est ASYNCHRONE
--  → on procède en 2 temps :
--    1) ubibot_lancer_releves()  : envoie la requête HTTP vers l'API UbiBot.
--    2) ubibot_traiter_reponses(): quand la réponse est arrivée, lit la T° et
--       insère le contrôle. Un « tick » toutes les 5 min enchaîne les deux.
--
--  ⚠️ À coller dans Supabase → SQL Editor, dans l'ordre (étapes 1 à 6).
--  ⚠️ Aucune clé Supabase nécessaire : la fonction est « security definer »
--     et insère directement. Seule la clé de COMPTE UbiBot est utilisée, et
--     elle est déjà stockée par établissement dans « __sondes_config__ ».
-- ════════════════════════════════════════════════════════════════════════


-- ── ÉTAPE 1 — Extensions ────────────────────────────────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;


-- ── ÉTAPE 2 — File d'attente des lectures (requête → réponse) ───────────
create table if not exists public.ubibot_lectures (
  id               bigserial primary key,
  request_id       bigint      not null,          -- id renvoyé par net.http_get
  code_client      text        not null,
  establishment_id uuid,
  sondes           jsonb       not null,          -- copie des sondes au moment du relevé
  slot             text        not null,          -- créneau réglé (ex. '08:00')
  jour             date        not null default current_date,
  cree_le          timestamptz not null default now(),
  traite           boolean     not null default false
);

-- Un seul relevé par établissement / créneau / jour (anti-doublon).
create unique index if not exists ubibot_lectures_uniq
  on public.ubibot_lectures (code_client, slot, jour);


-- ── ÉTAPE 3 — Lancer les lectures dues (phase 1) ───────────────────────
create or replace function public.ubibot_lancer_releves()
returns integer
language plpgsql
security definer
set search_path = public, net
as $$
declare
  cfg        record;
  v_key      text;
  v_sondes   jsonb;
  v_heures   jsonb;
  v_heure    text;
  v_local    timestamptz := now();
  v_hts      timestamptz;
  v_reqid    bigint;
  n          integer := 0;
begin
  -- Dernière config « __sondes_config__ » de CHAQUE établissement
  for cfg in
    select distinct on (code_client)
           code_client, establishment_id, contenu
    from public.controles_haccp
    where module = '__sondes_config__'
    order by code_client, created_at desc
  loop
    v_key    := cfg.contenu->>'ubibotKey';
    v_sondes := cfg.contenu->'sondes';
    v_heures := coalesce(cfg.contenu#>'{releves,heures}', '["08:00","18:00"]'::jsonb);

    -- Rien à faire si pas de clé ou pas de sonde
    if v_key is null or v_key = '' or v_sondes is null or jsonb_array_length(v_sondes) = 0 then
      continue;
    end if;

    -- Pour chaque créneau réglé, on déclenche si l'heure locale (France) est
    -- dans la fenêtre [heure ; heure + 9 min) et qu'on ne l'a pas déjà fait.
    for v_heure in select jsonb_array_elements_text(v_heures)
    loop
      if v_heure !~ '^[0-2][0-9]:[0-5][0-9]$' then continue; end if;

      v_hts := (current_date::text || ' ' || v_heure)::timestamp at time zone 'Europe/Paris';

      if (v_local at time zone 'Europe/Paris') >= (v_hts at time zone 'Europe/Paris')
         and v_local < v_hts + interval '9 minutes'
         and not exists (
           select 1 from public.ubibot_lectures
           where code_client = cfg.code_client and slot = v_heure and jour = current_date
         )
      then
        -- Requête HTTP asynchrone vers l'API UbiBot (clé de compte du client)
        select net.http_get(
          url := 'https://api.ubibot.com/channels?account_key=' || v_key
        ) into v_reqid;

        insert into public.ubibot_lectures
          (request_id, code_client, establishment_id, sondes, slot, jour)
        values
          (v_reqid, cfg.code_client, cfg.establishment_id, v_sondes, v_heure, current_date)
        on conflict (code_client, slot, jour) do nothing;

        n := n + 1;
      end if;
    end loop;
  end loop;

  return n;
end;
$$;


-- ── ÉTAPE 4 — Traiter les réponses arrivées (phase 2) ──────────────────
create or replace function public.ubibot_traiter_reponses()
returns integer
language plpgsql
security definer
set search_path = public, net
as $$
declare
  lec       record;
  resp      record;
  body      jsonb;
  chans     jsonb;
  sonde     jsonb;
  ch        jsonb;
  lv        jsonb;
  v_temp    numeric;
  v_min     numeric;
  v_max     numeric;
  v_nc      boolean;
  v_isNC    boolean;
  v_ncdet   text;
  v_temps   jsonb;        -- tableau contenu.temperatures
  v_estab   uuid;
  n         integer := 0;
begin
  for lec in
    select * from public.ubibot_lectures
    where traite = false
      and cree_le > now() - interval '2 hours'   -- on abandonne les vieilles
    order by id
  loop
    -- Réponse pg_net correspondante (peut ne pas être encore arrivée)
    select status_code, content into resp
    from net._http_response
    where id = lec.request_id;

    if not found then
      continue;  -- pas encore de réponse → on réessaiera au prochain tick
    end if;

    -- Réponse arrivée : qu'elle soit OK ou non, on marque la ligne traitée
    update public.ubibot_lectures set traite = true where id = lec.id;

    if resp.status_code is null or resp.status_code <> 200 or resp.content is null then
      continue;  -- erreur réseau / clé : on ne crée pas de faux relevé
    end if;

    begin
      body  := resp.content::jsonb;
    exception when others then
      continue;
    end;
    chans := coalesce(body->'channels', body->'data', '[]'::jsonb);

    v_temps := '[]'::jsonb;
    v_nc    := false;
    v_ncdet := '';

    -- Pour chaque sonde associée, retrouver son canal et lire field1 (T°)
    for sonde in select * from jsonb_array_elements(lec.sondes)
    loop
      v_temp := null;
      v_min  := nullif(sonde->>'min','')::numeric;
      v_max  := nullif(sonde->>'max','')::numeric;

      -- Canal correspondant (channel_id = sonde.channel)
      select c into ch
      from jsonb_array_elements(chans) as c
      where (c->>'channel_id') = (sonde->>'channel')
      limit 1;

      if ch is not null then
        -- last_values est une CHAÎNE JSON → on la re-parse
        begin
          lv := (ch->>'last_values')::jsonb;
        exception when others then
          lv := null;
        end;
        -- Champ température : field1 (capteur intégré WS1 Pro) par défaut,
        -- ou le champ indiqué par la sonde (ex. field3 = sonde externe).
        if lv is not null then
          v_temp := nullif(lv #>> array[coalesce(sonde->>'champ','field1'),'value'], '')::numeric;
        end if;
      end if;

      if v_temp is not null then
        v_isNC := (v_min is not null and v_temp < v_min)
               or (v_max is not null and v_temp > v_max);
        if v_isNC then
          v_nc := true;
          v_ncdet := v_ncdet
            || case when v_ncdet = '' then '' else ' · ' end
            || coalesce(sonde->>'enceinte', sonde->>'nom', 'Enceinte')
            || ' : ' || v_temp::text || '°C (hors seuil)';
        end if;

        v_temps := v_temps || jsonb_build_array(jsonb_build_object(
          'type',      coalesce(sonde->>'enceinte', sonde->>'nom', 'Enceinte'),
          'precision', '',
          'temp',      v_temp::text,
          'conf',      case when v_isNC then 'Non conforme' else 'Conforme' end,
          'isNC',      v_isNC,
          'action',    case when v_isNC then 'Vérifier l''enceinte et le capteur' else '' end,
          'source',    'Capteur UbiBot (automatique)'
        ));
      end if;
    end loop;

    -- Aucune T° lisible → on ne crée pas de relevé vide
    if jsonb_array_length(v_temps) = 0 then
      continue;
    end if;

    -- establishment_id (sécurité / cloisonnement)
    v_estab := lec.establishment_id;
    if v_estab is null then
      select establishment_id into v_estab
      from public.etablissements where code_acces = lec.code_client limit 1;
    end if;

    -- Insertion du contrôle (le trigger pose recorded_at + seal)
    insert into public.controles_haccp
      (code_client, establishment_id, module, contenu, signature, photos,
       date_controle, nc_detectee, nc_details, client_control_id)
    values (
      lec.code_client, v_estab, 'Températures enceintes',
      jsonb_build_object(
        'temperatures', v_temps,
        'signataire',   'Relevé automatique (capteur UbiBot)',
        'signe',        'Relevé automatique (capteur UbiBot)',
        'timestamp',    to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI'),
        'source',       'ubibot',
        'auto',         true
      ),
      null, '[]'::jsonb, now(), v_nc, nullif(v_ncdet,''),
      'ubibot:' || lec.code_client || ':' || lec.slot || ':' || lec.jour::text
    )
    on conflict (code_client, client_control_id) do nothing;

    n := n + 1;
  end loop;

  return n;
end;
$$;


-- ── ÉTAPE 5 — Le « tick » : traite les réponses, puis lance les dues ──────
create or replace function public.ubibot_tick()
returns text
language plpgsql
security definer
set search_path = public, net
as $$
declare a integer; b integer;
begin
  a := public.ubibot_traiter_reponses();   -- réponses du tick précédent
  b := public.ubibot_lancer_releves();     -- nouvelles lectures dues
  return 'reponses_traitees=' || a || ' / lectures_lancees=' || b;
end;
$$;


-- ── ÉTAPE 6 — Planifier le tick toutes les 5 minutes ──────────────────
select cron.schedule(
  'ubibot-releves-auto',
  '*/5 * * * *',
  $$ select public.ubibot_tick(); $$
);


-- ════════════════════════════════════════════════════════════════════════
--  OUTILS DE CONTRÔLE (à coller quand tu veux)
-- ════════════════════════════════════════════════════════════════════════
-- Tester tout de suite (lance + attend ~10 s + traite) :
--   select public.ubibot_lancer_releves();      -- (force : voir variante ci-dessous)
--   select pg_sleep(10);
--   select public.ubibot_traiter_reponses();
--   select * from public.controles_haccp
--     where module='Températures enceintes' and contenu->>'source'='ubibot'
--     order by recorded_at desc limit 5;
--
-- Voir la tâche planifiée :
--   select jobname, schedule, active from cron.job where jobname='ubibot-releves-auto';
--
-- Voir les dernières lectures (file) :
--   select code_client, slot, jour, traite, cree_le from public.ubibot_lectures
--     order by id desc limit 20;
--
-- Désactiver si besoin :
--   select cron.unschedule('ubibot-releves-auto');
--
-- ⚠️ TEST IMMÉDIAT HORS CRÉNEAU : la fonction ne lit le capteur qu'aux heures
--    réglées. Pour forcer un test maintenant, ajoute temporairement l'heure
--    courante dans les « heures » de l'établissement (panneau Capteurs →
--    Relevés automatiques), attends le tick (≤ 5 min), ou exécute :
--      do $$ declare r bigint;
--      begin
--        select net.http_get('https://api.ubibot.com/channels?account_key=' ||
--          (select contenu->>'ubibotKey' from controles_haccp
--             where module='__sondes_config__' order by created_at desc limit 1)) into r;
--        insert into ubibot_lectures(request_id, code_client, sondes, slot, jour)
--          select r, code_client, contenu->'sondes', to_char(now() at time zone 'Europe/Paris','HH24:MI'), current_date
--          from controles_haccp where module='__sondes_config__' order by created_at desc limit 1;
--      end $$;
--      select pg_sleep(10); select public.ubibot_traiter_reponses();
-- ════════════════════════════════════════════════════════════════════════
