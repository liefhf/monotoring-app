-- =====================================================================
-- Sicherheits-Check (liest nur, aendert NICHTS)
--
-- Im Supabase SQL-Editor ausfuehren und das Ergebnis als CSV
-- herunterladen (Button "Download CSV") und an Claude geben.
--
-- WICHTIG: Ein leeres Ergebnis heisst nur, dass DIESE automatischen
-- Pruefungen nichts gefunden haben. Es ist KEIN Beweis, dass die
-- Datenbank sicher ist. Die Regeln selbst muessen gelesen werden
-- (supabase/regeln_anzeigen.sql) - vor allem Zeilen mit PRUEFEN.
--
-- Stufen: KRITISCH = sofort beheben, PRUEFEN = von Hand ansehen,
--         HINWEIS = meist in Ordnung, zur Kenntnis.
-- =====================================================================

with
-- 1) Tabellen ohne Row Level Security (jeder mit dem App-Schluessel kommt ran)
no_rls as (
  select 'KRITISCH' as stufe, 'Tabelle ohne Zugriffsschutz (RLS aus)' as befund, c.relname::text as objekt, null::text as details
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
),
-- 2) RLS an, aber keine Regel
no_policy as (
  select 'HINWEIS', 'RLS an, aber keine Regel (Tabelle fuer die App gesperrt)', c.relname::text, null
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
),
-- 3) Regeln, die allen alles erlauben (using/with check = true)
open_policy as (
  select case when p.roles::text ~ '(anon|public)' then 'KRITISCH' else 'PRUEFEN' end,
         'Regel ohne Einschraenkung (true): ' || p.cmd || ' "' || p.policyname || '"',
         p.schemaname || '.' || p.tablename, coalesce(p.qual, '') || ' | ' || coalesce(p.with_check, '')
  from pg_policies p
  where p.schemaname in ('public', 'storage') and (p.qual = 'true' or p.with_check = 'true')
),
-- 4) Regeln fuer nicht angemeldete Nutzer (anon/public)
anon_policy as (
  select 'PRUEFEN', 'Regel gilt auch ohne Anmeldung (anon/public): ' || p.cmd || ' "' || p.policyname || '"',
         p.schemaname || '.' || p.tablename, p.qual
  from pg_policies p
  where p.schemaname in ('public', 'storage') and p.roles::text ~ '(anon|public)'
),
-- 5) Mehrere erlaubende Regeln fuer dieselbe Aktion: sie werden ODER-verknuepft.
--    Eine alte, grosszuegige Regel neben einer neuen strengen hebelt diese aus.
overlap as (
  select 'PRUEFEN', 'Mehrere Regeln fuer ' || p.cmd || ' (gelten zusammen, die grosszuegigste gewinnt)',
         p.tablename::text, string_agg('"' || p.policyname || '"', ', ' order by p.policyname)
  from pg_policies p
  where p.schemaname = 'public' and p.permissive = 'PERMISSIVE'
  group by p.tablename, p.cmd
  having count(*) > 1
),
-- 6) Schreib-Regeln ohne Pruefung beim Schreiben, die keinen Eigentuemer-Bezug haben
--    (Gefahr: Eintrag auf fremden Athleten/Coach umhaengen)
weak_write as (
  select 'PRUEFEN', 'Schreib-Regel ohne WITH CHECK: ' || p.cmd || ' "' || p.policyname || '"', p.tablename::text, p.qual
  from pg_policies p
  where p.schemaname = 'public' and p.cmd in ('UPDATE', 'ALL') and p.with_check is null
    and coalesce(p.qual, '') !~ '(auth\.uid\(\)|coach_owns|coach_has|is_team|is_coach|coach_can|is_session)'
),
-- 7) Bekannte heikle Regel aus dem Bestand: Coaches lesen Profile
profile_read as (
  select 'PRUEFEN', 'Profil-Leserecht fuer Coaches: darf NUR eigene Athleten betreffen', p.tablename::text, p.qual
  from pg_policies p
  where p.schemaname = 'public' and p.tablename = 'profiles' and p.cmd in ('SELECT', 'ALL') and p.qual !~ '^\(*id = auth\.uid\(\)\)*$'
),
-- 8) Profile: Kann ein Nutzer seine eigene Rolle aendern?
role_guard as (
  select 'KRITISCH', 'Nutzer duerfen ihr Profil aendern, aber Rollen-Schutz (Skript 25) fehlt', 'profiles', null
  where exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'profiles' and p.cmd in ('UPDATE', 'ALL'))
    and not exists (select 1 from pg_trigger t where t.tgname = 'profiles_protect_role')
),
-- 9) SECURITY DEFINER-Funktionen ohne festen search_path (Angriff ueber eigene Objekte)
definer_path as (
  select 'KRITISCH', 'SECURITY DEFINER ohne festen search_path', p.oid::regprocedure::text, null
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
),
-- 10) SECURITY DEFINER-Funktionen, die auch ohne Anmeldung aufrufbar sind
definer_anon as (
  select 'PRUEFEN', 'SECURITY DEFINER auch fuer anon/public ausfuehrbar', p.oid::regprocedure::text, null
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and (has_function_privilege('anon', p.oid, 'execute'))
),
-- 11) Views ohne security_invoker umgehen RLS der darunterliegenden Tabellen
views as (
  select case when has_table_privilege('anon', c.oid, 'select') then 'KRITISCH' else 'PRUEFEN' end,
         'View ohne security_invoker (liest mit Rechten des Erstellers, RLS wird umgangen)', c.relname::text, null
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm')
    and not coalesce((select bool_or(o = 'security_invoker=true' or o = 'security_invoker=on') from unnest(c.reloptions) o), false)
),
-- 12) Speicher: oeffentliche Ordner und Grenzen des Dokumenten-Ordners
public_buckets as (
  select 'KRITISCH', 'Datei-Ordner ist oeffentlich (jeder mit Link kann Dateien laden)', b.id::text, null
  from storage.buckets b where b.public
),
doc_bucket as (
  select 'HINWEIS', 'Dokumenten-Ordner ohne Groessen- oder Typgrenze (App prueft 10 MB / PDF+Foto)', b.id::text,
         'file_size_limit=' || coalesce(b.file_size_limit::text, 'keine') || ', allowed_mime_types=' || coalesce(b.allowed_mime_types::text, 'alle')
  from storage.buckets b
  where b.id = 'athlete-documents' and (b.file_size_limit is null or b.allowed_mime_types is null)
),
-- 13) Trainerteam-Stand (Information)
team_mode as (
  select 'HINWEIS',
         case when to_regclass('public.team_coaches') is null then 'Trainerteam: Skript 25 nicht eingespielt'
              when exists (select 1 from pg_policies where policyname = 'Primary coach adds to own teams') then 'Trainerteam: AKTIV (Skript 26)'
              else 'Trainerteam: vorbereitet, nicht aktiv' end,
         'team_coaches', null
)
select * from no_rls
union all select * from no_policy
union all select * from open_policy
union all select * from anon_policy
union all select * from overlap
union all select * from weak_write
union all select * from profile_read
union all select * from role_guard
union all select * from definer_path
union all select * from definer_anon
union all select * from views
union all select * from public_buckets
union all select * from doc_bucket
union all select * from team_mode
order by 1, 3, 2;
