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
