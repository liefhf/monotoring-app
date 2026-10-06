-- =====================================================================
-- Trainingsfokus je Athlet: einzelne Strecken (z. B. 100 R, 200 R, 50 F)
--
-- Neue, optionale Spalte an swimmers. Format je Eintrag: "100-backstroke".
-- Nur additiv. Einmal im Supabase SQL-Editor ausfuehren
-- (nach athleten_fokus.sql).
-- =====================================================================

alter table public.swimmers add column if not exists focus_events text[];
