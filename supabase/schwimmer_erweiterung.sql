-- =====================================================================
-- Erweiterung zu schwimmer_pflichtzeiten.sql
--
-- Voraussetzung: schwimmer_pflichtzeiten.sql wurde schon ausgefuehrt.
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Wiederholbar, es werden nur Spalten ergaenzt - keine Daten geloescht.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Persoenliche Daten und Verein (Tab "Infos")
-- Alles optional. Sichtbar nur fuer den Coach, der den Schwimmer
-- angelegt hat (bestehende Policy auf swimmers).
-- ---------------------------------------------------------------------
alter table public.swimmers add column if not exists birth_date   date;
alter table public.swimmers add column if not exists nationality  text;
alter table public.swimmers add column if not exists dsv_id       text;
alter table public.swimmers add column if not exists club_name    text;
alter table public.swimmers add column if not exists club_id      text;
alter table public.swimmers add column if not exists club_since   date;


-- ---------------------------------------------------------------------
-- Ergebnisse: Punkte, Lauf, Zwischenzeit, Staffeln und Freiwasser
--
-- kind = 'einzel'     -> Beckenstrecke, braucht Bahn, Strecke und Lage
-- kind = 'staffel'    -> event_label z. B. "4x100 F", placement = Platz
-- kind = 'freiwasser' -> event_label z. B. "5 km"
-- ---------------------------------------------------------------------
alter table public.swimmer_results add column if not exists kind text not null default 'einzel';
alter table public.swimmer_results add column if not exists event_label text;
alter table public.swimmer_results add column if not exists points      smallint check (points >= 0);
alter table public.swimmer_results add column if not exists round       text;
alter table public.swimmer_results add column if not exists is_split    boolean not null default false;
alter table public.swimmer_results add column if not exists placement   smallint check (placement > 0);

alter table public.swimmer_results alter column pool_length drop not null;
alter table public.swimmer_results alter column distance    drop not null;
alter table public.swimmer_results alter column stroke      drop not null;

alter table public.swimmer_results drop constraint if exists swimmer_results_kind_check;
alter table public.swimmer_results add constraint swimmer_results_kind_check
  check (kind in ('einzel', 'staffel', 'freiwasser'));

alter table public.swimmer_results drop constraint if exists swimmer_results_kind_fields_check;
alter table public.swimmer_results add constraint swimmer_results_kind_fields_check
  check (
    (kind = 'einzel' and pool_length is not null and distance is not null and stroke is not null)
    or (kind <> 'einzel' and event_label is not null and length(trim(event_label)) > 0)
  );
