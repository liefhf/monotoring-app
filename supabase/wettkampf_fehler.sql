-- =====================================================================
-- Wettkampf: Technikfehler per Klick, je Streckenabschnitt
--
-- Neue, optionale Spalte an competition_starts. Nur additiv.
-- Format: [{"code": "wende_gleiten", "segment": "wende-2"}, ...]
--   segment = "start", "lap-1" (1. Bahn), "wende-1" (1. Wende),
--             "finish" (Zielanschlag) oder "gesamt".
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

alter table public.competition_starts add column if not exists faults jsonb;
