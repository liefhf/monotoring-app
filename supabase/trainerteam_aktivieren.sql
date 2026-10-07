-- =====================================================================
-- Skript 26: Trainerteam AKTIVIEREN (mehrere Trainer je Team)
--
-- ERST AUSFUEHREN, WENN
--   1. Skript 25 (sicherheit_trainerteam.sql) gelaufen ist,
--   2. dessen Pruefabfrage angesehen wurde (Athleten, deren Stammtrainer
--      nicht der Haupttrainer ihres Teams ist - diese sieht der
--      Haupttrainer NACH diesem Skript),
--   3. eine Datensicherung heruntergeladen wurde.
--
-- Aendert KEINE Daten. Es aendert Zugriffsregeln:
--   * Wer bisher Zugriff hatte, behaelt ihn (Stammtrainer, Haupttrainer).
--   * NEU: Haupttrainer sehen alle Athleten ihrer Teams; weitere Trainer
--     aus team_coaches sehen die Athleten der Teams, denen sie aktiv
--     zugeordnet sind - inkl. deren Vorgeschichte (Zeiten, Befinden,
--     Gesundheit), weil es um dieselbe Person geht.
--   * Entzug (revoked_at gesetzt) oder Athlet verlaesst das Team:
--     Zugriff endet sofort, auch auf alte Daten.
--   * Athleten in Teams aufnehmen darf weiterhin nur der Stammtrainer.
--     So kann niemand ueber ein zweites Team Zugriff "weiterreichen".
--   * Stammdaten des Athleten (swimmers) aendert nur der Stammtrainer.
--
-- Rueckweg: Skript 26_zurueck (trainerteam_zuruecksetzen.sql) stellt die
-- alten Funktionen und Regeln wieder her.
-- =====================================================================

-- 1) Aufnahme in Teams: nur Stammtrainer, nur in Teams, in denen er Trainer ist.
--    Entfernen: Haupttrainer des Teams oder Stammtrainer.
drop policy if exists "Coaches manage own team swimmers" on public.team_swimmers;
drop policy if exists "Team staff read team swimmers" on public.team_swimmers;
drop policy if exists "Primary coach adds to own teams" on public.team_swimmers;
drop policy if exists "Owner or primary coach removes from team" on public.team_swimmers;

create policy "Team staff read team swimmers"
  on public.team_swimmers for select to authenticated
  using (public.is_team_staff(team_id) or public.coach_is_primary(swimmer_id));

create policy "Primary coach adds to own teams"
  on public.team_swimmers for insert to authenticated
  with check (public.is_team_staff(team_id) and public.coach_is_primary(swimmer_id));

create policy "Owner or primary coach removes from team"
  on public.team_swimmers for delete to authenticated
  using (public.is_team_owner(team_id) or public.coach_is_primary(swimmer_id));

-- 2) Athleten-Zugriff (alle Regeln mit coach_owns_swimmer: Zeiten, Ziele,
--    Notizen, Gesundheit, Dokumente, Tests, Anwesenheit ...).
--    WICHTIG: erst NACH Schritt 1, damit coach_owns_swimmer nicht mehr
--    ueber die Team-Aufnahme entscheidet.
create or replace function public.coach_owns_swimmer(p_swimmer_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.coach_can_access_swimmer(p_swimmer_id);
$$;

create or replace function public.coach_owns_swimmer_folder(p_folder text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.swimmers s
    where s.id::text = p_folder and public.coach_can_access_swimmer(s.id)
  );
$$;

-- 3) Zugriff ueber den Login des Athleten (Befinden, Schmerzen, Feedback ...)
create or replace function public.coach_has_athlete(p_athlete_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.swimmers s
    where s.profile_id = p_athlete_id and public.coach_can_access_swimmer(s.id)
  )
  or exists (
    select 1 from public.team_members tm
    where tm.athlete_id = p_athlete_id and public.is_team_staff(tm.team_id)
  );
$$;

-- 4) Team-Inhalte (Kalender, Gruppenraum): Haupt- und weitere Trainer
create or replace function public.is_team_coach(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_team_staff(p_team_id);
$$;

-- 5) Stammdaten: weitere Trainer duerfen Athleten LESEN (Name, Jahrgang),
--    aber nicht aendern. Bestehende Regeln auf swimmers bleiben.
drop policy if exists "Team staff read swimmers" on public.swimmers;
create policy "Team staff read swimmers"
  on public.swimmers for select to authenticated
  using (public.coach_can_access_swimmer(id));

-- 6) Trainingseinheiten des Teams: alle Trainer des Teams planen gemeinsam.
--    Als Verfasser (coach_id) ist nur ein Trainer DIESES Teams erlaubt.
create or replace function public.team_has_staff(p_team_id uuid, p_coach_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.teams t where t.id = p_team_id and t.coach_id = p_coach_id)
      or exists (
        select 1 from public.team_coaches tc
        where tc.team_id = p_team_id and tc.coach_id = p_coach_id and tc.revoked_at is null
      );
