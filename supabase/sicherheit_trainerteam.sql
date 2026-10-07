-- =====================================================================
-- Skript 25: Sicherheit ergaenzen und Trainerteam VORBEREITEN
--
-- Nur additiv. Aendert, loescht oder ergaenzt KEINE vorhandenen Daten.
-- Es aendert auch noch keine bestehende Zugriffsregel: Wer heute etwas
-- sieht, sieht nach diesem Skript genau dasselbe.
--
-- Inhalt:
--   A) Rolle (coach/athlete) kann nicht mehr ueber die App geaendert
--      werden (Schutz gegen "Athlet macht sich selbst zum Trainer").
--   B) Check-in: Schmerzfrage "nicht angegeben" getrennt speicherbar
--      (neue optionale Spalte, alte Eintraege bleiben leer).
--   C) Athleten duerfen ihre EIGENE Anwesenheit lesen (nur lesen), damit
--      sie fuer verpasste Einheiten nicht nach Feedback gefragt werden.
--   D) Tabelle team_coaches (weitere Trainer je Team) und neue
--      Hilfsfunktionen. Sie werden erst mit Skript 26 wirksam.
--
-- Vorher: Einstellungen -> "Datensicherung herunterladen".
-- Im Supabase SQL-Editor ausfuehren. Wiederholbar.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Rolle schuetzen
-- Die App aendert profiles.role nie. Aenderungen sind nur noch im
-- Supabase-Dashboard/SQL-Editor moeglich (dort ist auth.uid() leer).
-- ---------------------------------------------------------------------
create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and new.role is distinct from old.role then
    raise exception 'Die Rolle kann nur von der Vereinsverwaltung in Supabase geaendert werden.'
      using errcode = '42501';
  end if;
  if auth.uid() is not null and new.id is distinct from old.id then
    raise exception 'Die Profil-ID kann nicht geaendert werden.' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.profiles_protect_role() from public, anon, authenticated;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.profiles_protect_role();

-- ---------------------------------------------------------------------
-- B) Schmerzfrage: 'ja' | 'nein' | 'keine_angabe' (optional)
-- ---------------------------------------------------------------------
alter table public.befinden_entries
  add column if not exists pain_answer text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'befinden_entries_pain_answer_check'
      and conrelid = 'public.befinden_entries'::regclass
  ) then
    alter table public.befinden_entries
      add constraint befinden_entries_pain_answer_check
      check (pain_answer is null or pain_answer in ('ja', 'nein', 'keine_angabe'));
  end if;
end $$;

