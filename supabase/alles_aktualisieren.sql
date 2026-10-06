-- =====================================================================
-- ALLES AKTUALISIEREN (Skripte 1 und 12 bis 22 in einem)
--
-- Spielt alle neueren Erweiterungen auf einmal ein. Bereits Vorhandenes
-- wird uebersprungen ("if not exists" / "or replace") - mehrfach
-- ausfuehren ist ungefaehrlich. Nur additiv: es werden keine vorhandenen
-- Daten geaendert oder geloescht.
--
-- Voraussetzung: Skripte 2 bis 11 wurden schon einmal ausgefuehrt
-- (Grundausstattung). Pruefen mit status_pruefen.sql.
--
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Generiert aus den Einzelskripten - bei Aenderungen neu erzeugen.
-- =====================================================================




-- #####################################################################
-- kapitel1_grundbegriffe.sql
-- #####################################################################
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


-- #####################################################################
-- pflichtzeiten_beide_bahnen.sql
-- #####################################################################
-- =====================================================================
-- Pflichtzeiten: 25m- UND 50m-Zeiten anerkennen
--
-- Neue, optionale Spalte an qualifying_standards:
--   count_both_pools = true -> fuer diese Liste zaehlen Zeiten von
--   beiden Bahnlaengen (z. B. Hessische Meisterschaften).
--   leer/false -> wie bisher nur die Bahn der Liste.
--
-- Nur additiv: bestehende Listen bleiben unveraendert.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

alter table public.qualifying_standards
  add column if not exists count_both_pools boolean;


-- #####################################################################
-- disqualifikationen.sql
-- #####################################################################
-- =====================================================================
-- Starts ohne Zeit: Disqualifikation (DS), Abmeldung (AB),
-- nicht angetreten (NA) - mit Grund.
--
-- Neue Tabelle, nur additiv. Bestehende Daten bleiben unveraendert.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

create table if not exists public.swimmer_non_finishes (
  id           uuid primary key default gen_random_uuid(),
  swimmer_id   uuid not null references public.swimmers(id) on delete cascade,
  result_date  date not null,
  location     text,
  pool_length  smallint not null check (pool_length in (25, 50)),
  distance     smallint not null check (distance > 0),
  stroke       text not null check (stroke in ('freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley')),
  status       text not null check (status in ('DS', 'AB', 'NA')),
  reason       text,
  created_at   timestamptz not null default now()
);

create index if not exists swimmer_non_finishes_swimmer_idx
  on public.swimmer_non_finishes (swimmer_id, result_date);

alter table public.swimmer_non_finishes enable row level security;

drop policy if exists "Coaches manage non-finishes of own swimmers" on public.swimmer_non_finishes;
create policy "Coaches manage non-finishes of own swimmers"
  on public.swimmer_non_finishes for all
  to authenticated
  using (public.coach_owns_swimmer(swimmer_id))
  with check (public.coach_owns_swimmer(swimmer_id));


-- #####################################################################
-- athleten_fokus.sql
-- #####################################################################
-- =====================================================================
-- Trainingsfokus je Athlet: Hauptlagen, Streckenbereich, Notiz
--
-- Neue, optionale Spalten an swimmers (leer = kein Fokus festgelegt,
-- dann wird wie bisher alles ausgewertet). Nur additiv.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

alter table public.swimmers add column if not exists focus_strokes   text[];
alter table public.swimmers add column if not exists focus_distances text[];
alter table public.swimmers add column if not exists focus_note      text;


-- #####################################################################
-- athleten_fokus_strecken.sql
-- #####################################################################
-- =====================================================================
-- Trainingsfokus je Athlet: einzelne Strecken (z. B. 100 R, 200 R, 50 F)
--
-- Neue, optionale Spalte an swimmers. Format je Eintrag: "100-backstroke".
-- Nur additiv. Einmal im Supabase SQL-Editor ausfuehren
-- (nach athleten_fokus.sql).
-- =====================================================================

alter table public.swimmers add column if not exists focus_events text[];


-- #####################################################################
-- training_notizen.sql
-- #####################################################################
-- =====================================================================
-- Notizen zur Trainingseinheit (erscheinen auch im Ausdruck)
--
-- Neue, optionale Spalte an training_sessions. Nur additiv.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

alter table public.training_sessions add column if not exists notes text;


-- #####################################################################
-- anwesenheit.sql
-- #####################################################################
-- =====================================================================
-- Anwesenheitsliste je Trainingseinheit
--
-- Neue Tabelle, nur additiv. Bestehende Daten bleiben unveraendert.
-- Eintraege entstehen nur, wenn der Coach in der App die Anwesenheit
-- einer Einheit abhakt.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

create table if not exists public.training_attendance (
  id                   uuid primary key default gen_random_uuid(),
  training_session_id  uuid not null references public.training_sessions(id) on delete cascade,
  swimmer_id           uuid not null references public.swimmers(id) on delete cascade,
  status               text not null check (status in ('anwesend', 'entschuldigt', 'krank', 'fehlt')),
  note                 text,
  updated_at           timestamptz not null default now(),
  unique (training_session_id, swimmer_id)
);

create index if not exists training_attendance_swimmer_idx
  on public.training_attendance (swimmer_id);

alter table public.training_attendance enable row level security;

drop policy if exists "Coaches manage attendance of own sessions" on public.training_attendance;
create policy "Coaches manage attendance of own sessions"
  on public.training_attendance for all
  to authenticated
  using (
    public.coach_owns_swimmer(swimmer_id)
    and exists (
      select 1 from public.training_sessions s
      where s.id = training_session_id and s.coach_id = auth.uid()
    )
  )
  with check (
    public.coach_owns_swimmer(swimmer_id)
    and exists (
      select 1 from public.training_sessions s
      where s.id = training_session_id and s.coach_id = auth.uid()
    )
  );


