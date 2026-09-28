-- =====================================================================
-- Sicherheits-Check (liest nur, aendert NICHTS)
--
-- Im Supabase SQL-Editor ausfuehren. Das Ergebnis ist eine Tabelle
-- mit Befunden. Leer = alles in Ordnung. Sonst bitte Screenshot an
-- Claude schicken, dann wird es behoben.
-- =====================================================================

with
-- 1) Tabellen ohne Row Level Security: jeder mit dem oeffentlichen
--    App-Schluessel koennte sie lesen/aendern.
no_rls as (
  select 'KRITISCH' as stufe,
         'Tabelle ohne Zugriffsschutz (RLS aus)' as befund,
         c.relname::text as objekt
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
),
-- 2) RLS an, aber keine einzige Regel -> niemand kommt ran (meist ein Fehler)
no_policy as (
  select 'HINWEIS', 'RLS an, aber keine Regel (Tabelle fuer die App gesperrt)', c.relname::text
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)
),
-- 3) Regeln, die wirklich JEDEM alles erlauben (using true)
open_policy as (
  select case when p.roles::text like '%anon%' or p.roles::text like '%public%' then 'KRITISCH' else 'PRUEFEN' end,
         'Regel erlaubt allen ' || p.cmd || ' (' || p.policyname || ')',
         p.tablename::text
  from pg_policies p
  where p.schemaname = 'public'
    and (p.qual = 'true' or p.with_check = 'true')
),
-- 4) Oeffentliche Datei-Ordner
public_buckets as (
  select 'KRITISCH', 'Datei-Ordner ist oeffentlich (jeder mit Link kann Dateien laden)', b.id::text
  from storage.buckets b
  where b.public
)
select * from no_rls
union all select * from no_policy
union all select * from open_policy
union all select * from public_buckets
order by 1, 3;
