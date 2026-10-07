-- =====================================================================
-- Alle Zugriffsregeln, Rechte und Sicherheits-Funktionen anzeigen
-- (liest nur, aendert NICHTS)
--
-- Im Supabase SQL-Editor ausfuehren. Es gibt DREI Ergebnisse - bitte
-- jedes einzeln als CSV herunterladen ("Download CSV") und an Claude
-- geben. Nur damit kann geprueft werden, ob ein Coach wirklich nur
-- eigene Athleten sieht (die Kern-Tabellen wurden direkt in Supabase
-- angelegt, ihre Regeln stehen nicht im Projekt).
-- =====================================================================

-- Ergebnis 1: alle Regeln (public und Datei-Speicher)
select n.nspname                                   as schema,
       c.relname                                   as tabelle,
       c.relrowsecurity                            as rls_an,
       p.policyname                                as regel,
       p.permissive                                as art,
       p.cmd                                       as aktion,
       p.roles::text                               as rollen,
       p.qual                                      as bedingung,
       p.with_check                                as pruefung_beim_schreiben
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname in ('public', 'storage')
left join pg_policies p on p.schemaname = n.nspname and p.tablename = c.relname
where c.relkind in ('r', 'p') and (n.nspname = 'public' or c.relname = 'objects')
order by n.nspname, c.relname, p.cmd, p.policyname;

-- Ergebnis 2: Funktionen (RPC, Hilfsfunktionen, Trigger) mit Sicherheitsmerkmalen
select p.oid::regprocedure::text                    as funktion,
       case when p.prosecdef then 'SECURITY DEFINER' else 'invoker' end as laeuft_als,
       coalesce(array_to_string(p.proconfig, ', '), '-') as einstellungen,
       has_function_privilege('anon', p.oid, 'execute')          as anon_darf,
       has_function_privilege('authenticated', p.oid, 'execute') as angemeldet_darf,
       left(regexp_replace(p.prosrc, '\s+', ' ', 'g'), 400)       as inhalt_anfang
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
order by 1;

-- Ergebnis 3: Tabellen-/View-Rechte der App-Rollen und Trigger
select c.relname as objekt,
       case c.relkind when 'r' then 'Tabelle' when 'v' then 'View' when 'm' then 'Mat. View' else c.relkind::text end as art,
       has_table_privilege('anon', c.oid, 'select')          as anon_lesen,
       has_table_privilege('anon', c.oid, 'insert')          as anon_schreiben,
       has_table_privilege('authenticated', c.oid, 'select') as angemeldet_lesen,
       has_table_privilege('authenticated', c.oid, 'update') as angemeldet_aendern,
       c.reloptions::text                                    as optionen,
       (select string_agg(t.tgname, ', ') from pg_trigger t where t.tgrelid = c.oid and not t.tgisinternal) as trigger
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where c.relkind in ('r', 'p', 'v', 'm')
order by 1;