$$;
revoke all on function public.team_has_staff(uuid, uuid) from public, anon;
grant execute on function public.team_has_staff(uuid, uuid) to authenticated;

drop policy if exists "Team staff manage team sessions" on public.training_sessions;
create policy "Team staff manage team sessions"
  on public.training_sessions for all to authenticated
  using (team_id is not null and public.is_team_staff(team_id))
  with check (team_id is not null and public.is_team_staff(team_id) and public.team_has_staff(team_id, coach_id));

create or replace function public.is_session_staff(p_session_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.training_sessions s
    where s.id = p_session_id
      and (s.coach_id = auth.uid() or (s.team_id is not null and public.is_team_staff(s.team_id)))
  );
$$;
revoke all on function public.is_session_staff(uuid) from public, anon;
grant execute on function public.is_session_staff(uuid) to authenticated;

drop policy if exists "Team staff manage sections" on public.training_sections;
create policy "Team staff manage sections"
  on public.training_sections for all to authenticated
  using (public.is_session_staff(training_session_id))
  with check (public.is_session_staff(training_session_id));

drop policy if exists "Team staff manage rows" on public.training_rows;
create policy "Team staff manage rows"
  on public.training_rows for all to authenticated
  using (exists (select 1 from public.training_sections x where x.id = section_id and public.is_session_staff(x.training_session_id)))
  with check (exists (select 1 from public.training_sections x where x.id = section_id and public.is_session_staff(x.training_session_id)));

drop policy if exists "Team staff manage land rows" on public.training_land_rows;
create policy "Team staff manage land rows"
  on public.training_land_rows for all to authenticated
  using (public.is_session_staff(training_session_id))
  with check (public.is_session_staff(training_session_id));

drop policy if exists "Team staff manage warmup rows" on public.training_warmup_land_rows;
create policy "Team staff manage warmup rows"
  on public.training_warmup_land_rows for all to authenticated
  using (public.is_session_staff(training_session_id))
  with check (public.is_session_staff(training_session_id));

drop policy if exists "Team staff manage attendance" on public.training_attendance;
create policy "Team staff manage attendance"
  on public.training_attendance for all to authenticated
  using (public.is_session_staff(training_session_id) and public.coach_can_access_swimmer(swimmer_id))
  with check (public.is_session_staff(training_session_id) and public.coach_can_access_swimmer(swimmer_id));

drop policy if exists "Team staff read feedback" on public.training_feedback;
create policy "Team staff read feedback"
  on public.training_feedback for select to authenticated
  using (public.is_session_staff(training_session_id) and public.coach_has_athlete(athlete_id));

-- 7) Teams: weitere Trainer sehen ihre Teams (Umschalter, Berichte)
drop policy if exists "Team staff read teams" on public.teams;
create policy "Team staff read teams"
  on public.teams for select to authenticated
  using (public.is_team_staff(id));

create or replace function public.my_teams()
returns table (id uuid, name text, is_coach boolean)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.name::text, true
  from public.teams t
  where public.is_team_staff(t.id)
  union
  select t.id, t.name::text, false
  from public.teams t
  join public.team_members tm on tm.team_id = t.id
  where tm.athlete_id = auth.uid()
  order by 2;
$$;

-- 8) Team-Inhalte (Kalender, News) des Haupttrainers sehen auch weitere Trainer
create or replace function public.can_see_team_content(p_coach_id uuid, p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    p_coach_id = auth.uid()
    or (p_team_id is null and public.athlete_has_coach(p_coach_id))
    or (p_team_id is not null and (public.is_team_member(p_team_id) or public.is_team_staff(p_team_id)));
$$;

-- 9) Serienzeiten je Einheit
do $$
begin
  if to_regclass('public.training_set_times') is not null then
    execute 'drop policy if exists "Team staff manage set times" on public.training_set_times';
    execute 'create policy "Team staff manage set times" on public.training_set_times for all to authenticated
      using (public.is_session_staff(training_session_id) and public.coach_can_access_swimmer(swimmer_id))
      with check (public.is_session_staff(training_session_id) and public.coach_can_access_swimmer(swimmer_id))';
  end if;
end $$;

-- Bewusst NICHT geteilt (bleibt beim jeweiligen Trainer): eigene Wettkaempfe und
-- Wettkampf-Feedback, Pflichtzeiten-Listen, Staffeln, Anmeldelisten zu Terminen.
-- Ergebnisse der Athleten (swimmer_results) sehen alle Trainer mit Zugriff auf den Athleten.
