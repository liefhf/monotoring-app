-- =====================================================================
-- DEMO-DATEN fuer Kapitel 1 wieder entfernen
--
-- Loescht nur, was demo_kapitel1_einfuegen.sql angelegt hat:
--   - alle Einheiten, deren Titel mit "[Demo]" beginnt, samt Abschnitten,
--     Serien, Landuebungen, Warm-up und Rueckmeldungen
--   - alle Wachstumsmessungen mit note = 'demo'
--
-- Geburtsdatum und Geschlecht, die das Demo-Skript bei leeren Profilen
-- gesetzt hat, bleiben stehen (sie lassen sich in der App aendern).
-- =====================================================================

begin;

create temporary table demo_sessions on commit drop as
  select id from public.training_sessions where title like '[Demo]%';

delete from public.training_feedback
 where training_session_id in (select id from demo_sessions);

delete from public.training_rows
 where section_id in (
   select id from public.training_sections
    where training_session_id in (select id from demo_sessions)
 );

delete from public.training_sections
 where training_session_id in (select id from demo_sessions);

delete from public.training_land_rows
 where training_session_id in (select id from demo_sessions);

delete from public.training_warmup_land_rows
 where training_session_id in (select id from demo_sessions);

delete from public.training_sessions
 where id in (select id from demo_sessions);

delete from public.growth_measurements
 where note = 'demo';

commit;
