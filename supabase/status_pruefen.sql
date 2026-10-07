-- =====================================================================
-- STATUS PRUEFEN: Welche Datenbank-Skripte sind schon eingespielt?
--
-- Nur lesen - aendert nichts. Im Supabase SQL-Editor ausfuehren,
-- das Ergebnis erscheint unter "Results" als Tabelle.
-- Fehlt etwas aus 1 oder 12-25: alles_aktualisieren.sql ausfuehren.
-- 26 ist optional und wird bewusst einzeln ausgefuehrt (siehe README).
-- =====================================================================

with checks(nr, skript, ok) as (
  values
    (1,  'kapitel1_grundbegriffe.sql',      exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'training_sessions' and column_name = 'core_goals')),
    (2,  'schwimmer_pflichtzeiten.sql',     to_regclass('public.qualifying_times') is not null),
    (3,  'schwimmer_erweiterung.sql',       exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'swimmer_results' and column_name = 'points')),
    (4,  'termine_news_gruppen.sql',        to_regclass('public.calendar_entries') is not null),
    (5,  'wettkampf_feedback.sql',          to_regclass('public.competition_starts') is not null),
    (6,  'staffeln.sql',                    to_regclass('public.competition_relays') is not null),
    (7,  'kalender_zusammenfuehren.sql',    exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'calendar_entries' and column_name = 'color')),
    (8,  'hinweise.sql',                    to_regclass('public.notifications') is not null),
    (9,  'athleten_zusammenfuehren.sql',    to_regclass('public.team_swimmers') is not null),
    (10, 'schmerzen.sql',                   to_regclass('public.pain_reports') is not null),
    (11, 'datenregel_umsetzen.sql',         true),
    (12, 'pflichtzeiten_beide_bahnen.sql',  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'qualifying_standards' and column_name = 'count_both_pools')),
    (13, 'disqualifikationen.sql',          to_regclass('public.swimmer_non_finishes') is not null),
    (14, 'athleten_fokus.sql',              exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'swimmers' and column_name = 'focus_strokes')),
    (15, 'athleten_fokus_strecken.sql',     exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'swimmers' and column_name = 'focus_events')),
    (16, 'training_notizen.sql',            exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'training_sessions' and column_name = 'notes')),
    (17, 'anwesenheit.sql',                 to_regclass('public.training_attendance') is not null),
    (18, 'wettkampf_fehler.sql',            exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'competition_starts' and column_name = 'faults')),
    (19, 'laktattests.sql',                 to_regclass('public.lactate_tests') is not null),
    (20, 'wettkampftag.sql',                to_regclass('public.athlete_routines') is not null),
    (21, 'testbatterie.sql',                to_regclass('public.fitness_tests') is not null),
    (22, 'mein_fortschritt.sql',            to_regprocedure('public.my_results()') is not null),
    (23, 'gesundheit_dokumente.sql',        to_regclass('public.athlete_documents') is not null),
    (24, 'ziele_notizen.sql',               to_regclass('public.athlete_notes') is not null),
    (25, 'sicherheit_trainerteam.sql',      to_regclass('public.team_coaches') is not null),
    (26, 'trainerteam_aktivieren.sql (optional)', exists (select 1 from pg_policies where policyname = 'Primary coach adds to own teams'))
)
select nr, skript, case when ok then '✓ eingespielt' else '✗ fehlt' end as status
from checks
order by nr;
