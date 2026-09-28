-- =====================================================================
-- Trainingsfokus je Athlet: Hauptlagen, Streckenbereich, Notiz
--
-- Neue, optionale Spalten an swimmers (leer = kein Fokus festgelegt,
-- dann wird wie bisher alles ausgewertet). Nur additiv.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

alter table public.swimmers add column if not exists focus_strokes   text[];
alter table public.swimmers add column if not exists focus_distances text[];
alter table public.swimmers add column if not exists focus_note      text;
