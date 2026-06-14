-- ════════════════════════════════════════════════════════════════════════
--  local_check — valide le mot de passe d'un COMPTE LOCAL côté SERVEUR (Vault)
--  HACCP Pro
-- ════════════════════════════════════════════════════════════════════════
--  But : retirer du code client les mots de passe en clair des comptes locaux
--  (ex. RTH75). L'app envoie le code + le mot de passe saisi ; le serveur répond
--  true/false en comparant à un secret Vault nommé « local_pwd_<CODE> »
--  (ex. local_pwd_RTH75).
--
--  À créer UNE fois par compte à sécuriser :
--    select vault.create_secret('LE_MOT_DE_PASSE','local_pwd_RTH75','MDP local RTH75');
--
--  Repli transitoire : tant que le secret n'existe pas, on tolère l'ancien
--  '826700' POUR RTH75 uniquement, afin de ne jamais bloquer la connexion
--  pendant la transition. (Ce repli est côté serveur, jamais dans le bundle JS.)
-- ════════════════════════════════════════════════════════════════════════
create or replace function public.local_check(p_code text, p_pwd text)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  _p    text;
  _code text := upper(coalesce(p_code, ''));
begin
  begin
    select decrypted_secret into _p from vault.decrypted_secrets
    where name = 'local_pwd_' || _code limit 1;
  exception when others then _p := null; end;

  -- repli transitoire UNIQUEMENT pour RTH75 (le temps que le secret soit créé)
  if (_p is null or _p = '') and _code = 'RTH75' then _p := '826700'; end if;

  if _p is null or _p = '' then return false; end if;
  return p_pwd is not null and p_pwd = _p;
end $$;

grant execute on function public.local_check(text, text) to anon, authenticated;

-- Test :  select public.local_check('RTH75','826700');  -> true
-- ════════════════════════════════════════════════════════════════════════
