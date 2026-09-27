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


-- Termine kopieren (gleiche id, damit verknuepfte Fristen passen).
-- Ganztaegig: 06:00 bzw. 20:00 UTC liegen in Deutschland sicher
-- am selben Kalendertag.
insert into public.calendar_entries
  (id, coach_id, team_id, title, description, location, category, visibility,
   starts_at, ends_at, all_day, color, created_at)
select
  e.id,
  e.coach_id,
  e.team_id,
  e.title,
  e.description,
  e.location,
  case e.event_type
    when 'competition'   then 'wettkampf'
    when 'training_camp' then 'trainingslager'
    when 'testing'       then 'leistungstest'
    when 'meeting'       then 'besprechung'
    else 'sonstiges'
  end,
  'coach',
  (e.start_date::timestamp + interval '6 hours') at time zone 'UTC',
  (coalesce(e.end_date, e.start_date)::timestamp + interval '20 hours') at time zone 'UTC',
  true,
  e.color,
  e.created_at
from public.calendar_events e
on conflict (id) do nothing;


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

  -- Verweise auf Termine, die es nicht (mehr) gibt, loesen
  update public.calendar_tasks t
     set event_id = null
   where t.event_id is not null
     and not exists (select 1 from public.calendar_entries e where e.id = t.event_id);

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
