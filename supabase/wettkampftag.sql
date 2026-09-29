-- =====================================================================
-- "Mein Wettkampf-Tag": persoenliche Vor-Start-Routine je Athlet
--
-- Neue Tabelle, nur additiv. Jeder Athlet (Login) pflegt seine eigene
-- Routine; der Coach seiner Teams darf sie lesen.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

create table if not exists public.athlete_routines (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,
  items       jsonb not null default '[]',
  mantra      text,
  updated_at  timestamptz not null default now()
);

alter table public.athlete_routines enable row level security;

drop policy if exists "Athletes manage own routine" on public.athlete_routines;
create policy "Athletes manage own routine"
  on public.athlete_routines for all
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "Coaches read routines of own athletes" on public.athlete_routines;
create policy "Coaches read routines of own athletes"
  on public.athlete_routines for select
  to authenticated
  using (public.coach_has_athlete(profile_id));

-- ---------------------------------------------------------------------
-- Eigene Starts mit Wettkampf und Abschnitt-Beginn (fuer den Zeitplan)
-- ---------------------------------------------------------------------
create or replace function public.my_race_day_starts()
returns table (
  start_id uuid,
  competition_id uuid,
  competition_name text,
  competition_location text,
  section_date date,
  section_start text,
  event_number integer
)
language sql stable security definer set search_path = ''
as $$
  select cs.id, c.id, c.name::text, c.location::text, sec.section_date::date, sec.start_time::text, ev.event_number::integer
  from public.competition_starts cs
  join public.competitions c on c.id = cs.competition_id
  join public.swimmers s on s.id = cs.swimmer_id
  left join public.competition_events ev on ev.id = cs.event_id
  left join public.competition_sections sec on sec.id = ev.section_id
  where s.profile_id = auth.uid() and cs.shared_with_athlete;
$$;

revoke all on function public.my_race_day_starts() from public, anon;
grant execute on function public.my_race_day_starts() to authenticated;