-- ---------------------------------------------------------------------
-- C) Athlet liest eigene Anwesenheit (nur SELECT)
-- ---------------------------------------------------------------------
drop policy if exists "Athletes read own attendance" on public.training_attendance;
create policy "Athletes read own attendance"
  on public.training_attendance for select
  to authenticated
  using (
    exists (
      select 1 from public.swimmers s
      where s.id = training_attendance.swimmer_id
        and s.profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- D) Trainerteam (noch nicht wirksam)
--
-- Modell:
--   * Haupttrainer eines Teams  = teams.coach_id (wie bisher)
--   * Stammtrainer eines Athleten = swimmers.coach_id (wie bisher)
--   * Weitere Trainer eines Teams = Zeilen in team_coaches
--     (nur der Haupttrainer traegt sie ein; Entzug ueber revoked_at,
--     damit nachvollziehbar bleibt, wer wann Zugriff hatte).
-- Es werden KEINE vorhandenen Zuordnungen kopiert: Haupt- und
-- Stammtrainer bleiben implizit, team_coaches startet leer.
-- ---------------------------------------------------------------------
create table if not exists public.team_coaches (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  coach_id    uuid not null references public.profiles(id) on delete cascade,
  added_by    uuid default auth.uid(),
  added_at    timestamptz not null default now(),
  revoked_at  timestamptz,
  unique (team_id, coach_id)
);

create index if not exists team_coaches_coach_idx on public.team_coaches (coach_id) where revoked_at is null;

alter table public.team_coaches enable row level security;

-- Haupttrainer eines Teams?
create or replace function public.is_team_owner(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.teams t where t.id = p_team_id and t.coach_id = auth.uid());
$$;

-- Haupttrainer ODER aktiver weiterer Trainer des Teams?
create or replace function public.is_team_staff(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_team_owner(p_team_id)
      or exists (
        select 1 from public.team_coaches tc
        where tc.team_id = p_team_id and tc.coach_id = auth.uid() and tc.revoked_at is null
      );
$$;

-- Darf der angemeldete Trainer diesen Athleten sehen/bearbeiten?
-- Stammtrainer, Haupttrainer oder aktiver weiterer Trainer eines Teams,
-- in dem der Athlet AKTUELL ist.
create or replace function public.coach_can_access_swimmer(p_swimmer_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.swimmers s where s.id = p_swimmer_id and s.coach_id = auth.uid())
      or exists (
        select 1
        from public.team_swimmers ts
        where ts.swimmer_id = p_swimmer_id
          and public.is_team_staff(ts.team_id)
      );
$$;

-- Ist der angemeldete Trainer Stammtrainer dieses Athleten?
-- Nur der Stammtrainer darf einen Athleten in Teams aufnehmen; so kann
-- ein weiterer Trainer fremde Athleten nicht in eigene Teams "mitnehmen".
create or replace function public.coach_is_primary(p_swimmer_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.swimmers s where s.id = p_swimmer_id and s.coach_id = auth.uid());
$$;

-- Ordner-Pruefung aus Skript 23 nur fuer angemeldete Nutzer
revoke all on function public.coach_owns_swimmer_folder(text) from public, anon;
grant execute on function public.coach_owns_swimmer_folder(text) to authenticated;

revoke all on function public.is_team_owner(uuid) from public, anon;
revoke all on function public.is_team_staff(uuid) from public, anon;
revoke all on function public.coach_can_access_swimmer(uuid) from public, anon;
revoke all on function public.coach_is_primary(uuid) from public, anon;
grant execute on function public.is_team_owner(uuid) to authenticated;
grant execute on function public.is_team_staff(uuid) to authenticated;
grant execute on function public.coach_can_access_swimmer(uuid) to authenticated;
grant execute on function public.coach_is_primary(uuid) to authenticated;

drop policy if exists "Team staff read team coaches" on public.team_coaches;
create policy "Team staff read team coaches"
  on public.team_coaches for select
  to authenticated
  using (public.is_team_staff(team_id) or coach_id = auth.uid());

-- Nur der Haupttrainer fuegt hinzu, entzieht (revoked_at) oder entfernt.
drop policy if exists "Team owner manages team coaches" on public.team_coaches;
create policy "Team owner manages team coaches"
  on public.team_coaches for all
  to authenticated
  using (public.is_team_owner(team_id))
  with check (public.is_team_owner(team_id) and coach_id <> auth.uid());

-- Nur Trainer-Profile koennen weitere Trainer sein
create or replace function public.team_coaches_check_role()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profiles p where p.id = new.coach_id and p.role::text = 'coach') then
    raise exception 'Nur Trainer-Konten koennen einem Team als Trainer zugeordnet werden.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.team_coaches_check_role() from public, anon, authenticated;

drop trigger if exists team_coaches_check_role on public.team_coaches;
create trigger team_coaches_check_role
  before insert or update of coach_id on public.team_coaches
  for each row execute function public.team_coaches_check_role();

-- ---------------------------------------------------------------------
-- Pruefabfrage (liest nur): Athleten in einem Team, dessen Haupttrainer
-- NICHT ihr Stammtrainer ist. Diese Athleten sieht der Haupttrainer heute
-- nicht. Nach Skript 26 sieht er sie. Bitte die Liste vorher ansehen.
-- ---------------------------------------------------------------------
select t.name as team, count(*) as athleten_mit_anderem_stammtrainer
from public.team_swimmers ts
join public.teams t on t.id = ts.team_id
join public.swimmers s on s.id = ts.swimmer_id
where s.coach_id is distinct from t.coach_id
group by t.name
order by t.name;