-- #####################################################################
-- wettkampf_fehler.sql
-- #####################################################################
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


-- #####################################################################
-- laktattests.sql
-- #####################################################################
-- =====================================================================
-- Laktat-Stufentests (z. B. 5 x 200 m ansteigend) je Athlet
--
-- Neue Tabelle, nur additiv. Stufen als JSON:
--   [{"time_ms": 165000, "lactate": 1.4, "heart_rate": 150}, ...]
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

create table if not exists public.lactate_tests (
  id             uuid primary key default gen_random_uuid(),
  swimmer_id     uuid not null references public.swimmers(id) on delete cascade,
  test_date      date not null,
  stroke         text not null default 'freestyle'
                 check (stroke in ('freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley')),
  pool_length    smallint not null default 25 check (pool_length in (25, 50)),
  step_distance  smallint not null default 200 check (step_distance > 0),
  rest_lactate   numeric(4,1) check (rest_lactate >= 0),
  steps          jsonb not null default '[]',
  note           text,
  created_at     timestamptz not null default now()
);

create index if not exists lactate_tests_swimmer_idx on public.lactate_tests (swimmer_id, test_date);

alter table public.lactate_tests enable row level security;

drop policy if exists "Coaches manage lactate tests of own swimmers" on public.lactate_tests;
create policy "Coaches manage lactate tests of own swimmers"
  on public.lactate_tests for all
  to authenticated
  using (public.coach_owns_swimmer(swimmer_id))
  with check (public.coach_owns_swimmer(swimmer_id));


-- #####################################################################
-- wettkampftag.sql
-- #####################################################################
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


-- #####################################################################
-- testbatterie.sql
-- #####################################################################
-- =====================================================================
-- Testbatterie (Athletik- und Schwimmtests) je Athlet
--
-- Neue Tabelle, nur additiv. test_code siehe lib/fitnessTests.ts.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

create table if not exists public.fitness_tests (
  id          uuid primary key default gen_random_uuid(),
  swimmer_id  uuid not null references public.swimmers(id) on delete cascade,
  test_date   date not null,
  test_code   text not null,
  value       numeric(8,2) not null,
  note        text,
  created_at  timestamptz not null default now()
);

create index if not exists fitness_tests_swimmer_idx on public.fitness_tests (swimmer_id, test_code, test_date);

alter table public.fitness_tests enable row level security;

drop policy if exists "Coaches manage fitness tests of own swimmers" on public.fitness_tests;
create policy "Coaches manage fitness tests of own swimmers"
  on public.fitness_tests for all
  to authenticated
  using (public.coach_owns_swimmer(swimmer_id))
  with check (public.coach_owns_swimmer(swimmer_id));


-- #####################################################################
-- mein_fortschritt.sql
-- #####################################################################
-- =====================================================================
-- "Mein Fortschritt" fuer Athleten: eigene Daten lesen
--
-- Athleten duerfen Ergebnisse, Pflichtzeiten und Laktattests nicht direkt
-- lesen. Diese Funktionen geben jedem angemeldeten Athleten NUR seine
-- eigenen Daten (ueber swimmers.profile_id = eigener Login) bzw. die
-- Pflichtzeiten-Listen seines Trainers. Nur lesen, nur additiv.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

-- eigener Athleten-Datensatz als JSON (enthaelt auch Fokus-Spalten, falls vorhanden)
create or replace function public.my_swimmer()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select to_jsonb(s)
  from public.swimmers s
  where s.profile_id = auth.uid()
  limit 1;
$$;

create or replace function public.my_results()
returns setof public.swimmer_results
language sql stable security definer set search_path = ''
as $$
  select r.*
  from public.swimmer_results r
  join public.swimmers s on s.id = r.swimmer_id
  where s.profile_id = auth.uid();
$$;

create or replace function public.my_qualifying_standards()
returns setof public.qualifying_standards
language sql stable security definer set search_path = ''
as $$
  select q.*
  from public.qualifying_standards q
  where q.coach_id in (select s.coach_id from public.swimmers s where s.profile_id = auth.uid());
$$;

create or replace function public.my_qualifying_times()
returns setof public.qualifying_times
language sql stable security definer set search_path = ''
as $$
  select t.*
  from public.qualifying_times t
  join public.qualifying_standards q on q.id = t.standard_id
  where q.coach_id in (select s.coach_id from public.swimmers s where s.profile_id = auth.uid());
$$;

revoke all on function public.my_swimmer() from public, anon;
revoke all on function public.my_results() from public, anon;
revoke all on function public.my_qualifying_standards() from public, anon;
revoke all on function public.my_qualifying_times() from public, anon;
grant execute on function public.my_swimmer() to authenticated;
grant execute on function public.my_results() to authenticated;
grant execute on function public.my_qualifying_standards() to authenticated;
grant execute on function public.my_qualifying_times() to authenticated;

-- Laktattests (nur wenn laktattests.sql schon lief)
do $$
begin
  if to_regclass('public.lactate_tests') is not null then
    execute $f$
      create or replace function public.my_lactate_tests()
      returns setof public.lactate_tests
      language sql stable security definer set search_path = ''
      as $body$
        select l.*
        from public.lactate_tests l
        join public.swimmers s on s.id = l.swimmer_id
        where s.profile_id = auth.uid();
      $body$;
    $f$;
    execute 'revoke all on function public.my_lactate_tests() from public, anon';
    execute 'grant execute on function public.my_lactate_tests() to authenticated';
  end if;
end $$;
