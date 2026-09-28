-- =====================================================================
-- Pflichtzeiten: 25m- UND 50m-Zeiten anerkennen
--
-- Neue, optionale Spalte an qualifying_standards:
--   count_both_pools = true -> fuer diese Liste zaehlen Zeiten von
--   beiden Bahnlaengen (z. B. Hessische Meisterschaften).
--   leer/false -> wie bisher nur die Bahn der Liste.
--
-- Nur additiv: bestehende Listen bleiben unveraendert.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

alter table public.qualifying_standards
  add column if not exists count_both_pools boolean;
