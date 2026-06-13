-- ════════════════════════════════════════════════════════════════════════
--  BRIQUE 1 — RELEVÉ AUTOMATIQUE DES TEMPÉRATURES (capteurs UbiBot)
--  HACCP Pro — enregistrement serveur, même application fermée
--  (v2 — utilise la « clé de lecture API » UbiBot, par canal : permanente,
--   pas de déconnexion « force_log_off » comme l'account_key de session)
-- ════════════════════════════════════════════════════════════════════════
--  But : aux heures réglées par le client (config « __sondes_config__ »), le
--  SERVEUR lit la température du/des capteur(s) UbiBot et écrit une preuve
--  dans controles_haccp (module « Températures enceintes »). Apparaît dans
--  « Mes Rapports » et le « Pack DDPP », sans action du client.
--
--  Clé : « clé de lecture API » générée par canal dans la console UbiBot
--  (Paramètres du canal → API → « Clé de lecture API »). Stockée dans la
--  config (__sondes_config__.ubibotKey). Adresse lue, par capteur :
--    https://api.ubibot.com/channels/{channel_id}?api_key={cle_de_lecture}
--  Réponse : { "result":"success", "channel": { "channel_id", "last_values", … } }
--  Température = field1 (capteur intégré WS1 Pro).
--
--  Mécanique : pg_cron + pg_net (asynchrone) → 2 temps : lancer la requête,
--  puis traiter la réponse quand elle arrive. « tick » toutes les 5 minutes.
-- ════════════════════════════════════════════════════════════════════════


-- ── ÉTAPE 1 — Extensions ────────────────────────────────────────────────
create extension if not exists pg_cron;
create extension if not exists pg_net;


-- ── ÉTAPE 2 — File d'attente des lectures (une requête PAR capteur) ─────
create table if not exists public.ubibot_lectures (
  id               bigserial primary key,
  request_id       bigint      not null,
  code_client      text        not null,
  establishment_id uuid,
  sondes           jsonb       not null,    -- la sonde concernée (1 élément)
  channel          text,                    -- canal interrogé
  slot             text        not null,    -- créneau réglé (ex. '08:00')
  jour             date        not null default current_date,
  cree_le          timestamptz not null default now(),
  traite           boolean     not null default false
);
-- 1 lecture par établissement / capteur / créneau / jour
alter table public.ubibot_lectures add column if not exists channel text;
drop index if exists public.ubibot_lectures_uniq;
create unique index if not exists ubibot_lectures_uniq
  on public.ubibot_lectures (code_client, channel, slot, jour);


-- ── ÉTAPE 3 — Lancer les lectures dues (phase 1) ───────────────────────
create or replace function public.ubibot_lancer_releves()
returns integer
language plpgsql
security definer
set search_path = public, net
as $$
declare
  cfg      record;
  v_key    text;
  v_sondes jsonb;
  v_heures jsonb;
  v_heure  text;
  sonde    jsonb;
  v_chan   text;
  v_skey   text;
  v_local  timestamptz := now();
  v_jour   date := (now() at time zone 'Europe/Paris')::date;  -- DATE DE PARIS (pas UTC)
  v_hts    timestamptz;
  v_reqid  bigint;
  n        integer := 0;
begin
  for cfg in
    select distinct on (code_client)
           code_client, establishment_id, contenu
    from public.controles_haccp
    where module = '__sondes_config__'
    order by code_client, created_at desc
  loop
    v_key    := cfg.contenu->>'ubibotKey';   -- clé par défaut (optionnelle)
    v_sondes := cfg.contenu->'sondes';
    v_heures := coalesce(cfg.contenu#>'{releves,heures}', '["08:00","18:00"]'::jsonb);
    if v_sondes is null or jsonb_array_length(v_sondes) = 0 then
      continue;   -- la clé est vérifiée par capteur (v_skey) plus bas
    end if;

    for v_heure in select jsonb_array_elements_text(v_heures)
    loop
      if v_heure !~ '^[0-2][0-9]:[0-5][0-9]$' then continue; end if;
      v_hts := (v_jour::text || ' ' || v_heure)::timestamp at time zone 'Europe/Paris';

      if (v_local at time zone 'Europe/Paris') >= (v_hts at time zone 'Europe/Paris')
         and v_local < v_hts + interval '9 minutes'
      then
        -- une requête de lecture par capteur (clé de lecture = par canal)
        for sonde in select * from jsonb_array_elements(v_sondes)
        loop
          v_chan := sonde->>'channel';
          if v_chan is null or v_chan = '' then continue; end if;
          -- clé de lecture PROPRE au capteur, sinon clé par défaut de l'établissement
          v_skey := coalesce(nullif(sonde->>'cle',''), v_key);
          if v_skey is null or v_skey = '' then continue; end if;
          if exists (
            select 1 from public.ubibot_lectures
            where code_client = cfg.code_client and channel = v_chan
              and slot = v_heure and jour = v_jour
          ) then continue; end if;

          select net.http_get(
            url := 'https://api.ubibot.com/channels/' || v_chan || '?api_key=' || v_skey
          ) into v_reqid;

          insert into public.ubibot_lectures
            (request_id, code_client, establishment_id, sondes, channel, slot, jour)
          values
            (v_reqid, cfg.code_client, cfg.establishment_id,
             jsonb_build_array(sonde), v_chan, v_heure, v_jour)
          on conflict (code_client, channel, slot, jour) do nothing;

          n := n + 1;
        end loop;
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
  lec     record;
  resp    record;
  body    jsonb;
  chan    jsonb;
  lv      jsonb;
  sonde   jsonb;
  v_temp  numeric;
  v_min   numeric;
  v_max   numeric;
  v_isNC  boolean;
  v_estab uuid;
  v_secteur text;
  v_ccid  text;
  v_slot_ts timestamptz;
  n       integer := 0;
begin
  for lec in
    select * from public.ubibot_lectures
    where traite = false and cree_le > now() - interval '2 hours'
    order by id
  loop
    select status_code, content into resp
    from net._http_response where id = lec.request_id;
    if not found then continue; end if;          -- réponse pas encore arrivée

    update public.ubibot_lectures set traite = true where id = lec.id;
    if resp.status_code is null or resp.status_code <> 200 or resp.content is null then
      continue;
    end if;

    begin body := resp.content::jsonb; exception when others then continue; end;
    chan := body->'channel';                     -- réponse clé de lecture = 1 canal
    if chan is null then continue; end if;

    sonde := lec.sondes->0;
    v_min := nullif(sonde->>'min','')::numeric;
    v_max := nullif(sonde->>'max','')::numeric;

    begin lv := (chan->>'last_values')::jsonb; exception when others then lv := null; end;
    if lv is null then continue; end if;

    -- field1 = température (ou champ indiqué par la sonde), arrondie à 0,1 °C
    v_temp := round(nullif(lv #>> array[coalesce(sonde->>'champ','field1'),'value'], '')::numeric, 1);
    if v_temp is null then continue; end if;

    v_isNC := (v_min is not null and v_temp < v_min)
           or (v_max is not null and v_temp > v_max);

    v_estab := lec.establishment_id;
    if v_estab is null then
      select establishment_id into v_estab
      from public.etablissements where code_acces = lec.code_client limit 1;
    end if;
    select secteur into v_secteur
    from public.etablissements where code_acces = lec.code_client limit 1;

    -- heure PROGRAMMÉE du relevé (le créneau) : sert de date du contrôle.
    if lec.slot ~ '^[0-2][0-9]:[0-5][0-9]$' then
      v_slot_ts := (lec.jour::text || ' ' || lec.slot)::timestamp at time zone 'Europe/Paris';
    else
      v_slot_ts := now();   -- tests forcés (slot 'TEST-…') : pas d'heure programmée
    end if;

    -- anti-doublon robuste (sans dépendre d'une contrainte ON CONFLICT)
    v_ccid := 'ubibot:' || lec.code_client || ':' || lec.channel || ':' || lec.slot || ':' || lec.jour::text;
    if exists (select 1 from public.controles_haccp
               where code_client = lec.code_client and client_control_id = v_ccid) then
      continue;
    end if;

    insert into public.controles_haccp
      (code_client, establishment_id, module, contenu, signature, photos,
       date_controle, nc_detectee, nc_details, client_control_id)
    values (
      lec.code_client, v_estab, 'Températures enceintes',
      jsonb_build_object(
        'temperatures', jsonb_build_array(jsonb_build_object(
          'type',      coalesce(sonde->>'enceinte', sonde->>'nom', 'Enceinte'),
          'precision', '',
          'temp',      v_temp::text,
          'conf',      case when v_isNC then 'Non conforme' else 'Conforme' end,
          'isNC',      v_isNC,
          'action',    case when v_isNC then 'Vérifier l''enceinte et le capteur' else '' end,
          'source',    'Capteur UbiBot (automatique)'
        )),
        'signataire', 'Relevé automatique (capteur UbiBot)',
        'signe',      'Relevé automatique (capteur UbiBot)',
        'timestamp',  'Programmé ' || to_char(v_slot_ts at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI')
                      || ' · enregistré ' || to_char(now() at time zone 'Europe/Paris', 'HH24:MI'),
        'heure_programmee', to_char(v_slot_ts at time zone 'Europe/Paris', 'HH24:MI'),
        'heure_enregistree', to_char(now() at time zone 'Europe/Paris', 'HH24:MI'),
        'pageId',     'page-temperatures',
        'secteur',    coalesce(v_secteur, ''),
        'channel',    lec.channel,
        'source',     'ubibot',
        'auto',       true
      ),
      null, '[]'::jsonb, v_slot_ts, v_isNC,
      case when v_isNC
        then coalesce(sonde->>'enceinte', sonde->>'nom', 'Enceinte')
             || ' : ' || v_temp::text || '°C (hors seuil)'
        else null end,
      v_ccid
    );

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
  a := public.ubibot_traiter_reponses();
  b := public.ubibot_lancer_releves();
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
--  TEST IMMÉDIAT (hors créneau) — force une lecture maintenant
-- ════════════════════════════════════════════════════════════════════════
--  1) Lancer la lecture :
--     do $$
--     declare r bigint; c record; s jsonb;
--     begin
--       for c in select distinct on (code_client) code_client, establishment_id, contenu
--                from public.controles_haccp where module='__sondes_config__'
--                order by code_client, created_at desc loop
--         for s in select * from jsonb_array_elements(c.contenu->'sondes') loop
--           select net.http_get('https://api.ubibot.com/channels/' || (s->>'channel') ||
--                  '?api_key=' || (c.contenu->>'ubibotKey')) into r;
--           insert into public.ubibot_lectures(request_id, code_client, establishment_id,
--                  sondes, channel, slot, jour)
--           values (r, c.code_client, c.establishment_id, jsonb_build_array(s), s->>'channel',
--                  'TEST-'||to_char(now() at time zone 'Europe/Paris','HH24:MI:SS'), current_date);
--         end loop;
--       end loop;
--     end $$;
--  2) Attendre ~15 s, puis traiter + voir :
--     select public.ubibot_traiter_reponses();
--     select contenu->>'timestamp' as heure, nc_detectee, contenu->'temperatures'
--     from public.controles_haccp
--     where contenu->>'source'='ubibot' order by recorded_at desc limit 5;
--
--  Voir la tâche : select jobname, schedule, active from cron.job where jobname='ubibot-releves-auto';
--  Désactiver    : select cron.unschedule('ubibot-releves-auto');
-- ════════════════════════════════════════════════════════════════════════
