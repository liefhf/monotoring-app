-- =====================================================================
-- ALLES AKTUALISIEREN (Skripte 1, 12 bis 25, Serienzeiten und 27 in einem; 26 NICHT enthalten)
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


-- ---------------------------------------------------------------------
-- 23 · gesundheit_dokumente.sql
-- ---------------------------------------------------------------------
create table if not exists public.health_events (
  id                 uuid primary key default gen_random_uuid(),
  swimmer_id         uuid not null references public.swimmers(id) on delete cascade,
  kind               text not null default 'verletzung'
                       check (kind in ('verletzung', 'erkrankung', 'beschwerde', 'sonstiges')),
  title              text not null,
  body_region        text,
  availability       text not null default 'eingeschraenkt'
                       check (availability in ('voll', 'eingeschraenkt', 'pause')),
  restriction        text,
  start_date         date not null default current_date,
  end_date           date,
  clearance          text not null default 'nicht_noetig'
                       check (clearance in ('nicht_noetig', 'offen', 'erteilt')),
  note               text,
  visible_to_athlete boolean not null default true,
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index if not exists health_events_swimmer_idx on public.health_events (swimmer_id, start_date desc);

alter table public.health_events enable row level security;

drop policy if exists "Coaches manage health events of own swimmers" on public.health_events;
create policy "Coaches manage health events of own swimmers"
  on public.health_events for all
  to authenticated
  using (public.coach_owns_swimmer(swimmer_id))
  with check (public.coach_owns_swimmer(swimmer_id));

drop policy if exists "Athletes read own visible health events" on public.health_events;
create policy "Athletes read own visible health events"
  on public.health_events for select
  to authenticated
  using (
    visible_to_athlete
    and exists (select 1 from public.swimmers s where s.id = swimmer_id and s.profile_id = auth.uid())
  );


create table if not exists public.athlete_documents (
  id           uuid primary key default gen_random_uuid(),
  swimmer_id   uuid not null references public.swimmers(id) on delete cascade,
  doc_type     text not null default 'sonstiges'
                 check (doc_type in ('sportattest', 'einverstaendnis', 'startpass', 'sonstiges')),
  title        text not null,
  valid_until  date,
  file_path    text,
  note         text,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now()
);

create index if not exists athlete_documents_swimmer_idx on public.athlete_documents (swimmer_id);
create index if not exists athlete_documents_valid_idx on public.athlete_documents (valid_until) where valid_until is not null;

alter table public.athlete_documents enable row level security;

drop policy if exists "Coaches manage documents of own swimmers" on public.athlete_documents;
create policy "Coaches manage documents of own swimmers"
  on public.athlete_documents for all
  to authenticated
  using (public.coach_owns_swimmer(swimmer_id))
  with check (public.coach_owns_swimmer(swimmer_id));

drop policy if exists "Athletes read own documents" on public.athlete_documents;
create policy "Athletes read own documents"
  on public.athlete_documents for select
  to authenticated
  using (exists (select 1 from public.swimmers s where s.id = swimmer_id and s.profile_id = auth.uid()));


-- ---------------------------------------------------------------------
-- Privater Speicher fuer Dateien. Pfad: <swimmer_id>/<datei>.
-- Nur der zustaendige Coach darf hoch- und herunterladen.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('athlete-documents', 'athlete-documents', false)
on conflict (id) do nothing;

-- Ordnername (Text) statt uuid-Cast: ein Ordner, der keine uuid ist,
-- fuehrt so nie zu einem Fehler, sondern einfach zu "kein Zugriff".
create or replace function public.coach_owns_swimmer_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.swimmers s
    where s.id::text = p_folder and s.coach_id = auth.uid()
  );
$$;

drop policy if exists "Coaches read own athlete documents" on storage.objects;
create policy "Coaches read own athlete documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'athlete-documents' and public.coach_owns_swimmer_folder((storage.foldername(name))[1]));

drop policy if exists "Coaches upload own athlete documents" on storage.objects;
create policy "Coaches upload own athlete documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'athlete-documents' and public.coach_owns_swimmer_folder((storage.foldername(name))[1]));

