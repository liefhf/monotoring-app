-- =====================================================================
-- Notizen zur Trainingseinheit (erscheinen auch im Ausdruck)
--
-- Neue, optionale Spalte an training_sessions. Nur additiv.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

alter table public.training_sessions add column if not exists notes text;
