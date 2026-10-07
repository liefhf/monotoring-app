-- =====================================================================
-- Regeln (RLS) der Kern-Tabellen anzeigen (liest nur, aendert NICHTS)
--
-- Diese Tabellen wurden direkt in Supabase angelegt, ihre Regeln
-- stehen nicht im Projekt. Bitte im SQL-Editor ausfuehren und das
-- Ergebnis (als CSV oder Screenshot) an Claude geben - dann kann
-- geprueft werden, ob ein Coach wirklich nur eigene Athleten sieht.
-- =====================================================================

select c.relname                                   as tabelle,
       c.relrowsecurity                            as rls_an,
       p.policyname                                as regel,
       p.cmd                                       as aktion,
       p.roles::text                               as rollen,
       p.qual                                      as bedingung,
       p.with_check                                as pruefung_beim_schreiben
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
left join pg_policies p on p.schemaname = 'public' and p.tablename = c.relname
where c.relkind = 'r'
  and c.relname in (
    'profiles', 'teams', 'team_members', 'befinden_entries', 'pain_reports',
    'training_sessions', 'training_sections', 'training_rows', 'training_land_rows',
    'training_warmup_land_rows', 'training_feedback', 'competitions',
    'competition_events', 'competition_sections', 'calendar_tasks'
  )
order by c.relname, p.cmd, p.policyname;