drop policy if exists "Coaches delete own athlete documents" on storage.objects;
create policy "Coaches delete own athlete documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'athlete-documents' and public.coach_owns_swimmer_folder((storage.foldername(name))[1]));


-- ---------------------------------------------------------------------
-- 24 · ziele_notizen.sql
-- ---------------------------------------------------------------------
create table if not exists public.athlete_goals (
  id                 uuid primary key default gen_random_uuid(),
  swimmer_id         uuid not null references public.swimmers(id) on delete cascade,
  kind               text not null default 'zeit' check (kind in ('zeit', 'technik', 'training')),
  title              text,
  distance           integer,
  stroke             text,
  pool_length        integer check (pool_length is null or pool_length in (25, 50)),
  target_ms          integer check (target_ms is null or target_ms > 0),
  due_date           date,
  achieved_at        date,
  visible_to_athlete boolean not null default true,
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  check (kind <> 'zeit' or (distance is not null and stroke is not null and target_ms is not null)),
  check (kind = 'zeit' or title is not null)
);

create index if not exists athlete_goals_swimmer_idx on public.athlete_goals (swimmer_id);

alter table public.athlete_goals enable row level security;

drop policy if exists "Coaches manage goals of own swimmers" on public.athlete_goals;
create policy "Coaches manage goals of own swimmers"
  on public.athlete_goals for all
  to authenticated
  using (public.coach_owns_swimmer(swimmer_id))
  with check (public.coach_owns_swimmer(swimmer_id));

drop policy if exists "Athletes read own visible goals" on public.athlete_goals;
create policy "Athletes read own visible goals"
  on public.athlete_goals for select
  to authenticated
  using (
    visible_to_athlete
    and exists (select 1 from public.swimmers s where s.id = swimmer_id and s.profile_id = auth.uid())
  );


