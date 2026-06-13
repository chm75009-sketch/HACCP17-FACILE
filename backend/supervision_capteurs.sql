-- ════════════════════════════════════════════════════════════════════════
--  BRIQUE 2 — SUPERVISION CAPTEURS (vue administrateur)
--  HACCP Pro — voir l'état de TOUS les capteurs de TOUS les clients d'un coup
-- ════════════════════════════════════════════════════════════════════════
--  Renvoie, pour chaque établissement + frigo équipé d'un capteur UbiBot :
--  le dernier relevé (température, conforme/non, date) + « hors service » si
--  plus aucun relevé depuis > 26 h (capteur débranché / WiFi ou courant coupé).
--
--  Sécurité : fonction « security definer » (lit au-delà du cloisonnement RLS)
--  mais PROTÉGÉE PAR MOT DE PASSE — il faut passer le mot de passe admin, sinon
--  elle ne renvoie rien. (Le panneau admin de l'app le fournit automatiquement.)
--
--  À coller dans Supabase → SQL Editor (une fois). Si tu changes le mot de passe
--  admin de l'app, remplace '826700' ci-dessous.
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
  -- Garde-fou : seul l'admin (avec le bon mot de passe) obtient des données.
  if p_pwd is distinct from '826700' then
    return;
  end if;

  return query
  select distinct on (c.code_client, (t->>'type'))
    coalesce(e.nom, c.code_client)                  as etablissement,
    c.code_client,
    (t->>'type')                                    as frigo,
    (t->>'temp')                                    as temperature,
    not coalesce((t->>'isNC')::boolean, false)      as conforme,
    c.recorded_at                                   as derniere,
    (c.recorded_at < now() - interval '26 hours')   as hors_service
  from public.controles_haccp c
  left join public.etablissements e on e.code_acces = c.code_client
  cross join lateral jsonb_array_elements(c.contenu->'temperatures') as t
  where c.module = 'Températures enceintes'
    and c.contenu->>'source' = 'ubibot'
  order by c.code_client, (t->>'type'), c.recorded_at desc;
end;
$$;

-- L'app appelle cette fonction via l'API (rôle anon) ; elle reste protégée par
-- le mot de passe ci-dessus.
grant execute on function public.supervision_capteurs(text) to anon, authenticated;

-- ── Test rapide (remplace par ton mot de passe admin) ──
--   select * from public.supervision_capteurs('826700');
-- ════════════════════════════════════════════════════════════════════════
