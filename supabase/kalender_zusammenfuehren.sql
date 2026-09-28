-- =====================================================================
-- Alten Saisonkalender (calendar_events) in den neuen Kalender
-- (calendar_entries) uebernehmen
--
-- Voraussetzung: termine_news_gruppen.sql wurde ausgefuehrt.
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Wiederholbar: schon uebernommene Termine werden nicht doppelt angelegt.
--
-- Danach liest und schreibt die Saisonplanung direkt in
-- calendar_entries - es gibt nur noch EINE Terminliste.
-- Die alte Tabelle calendar_events bleibt als Sicherung bestehen
-- und wird von der App nicht mehr benutzt. Sie kann spaeter von
-- Hand geloescht werden.
--
-- Uebernommene Termine stehen im TRAINERKALENDER (nur fuer Trainer
-- sichtbar), so wie bisher. Im Kalender kann man einzelne auf
-- "Team-Kalender" umstellen, damit Athleten sie sehen.
-- =====================================================================


-- Farbe aus der Saisonplanung und neue Kategorie "Leistungstest"
alter table public.calendar_entries add column if not exists color text;

alter table public.calendar_entries drop constraint if exists calendar_entries_category_check;
alter table public.calendar_entries add constraint calendar_entries_category_check
  check (category in ('training', 'wettkampf', 'trainingslager', 'besprechung', 'leistungstest', 'sonstiges'));


-- HINWEIS (Datenregel): Die einmalige Datenuebernahme ist bereits gelaufen
-- und wurde aus diesem Skript entfernt (steht in der Git-Historie).
-- Dieses Skript aendert oder ergaenzt keine vorhandenen Daten mehr.


-- Fristen (calendar_tasks.event_id) auf den neuen Kalender umhaengen
do $$
declare
  v_constraint text;
begin
  select c.conname into v_constraint
    from pg_constraint c
   where c.conrelid = 'public.calendar_tasks'::regclass
     and c.contype = 'f'
     and c.confrelid = 'public.calendar_events'::regclass;

  if v_constraint is not null then
    execute format('alter table public.calendar_tasks drop constraint %I', v_constraint);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.calendar_tasks'::regclass
       and conname = 'calendar_tasks_entry_fkey'
  ) then
    alter table public.calendar_tasks
      add constraint calendar_tasks_entry_fkey
      foreign key (event_id) references public.calendar_entries(id) on delete set null;
  end if;
end $$;