create table if not exists public.athlete_notes (
  id          uuid primary key default gen_random_uuid(),
  swimmer_id  uuid not null references public.swimmers(id) on delete cascade,
  body        text not null check (length(trim(body)) > 0),
  pinned      boolean not null default false,
  created_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

create index if not exists athlete_notes_swimmer_idx on public.athlete_notes (swimmer_id, created_at desc);

alter table public.athlete_notes enable row level security;

drop policy if exists "Coaches manage notes of own swimmers" on public.athlete_notes;
create policy "Coaches manage notes of own swimmers"
  on public.athlete_notes for all
  to authenticated
  using (public.coach_owns_swimmer(swimmer_id))
  with check (public.coach_owns_swimmer(swimmer_id));



-- #####################################################################
-- sicherheit_trainerteam.sql
-- #####################################################################

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



-- #####################################################################
-- serienzeiten.sql
-- #####################################################################

-- =====================================================================
-- Serienzeiten je Trainingseinheit (z. B. 10x100 Hauptlage)
--
-- Neue Tabelle, nur additiv. Bestehende Daten bleiben unveraendert.
-- Eintraege entstehen nur, wenn der Coach in der App Zeiten einer
-- Serie eintraegt. Je Athlet und Serie eine Zeile, die Zeiten der
-- Wiederholungen als Liste (Millisekunden, null = nicht geschwommen).
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

create table if not exists public.training_set_times (
  id                   uuid primary key default gen_random_uuid(),
  training_session_id  uuid not null references public.training_sessions(id) on delete cascade,
  swimmer_id           uuid not null references public.swimmers(id) on delete cascade,
  set_label            text not null,
  stroke               text,
  interval_seconds     integer,
  times_ms             integer[] not null default '{}',
  note                 text,
  updated_at           timestamptz not null default now(),
  unique (training_session_id, swimmer_id, set_label)
);

create index if not exists training_set_times_swimmer_idx
  on public.training_set_times (swimmer_id, set_label);

alter table public.training_set_times enable row level security;

drop policy if exists "Coaches manage set times of own sessions" on public.training_set_times;
create policy "Coaches manage set times of own sessions"
  on public.training_set_times for all
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
-- training_speichern_serienzeiten.sql
-- #####################################################################

-- =====================================================================
-- Skript 27: Training sicher speichern, Serienzeiten mit Kontext,
--            Trainer im Team verwalten
--
-- Nur additiv: neue optionale Spalten (ohne Wert fuer Altbestand),
-- neue Funktionen und Regeln. Aendert, loescht oder ergaenzt KEINE
-- vorhandenen Daten. Voraussetzung: Skripte 16 (training_notizen),
-- Serienzeiten (serienzeiten.sql) und 25 sind eingespielt.
-- Vorher: Einstellungen -> "Datensicherung herunterladen".
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Training atomar speichern (kein Verlust, keine doppelten Serien)
--
-- content_version zaehlt jede gespeicherte Fassung. Die Funktion sperrt
-- die Einheit (FOR UPDATE), vergleicht die Version, die der Trainer beim
-- Oeffnen geladen hat, und ersetzt Kopf und Inhalt in EINER Transaktion.
-- Speichern zwei Trainer gleichzeitig, gewinnt genau einer; der andere
-- bekommt "version_conflict" und es wird nichts geaendert.
-- SECURITY INVOKER: alle Zugriffsregeln (RLS) gelten wie bisher.
-- Altbestand hat content_version = leer und gilt als Version 0.
-- ---------------------------------------------------------------------
alter table public.training_sessions add column if not exists content_version integer;

create or replace function public.save_training_content(
  p_session_id uuid,
  p_expected_version integer,
  p_session jsonb,
  p_sections jsonb,
  p_land jsonb,
  p_warmup jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current integer;
  v_section jsonb;
  v_section_id uuid;
begin
  select coalesce(s.content_version, 0) into v_current
  from public.training_sessions s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_current <> coalesce(p_expected_version, 0) then
    raise exception 'version_conflict' using errcode = '40001';
  end if;

  -- Kopfdaten (Typen aus der Tabellendefinition)
  update public.training_sessions s set
    title = r.title,
    team_id = r.team_id,
    session_date = r.session_date,
    start_time = r.start_time,
    training_type = r.training_type,
    duration_minutes = r.duration_minutes,
    total_meters = r.total_meters,
    pool_length = r.pool_length,
    focus = r.focus,
    planned_rpe = r.planned_rpe,
    core_goals = r.core_goals,
    notes = case when p_session ? 'notes' then r.notes else s.notes end,
    content_version = v_current + 1
  from jsonb_populate_record(null::public.training_sessions, p_session) r
  where s.id = p_session_id;

  -- alten Inhalt ersetzen
  delete from public.training_rows
  where section_id in (select x.id from public.training_sections x where x.training_session_id = p_session_id);
  delete from public.training_sections where training_session_id = p_session_id;
  delete from public.training_land_rows where training_session_id = p_session_id;
  delete from public.training_warmup_land_rows where training_session_id = p_session_id;

  for v_section in select value from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) loop
    insert into public.training_sections (training_session_id, section_key, section_name, practice_mode, sort_order)
    select p_session_id, r.section_key, r.section_name, r.practice_mode, r.sort_order
    from jsonb_populate_record(null::public.training_sections, v_section) r
    returning id into v_section_id;

    insert into public.training_rows (section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order)
    select v_section_id, r.repetitions, r.distance, r.exercise, r.style, r.materials, r.zone, r.interval_type, r.interval_time, r.sort_order
    from jsonb_populate_recordset(null::public.training_rows, coalesce(v_section -> 'rows', '[]'::jsonb)) r;
  end loop;

  insert into public.training_land_rows (training_session_id, exercise, sets, repetitions, weight, material, intensity, sort_order)
  select p_session_id, r.exercise, r.sets, r.repetitions, r.weight, r.material, r.intensity, r.sort_order
  from jsonb_populate_recordset(null::public.training_land_rows, coalesce(p_land, '[]'::jsonb)) r;

  insert into public.training_warmup_land_rows (training_session_id, exercise, sets, repetitions, material, intensity, sort_order)
  select p_session_id, r.exercise, r.sets, r.repetitions, r.material, r.intensity, r.sort_order
  from jsonb_populate_recordset(null::public.training_warmup_land_rows, coalesce(p_warmup, '[]'::jsonb)) r;

  return v_current + 1;
end;
$$;

revoke all on function public.save_training_content(uuid, integer, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_training_content(uuid, integer, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- B) Serienzeiten mit Kontext (alle Spalten optional)
--
-- Die geplante Serie wird beim Bearbeiten einer Einheit neu angelegt.
-- Darum KEINE harte Verknuepfung (die Zeiten wuerden mitgeloescht),
-- sondern eine Kopie des Serienkontexts zum Zeitpunkt der Erfassung.
--   times_ms[i]   = Zeit der Wiederholung i (Millisekunden), leer = nicht erfasst
--   missed_reps   = Wiederholungen, die NICHT geschwommen wurden (1-basiert)
--   target_ms     = ausdruecklich hinterlegte Sollzeit je Wiederholung
--                   (NICHT der Abgang: @3:00 ist keine Zielzeit)
-- ---------------------------------------------------------------------
alter table public.training_set_times add column if not exists distance integer;
alter table public.training_set_times add column if not exists repetitions integer;
alter table public.training_set_times add column if not exists pool_length integer;
alter table public.training_set_times add column if not exists zone text;
alter table public.training_set_times add column if not exists interval_type text;
alter table public.training_set_times add column if not exists target_ms integer;
alter table public.training_set_times add column if not exists missed_reps integer[];
alter table public.training_set_times add column if not exists plan_key text;
alter table public.training_set_times add column if not exists materials text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'training_set_times_target_check') then
    alter table public.training_set_times add constraint training_set_times_target_check
      check (target_ms is null or target_ms > 0);
  end if;
end $$;

-- Athleten sehen ihre eigenen Serienzeiten (nur lesen)
drop policy if exists "Athletes read own set times" on public.training_set_times;
create policy "Athletes read own set times"
  on public.training_set_times for select to authenticated
  using (exists (select 1 from public.swimmers s where s.id = swimmer_id and s.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- C) Weitere Trainer eines Teams in der App verwalten (statt SQL)
-- Nur der Haupttrainer. Gesucht wird ueber die Anmelde-E-Mail eines
-- vorhandenen Trainer-Kontos; es werden keine E-Mails anderer Nutzer
-- ausgegeben.
-- ---------------------------------------------------------------------
create or replace function public.add_team_coach(p_team_id uuid, p_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_coach uuid;
  v_name text;
begin
  if not public.is_team_owner(p_team_id) then
    raise exception 'Nur der Haupttrainer kann Trainer hinzufuegen.' using errcode = '42501';
  end if;
  select u.id, trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
    into v_coach, v_name
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email)) and p.role::text = 'coach';
  if v_coach is null then
    raise exception 'Kein Trainer-Konto mit dieser E-Mail gefunden.' using errcode = 'P0002';
  end if;
  if v_coach = auth.uid() then
    raise exception 'Du bist bereits Haupttrainer dieses Teams.' using errcode = '23514';
  end if;
  insert into public.team_coaches (team_id, coach_id, added_by)
  values (p_team_id, v_coach, auth.uid())
  on conflict (team_id, coach_id) do update set revoked_at = null;
  return coalesce(nullif(v_name, ''), 'Trainer');
end;
$$;

create or replace function public.team_coach_list(p_team_id uuid)
returns table (coach_id uuid, name text, added_at timestamptz, revoked_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select tc.coach_id, trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), tc.added_at, tc.revoked_at
  from public.team_coaches tc
  join public.profiles p on p.id = tc.coach_id
  where tc.team_id = p_team_id and public.is_team_staff(p_team_id)
  order by tc.revoked_at nulls first, 2;
$$;

revoke all on function public.add_team_coach(uuid, text) from public, anon;
revoke all on function public.team_coach_list(uuid) from public, anon;
grant execute on function public.add_team_coach(uuid, text) to authenticated;
grant execute on function public.team_coach_list(uuid) to authenticated;
