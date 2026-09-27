-- =====================================================================
-- Kapitel 1 - Grundbegriffe
--
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Das Skript ist wiederholbar: "if not exists" / "or replace" sorgen
-- dafuer, dass ein zweiter Lauf nichts kaputt macht.
--
-- Bestehende Tabellen bekommen nur neue, optionale Spalten.
-- Es wird nichts geloescht und keine bestehende Policy veraendert.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1.1 Belastung vs. Beanspruchung
-- Geplante Belastung der Einheit auf der RPE-Skala (1-10).
-- Die gemeldete Beanspruchung steht bereits in training_feedback.rpe.
-- ---------------------------------------------------------------------
alter table public.training_sessions
  add column if not exists planned_rpe smallint
  check (planned_rpe between 1 and 10);


-- ---------------------------------------------------------------------
-- 1.4 Kernziel-Tags fuer Landtraining und Praevention
-- Die erlaubten Werte stehen in lib/kapitel1.ts (CORE_GOALS).
-- ---------------------------------------------------------------------
alter table public.training_sessions
  add column if not exists core_goals text[] not null default '{}';


-- ---------------------------------------------------------------------
-- 1.5 Abschnitte als "Ueben" oder "Training" kennzeichnen
-- null = nicht gekennzeichnet (alte Einheiten bleiben gueltig)
-- ---------------------------------------------------------------------
alter table public.training_sections
  add column if not exists practice_mode text
  check (practice_mode in ('ueben', 'training'));


-- ---------------------------------------------------------------------
-- Hilfsfunktion: Hat der angemeldete Coach diesen Athleten in einem
-- seiner Teams? Gleiches Muster wie die vorhandenen Hilfsfunktionen
-- (STABLE SECURITY DEFINER, leerer search_path).
-- ---------------------------------------------------------------------
create or replace function public.coach_has_athlete(p_athlete_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.athlete_id = p_athlete_id
      and t.coach_id = auth.uid()
  );
$$;

revoke all on function public.coach_has_athlete(uuid) from public, anon;
grant execute on function public.coach_has_athlete(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 1.6 Entwicklungsverlauf bei Jugendlichen
-- ---------------------------------------------------------------------
create table if not exists public.growth_measurements (
  id                uuid primary key default gen_random_uuid(),
  athlete_id        uuid not null references public.profiles(id) on delete cascade,
  measured_on       date not null,
  height_cm         numeric(5,1) not null check (height_cm between 80 and 230),
  sitting_height_cm numeric(5,1) check (sitting_height_cm between 40 and 130),
  weight_kg         numeric(5,1) check (weight_kg between 15 and 200),
  note              text,
  created_by        uuid default auth.uid() references auth.users(id),
  created_at        timestamptz not null default now(),
  unique (athlete_id, measured_on)
);

alter table public.growth_measurements enable row level security;

drop policy if exists "Athletes read own growth" on public.growth_measurements;
create policy "Athletes read own growth"
  on public.growth_measurements for select
  to authenticated
  using (athlete_id = auth.uid());

drop policy if exists "Coaches read growth of own athletes" on public.growth_measurements;
create policy "Coaches read growth of own athletes"
  on public.growth_measurements for select
  to authenticated
  using (public.is_coach() and public.coach_has_athlete(athlete_id));

drop policy if exists "Coaches insert growth of own athletes" on public.growth_measurements;
create policy "Coaches insert growth of own athletes"
  on public.growth_measurements for insert
  to authenticated
  with check (public.is_coach() and public.coach_has_athlete(athlete_id));

drop policy if exists "Coaches update growth of own athletes" on public.growth_measurements;
create policy "Coaches update growth of own athletes"
  on public.growth_measurements for update
  to authenticated
  using (public.is_coach() and public.coach_has_athlete(athlete_id))
  with check (public.is_coach() and public.coach_has_athlete(athlete_id));

drop policy if exists "Coaches delete growth of own athletes" on public.growth_measurements;
create policy "Coaches delete growth of own athletes"
  on public.growth_measurements for delete
  to authenticated
  using (public.is_coach() and public.coach_has_athlete(athlete_id));


-- ---------------------------------------------------------------------
-- Geburtsdatum und Geschlecht setzen (fuer die Reifeschaetzung)
--
-- profiles hat bewusst keine UPDATE-Policy. Statt eine breite Regel
-- aufzumachen, gibt es diese eine Funktion: Sie darf NUR birth_date
-- und gender aendern und NUR bei Athleten aus den eigenen Teams.
-- Der Datentyp von profiles.gender wird zur Laufzeit gelesen, damit
-- es mit text und mit einem Enum funktioniert.
-- ---------------------------------------------------------------------
create or replace function public.coach_set_athlete_basics(
  p_athlete_id uuid,
  p_birth_date date,
  p_gender     text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_gender_type text;
begin
  if not public.is_coach() or not public.coach_has_athlete(p_athlete_id) then
    raise exception 'Kein Zugriff auf diesen Athleten';
  end if;

  if p_gender is not null and p_gender not in ('male', 'female') then
    raise exception 'Ungueltiger Wert fuer gender';
  end if;

  select pg_catalog.format_type(a.atttypid, a.atttypmod)
    into v_gender_type
    from pg_catalog.pg_attribute a
   where a.attrelid = 'public.profiles'::regclass
     and a.attname  = 'gender';

  execute format(
    'update public.profiles
        set birth_date = coalesce($1, birth_date),
            gender     = coalesce($2::%s, gender)
      where id = $3
        and role = ''athlete''',
    v_gender_type
  )
  using p_birth_date, p_gender, p_athlete_id;
end;
$$;

revoke all on function public.coach_set_athlete_basics(uuid, date, text) from public, anon;
grant execute on function public.coach_set_athlete_basics(uuid, date, text) to authenticated;
