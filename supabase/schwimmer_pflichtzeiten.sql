-- =====================================================================
-- Eigene Schwimmer, Wettkampfzeiten und Pflichtzeiten
--
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Das Skript ist wiederholbar: "if not exists" / "or replace" sorgen
-- dafuer, dass ein zweiter Lauf nichts kaputt macht.
--
-- Es werden nur NEUE Tabellen angelegt. Bestehende Tabellen
-- (profiles, swim_results, ...) werden nicht angefasst.
--
-- Die Schwimmer hier sind bewusst unabhaengig von Logins: Der Coach
-- legt sie selbst an (anfangs reicht der Vorname). Jeder Coach sieht
-- nur seine eigenen Schwimmer und Pflichtzeiten.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Schwimmer
-- ---------------------------------------------------------------------
create table if not exists public.swimmers (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  first_name  text not null check (length(trim(first_name)) > 0),
  last_name   text,
  birth_year  smallint check (birth_year between 1950 and 2100),
  gender      text check (gender in ('female', 'male')),
  created_at  timestamptz not null default now()
);

create index if not exists swimmers_coach_idx on public.swimmers (coach_id);

alter table public.swimmers enable row level security;

drop policy if exists "Coaches manage own swimmers" on public.swimmers;
create policy "Coaches manage own swimmers"
  on public.swimmers for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());


-- Hilfsfunktion: Gehoert dieser Schwimmer dem angemeldeten Coach?
create or replace function public.coach_owns_swimmer(p_swimmer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.swimmers s
    where s.id = p_swimmer_id
      and s.coach_id = auth.uid()
  );
$$;

revoke all on function public.coach_owns_swimmer(uuid) from public, anon;
grant execute on function public.coach_owns_swimmer(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- Wettkampfzeiten der Schwimmer
-- Zeiten in Millisekunden (1:05,23 -> 65230)
-- ---------------------------------------------------------------------
create table if not exists public.swimmer_results (
  id           uuid primary key default gen_random_uuid(),
  swimmer_id   uuid not null references public.swimmers(id) on delete cascade,
  result_date  date not null,
  location     text,
  pool_length  smallint not null check (pool_length in (25, 50)),
  distance     smallint not null check (distance > 0),
  stroke       text not null check (stroke in ('freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley')),
  time_ms      integer not null check (time_ms > 0),
  created_at   timestamptz not null default now()
);

create index if not exists swimmer_results_swimmer_idx on public.swimmer_results (swimmer_id, result_date);

alter table public.swimmer_results enable row level security;

drop policy if exists "Coaches manage results of own swimmers" on public.swimmer_results;
create policy "Coaches manage results of own swimmers"
  on public.swimmer_results for all
  to authenticated
  using (public.coach_owns_swimmer(swimmer_id))
  with check (public.coach_owns_swimmer(swimmer_id));


-- ---------------------------------------------------------------------
-- Pflichtzeiten
--
-- qualifying_standards = eine Liste, z. B. "DJM 2027 (50m)".
--   pool_length: Auf welcher Bahn die Zeiten gelten.
--   valid_from / valid_to: Qualifikationszeitraum. Nur Zeiten aus
--   diesem Zeitraum zaehlen. Leer = alle Zeiten zaehlen.
--
-- qualifying_times = die einzelnen Zeiten der Liste.
--   gender leer = gilt fuer alle.
--   birth_year_from / birth_year_to leer = nach unten/oben offen,
--   z. B. "Jahrgang 2008 und aelter" -> from leer, to 2008.
-- ---------------------------------------------------------------------
create table if not exists public.qualifying_standards (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  pool_length  smallint not null check (pool_length in (25, 50)),
  valid_from   date,
  valid_to     date,
  created_at   timestamptz not null default now(),
  check (valid_from is null or valid_to is null or valid_from <= valid_to)
);

create index if not exists qualifying_standards_coach_idx on public.qualifying_standards (coach_id);

alter table public.qualifying_standards enable row level security;

drop policy if exists "Coaches manage own qualifying standards" on public.qualifying_standards;
create policy "Coaches manage own qualifying standards"
  on public.qualifying_standards for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());


create or replace function public.coach_owns_qualifying_standard(p_standard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.qualifying_standards q
    where q.id = p_standard_id
      and q.coach_id = auth.uid()
  );
$$;

revoke all on function public.coach_owns_qualifying_standard(uuid) from public, anon;
grant execute on function public.coach_owns_qualifying_standard(uuid) to authenticated;


create table if not exists public.qualifying_times (
  id               uuid primary key default gen_random_uuid(),
  standard_id      uuid not null references public.qualifying_standards(id) on delete cascade,
  gender           text check (gender in ('female', 'male')),
  birth_year_from  smallint check (birth_year_from between 1950 and 2100),
  birth_year_to    smallint check (birth_year_to between 1950 and 2100),
  distance         smallint not null check (distance > 0),
  stroke           text not null check (stroke in ('freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley')),
  time_ms          integer not null check (time_ms > 0),
  created_at       timestamptz not null default now(),
  check (birth_year_from is null or birth_year_to is null or birth_year_from <= birth_year_to)
);

create index if not exists qualifying_times_standard_idx on public.qualifying_times (standard_id);

alter table public.qualifying_times enable row level security;

drop policy if exists "Coaches manage times of own standards" on public.qualifying_times;
create policy "Coaches manage times of own standards"
  on public.qualifying_times for all
  to authenticated
  using (public.coach_owns_qualifying_standard(standard_id))
  with check (public.coach_owns_qualifying_standard(standard_id));
