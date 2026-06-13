-- ════════════════════════════════════════════════════════════════════════
--  BRIQUE 2 — SUPERVISION CAPTEURS (vue administrateur)  — v2
--  HACCP Pro — voir l'état des capteurs RÉELLEMENT configurés chez les clients
-- ════════════════════════════════════════════════════════════════════════
--  v2 : on n'affiche QUE les capteurs présents dans la config actuelle de
--  chaque client (__sondes_config__), identifiés par leur CANAL — fini les
--  doublons / enceintes fantômes issus d'anciens tests. Pour chaque capteur :
--  son dernier relevé (apparié par canal), température, état, heure.
--
--  Sécurité : « security definer » mais PROTÉGÉE PAR MOT DE PASSE.
--  Pré-requis : la fonction de relevé doit écrire le canal dans le contrôle
--  (champ contenu->>'channel') — voir releves_auto_ubibot.sql (à jour).
-- ════════════════════════════════════════════════════════════════════════

create or replace function public.supervision_capteurs(p_pwd text)
returns table(
  etablissement text,
  code_client   text,
  frigo         text,
  temperature   text,
  conforme      boolean,
  derniere      timestamptz,
  hors_service  boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_pwd is distinct from '826700' then
    return;
  end if;

  return query
  with cfg as (   -- dernière config de chaque client
    select distinct on (cc.code_client)
           cc.code_client, cc.contenu->'sondes' as sondes
    from public.controles_haccp cc
    where cc.module = '__sondes_config__'
    order by cc.code_client, cc.created_at desc
  ),
  capteurs as (   -- un capteur = un canal présent dans la config actuelle
    select cfg.code_client,
           (s->>'channel')                                   as channel,
           coalesce(s->>'enceinte', s->>'nom', 'Capteur')    as frigo
    from cfg
    cross join lateral jsonb_array_elements(cfg.sondes) as s
    where coalesce(s->>'channel','') <> ''
  ),
  dernier as (    -- dernier relevé auto, apparié par canal
    select distinct on (c.code_client, (c.contenu->>'channel'))
           c.code_client,
           (c.contenu->>'channel')                                       as channel,
           (c.contenu->'temperatures'->0->>'temp')                       as temp,
           not coalesce((c.contenu->'temperatures'->0->>'isNC')::boolean,false) as conforme,
           c.recorded_at                                                 as derniere
    from public.controles_haccp c
    where c.module = 'Températures enceintes'
      and c.contenu->>'source' = 'ubibot'
      and c.contenu->>'channel' is not null
    order by c.code_client, (c.contenu->>'channel'), c.recorded_at desc
  )
  select
    coalesce(e.nom, cap.code_client)                                      as etablissement,
    cap.code_client,
    cap.frigo,
    d.temp                                                               as temperature,
    coalesce(d.conforme, false)                                          as conforme,
    d.derniere,
    (d.derniere is null or d.derniere < now() - interval '26 hours')     as hors_service
  from capteurs cap
  left join public.etablissements e on e.code_acces = cap.code_client
  left join dernier d on d.code_client = cap.code_client and d.channel = cap.channel
  order by etablissement, frigo;
end;
$$;

grant execute on function public.supervision_capteurs(text) to anon, authenticated;

-- ── Test ──  select * from public.supervision_capteurs('826700');
-- ════════════════════════════════════════════════════════════════════════
