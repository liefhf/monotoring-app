-- =====================================================================
-- Rueckweg zu Skript 26: Trainerteam wieder AUSSCHALTEN
--
-- Stellt die Funktionen und Regeln von vor Skript 26 wieder her.
-- Aendert keine Daten. team_coaches bleibt bestehen (ohne Wirkung).
-- =====================================================================

drop policy if exists "Team staff read team swimmers" on public.team_swimmers;
drop policy if exists "Primary coach adds to own teams" on public.team_swimmers;
drop policy if exists "Owner or primary coach removes from team" on public.team_swimmers;
drop policy if exists "Coaches manage own team swimmers" on public.team_swimmers;

create or replace function public.coach_owns_swimmer(p_swimmer_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.swimmers s where s.id = p_swimmer_id and s.coach_id = auth.uid());
$$;

create or replace function public.coach_owns_swimmer_folder(p_folder text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.swimmers s where s.id::text = p_folder and s.coach_id = auth.uid());
$$;

create or replace function public.coach_has_athlete(p_athlete_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.athlete_id = p_athlete_id and t.coach_id = auth.uid()
  );
$$;

create or replace function public.is_team_coach(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.teams t where t.id = p_team_id and t.coach_id = auth.uid());
$$;

create policy "Coaches manage own team swimmers"
  on public.team_swimmers for all to authenticated
  using (public.is_team_coach(team_id))
  with check (public.is_team_coach(team_id) and public.coach_owns_swimmer(swimmer_id));

drop policy if exists "Team staff read swimmers" on public.swimmers;
drop policy if exists "Team staff manage team sessions" on public.training_sessions;
drop policy if exists "Team staff manage sections" on public.training_sections;
drop policy if exists "Team staff manage rows" on public.training_rows;
drop policy if exists "Team staff manage land rows" on public.training_land_rows;
drop policy if exists "Team staff manage warmup rows" on public.training_warmup_land_rows;
drop policy if exists "Team staff manage attendance" on public.training_attendance;
drop policy if exists "Team staff read feedback" on public.training_feedback;

drop policy if exists "Team staff read teams" on public.teams;
do $$ begin
  if to_regclass('public.training_set_times') is not null then
    execute 'drop policy if exists "Team staff manage set times" on public.training_set_times';
  end if;
end $$;

create or replace function public.my_teams()
returns table (id uuid, name text, is_coach boolean)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.name::text, true from public.teams t where t.coach_id = auth.uid()
  union
  select t.id, t.name::text, false from public.teams t join public.team_members tm on tm.team_id = t.id where tm.athlete_id = auth.uid()
  order by 2;
$$;

create or replace function public.can_see_team_content(p_coach_id uuid, p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_coach_id = auth.uid()
    or (p_team_id is null and public.athlete_has_coach(p_coach_id))
    or (p_team_id is not null and public.is_team_member(p_team_id));
$$;

drop policy if exists "Team staff read starts" on public.competition_starts;
drop policy if exists "Team staff read standards" on public.qualifying_standards;
drop policy if exists "Team staff read qualifying times" on public.qualifying_times;
create or replace function public.entry_registrations_for_coach(p_entry_id uuid)
returns table (athlete_id uuid, first_name text, last_name text, note text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select r.athlete_id, p.first_name::text, p.last_name::text, r.note, r.created_at
  from public.calendar_registrations r
  join public.calendar_entries e on e.id = r.entry_id
  join public.profiles p on p.id = r.athlete_id
  where r.entry_id = p_entry_id and e.coach_id = auth.uid()
  order by r.created_at;
$$;
