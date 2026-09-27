-- =====================================================================
-- Wettkampf-Feedback und Auswertung
--
-- Voraussetzung: schwimmer_pflichtzeiten.sql und schwimmer_erweiterung.sql
-- wurden ausgefuehrt (Tabellen swimmers und swimmer_results).
--
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Wiederholbar. Es werden nur neue Tabellen/Spalten angelegt.
--
-- Idee:
--   competition_starts = ein Start eines Schwimmers bei einem Wettkampf
--   (eine Disziplin) mit Zeiten, Noten und Feedback des Coaches.
--   Jede gueltige Endzeit wird automatisch als Ergebnis in
--   swimmer_results gespiegelt -> Bestzeiten und Entwicklung
--   aktualisieren sich von selbst.
--   Athleten mit verknuepftem Login sehen ihr Feedback und geben
--   eine eigene Einschaetzung ab.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Schwimmer optional mit einem Athleten-Login verknuepfen
-- ---------------------------------------------------------------------
alter table public.swimmers
  add column if not exists profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists swimmers_profile_unique
  on public.swimmers (profile_id) where profile_id is not null;


-- ---------------------------------------------------------------------
-- Starts
-- ---------------------------------------------------------------------
create table if not exists public.competition_starts (
  id                  uuid primary key default gen_random_uuid(),
  competition_id      uuid not null references public.competitions(id) on delete cascade,
  swimmer_id          uuid not null references public.swimmers(id) on delete cascade,
  coach_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id            uuid references public.competition_events(id) on delete set null,

  start_date          date not null,
  pool_length         smallint not null check (pool_length in (25, 50)),
  distance            smallint not null check (distance > 0),
  stroke              text not null check (stroke in ('freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley')),
  round               text,

  entry_time_ms       integer check (entry_time_ms > 0),   -- Meldezeit
  goal_time_ms        integer check (goal_time_ms > 0),    -- Zielzeit
  time_ms             integer check (time_ms > 0),         -- Endzeit
  split_times_ms      integer[] not null default '{}',     -- Durchgangszeiten (kumuliert)
  status              text not null default 'ok' check (status in ('ok', 'dsq', 'dns', 'dnf')),
  placement           smallint check (placement > 0),
  points              smallint check (points >= 0),

  -- Noten des Coaches: 1 = schwach ... 5 = sehr gut
  rating_start        smallint check (rating_start between 1 and 5),
  rating_turns        smallint check (rating_turns between 1 and 5),
  rating_underwater   smallint check (rating_underwater between 1 and 5),
  rating_technique    smallint check (rating_technique between 1 and 5),
  rating_pacing       smallint check (rating_pacing between 1 and 5),
  rating_finish       smallint check (rating_finish between 1 and 5),

  went_well           text,
  to_improve          text,
  coach_note          text,
  shared_with_athlete boolean not null default true,

  -- Einschaetzung des Athleten
  athlete_feeling     smallint check (athlete_feeling between 1 and 5),
  athlete_effort      smallint check (athlete_effort between 1 and 10),
  athlete_nervousness smallint check (athlete_nervousness between 1 and 5),
  athlete_note        text,
  athlete_updated_at  timestamptz,

  result_id           uuid references public.swimmer_results(id) on delete set null,
  created_at          timestamptz not null default now(),
  check (status <> 'ok' or time_ms is not null)
);

create index if not exists competition_starts_competition_idx on public.competition_starts (competition_id);
create index if not exists competition_starts_swimmer_idx on public.competition_starts (swimmer_id, start_date);

alter table public.competition_starts enable row level security;

drop policy if exists "Coaches manage starts of own swimmers" on public.competition_starts;
create policy "Coaches manage starts of own swimmers"
  on public.competition_starts for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and public.coach_owns_swimmer(swimmer_id));

drop policy if exists "Athletes read own shared starts" on public.competition_starts;
create policy "Athletes read own shared starts"
  on public.competition_starts for select
  to authenticated
  using (
    shared_with_athlete
    and exists (
      select 1 from public.swimmers s
      where s.id = swimmer_id and s.profile_id = auth.uid()
    )
  );


-- ---------------------------------------------------------------------
-- Endzeit automatisch nach swimmer_results spiegeln
-- ---------------------------------------------------------------------
create or replace function public.competition_starts_sync_result()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_location text;
  v_result_id uuid;
begin
  if tg_op = 'DELETE' then
    if old.result_id is not null then
      delete from public.swimmer_results where id = old.result_id;
    end if;
    return old;
  end if;

  -- Ergebnis wurde beim Schwimmer bewusst geloescht (result_id -> null
  -- durch den Fremdschluessel): dann nicht sofort neu anlegen.
  if tg_op = 'UPDATE'
     and old.result_id is not null
     and new.result_id is null
     and new.time_ms is not distinct from old.time_ms
     and new.status = old.status then
    return new;
  end if;

  select coalesce(nullif(trim(c.location), ''), c.name)
    into v_location
    from public.competitions c
   where c.id = new.competition_id;

  -- Nur gueltige Zeiten werden Ergebnisse
  if new.status <> 'ok' or new.time_ms is null then
    if new.result_id is not null then
      delete from public.swimmer_results where id = new.result_id;
      new.result_id := null;
    end if;
    return new;
  end if;

  if new.result_id is not null then
    update public.swimmer_results
       set swimmer_id  = new.swimmer_id,
           kind        = 'einzel',
           result_date = new.start_date,
           location    = v_location,
           pool_length = new.pool_length,
           distance    = new.distance,
           stroke      = new.stroke,
           time_ms     = new.time_ms,
           points      = new.points,
           round       = new.round,
           is_split    = false
     where id = new.result_id;

    if found then
      return new;
    end if;
  end if;

  insert into public.swimmer_results
    (swimmer_id, kind, result_date, location, pool_length, distance, stroke, time_ms, points, round, is_split)
  values
    (new.swimmer_id, 'einzel', new.start_date, v_location, new.pool_length, new.distance, new.stroke,
     new.time_ms, new.points, new.round, false)
  returning id into v_result_id;

  new.result_id := v_result_id;
  return new;
end;
$$;

drop trigger if exists competition_starts_sync_result on public.competition_starts;
create trigger competition_starts_sync_result
  before insert or update on public.competition_starts
  for each row execute function public.competition_starts_sync_result();

drop trigger if exists competition_starts_remove_result on public.competition_starts;
create trigger competition_starts_remove_result
  after delete on public.competition_starts
  for each row execute function public.competition_starts_sync_result();


-- ---------------------------------------------------------------------
-- Einschaetzung des Athleten speichern (nur eigene, freigegebene Starts)
-- ---------------------------------------------------------------------
create or replace function public.athlete_reflect_start(
  p_start_id    uuid,
  p_feeling     smallint,
  p_effort      smallint,
  p_nervousness smallint,
  p_note        text
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.competition_starts cs
     set athlete_feeling     = p_feeling,
         athlete_effort      = p_effort,
         athlete_nervousness = p_nervousness,
         athlete_note        = nullif(trim(p_note), ''),
         athlete_updated_at  = now()
   where cs.id = p_start_id
     and cs.shared_with_athlete
     and exists (
       select 1 from public.swimmers s
       where s.id = cs.swimmer_id and s.profile_id = auth.uid()
     );

  if not found then
    raise exception 'Start nicht gefunden';
  end if;
end;
$$;

revoke all on function public.athlete_reflect_start(uuid, smallint, smallint, smallint, text) from public, anon;
grant execute on function public.athlete_reflect_start(uuid, smallint, smallint, smallint, text) to authenticated;


-- Wettkampfname und -datum fuer Athleten (competitions selbst bleibt zu)
create or replace function public.my_competition_starts()
returns table (
  start_id uuid,
  competition_id uuid,
  competition_name text,
  competition_location text
)
language sql stable security definer set search_path = ''
as $$
  select cs.id, c.id, c.name::text, c.location::text
  from public.competition_starts cs
  join public.competitions c on c.id = cs.competition_id
  join public.swimmers s on s.id = cs.swimmer_id
  where s.profile_id = auth.uid() and cs.shared_with_athlete;
$$;

revoke all on function public.my_competition_starts() from public, anon;
grant execute on function public.my_competition_starts() to authenticated;


-- ---------------------------------------------------------------------
-- Gesamtfazit zum Wettkampf
-- ---------------------------------------------------------------------
create table if not exists public.competition_reviews (
  competition_id  uuid primary key references public.competitions(id) on delete cascade,
  coach_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  summary         text,
  went_well       text,
  to_improve      text,
  next_steps      text,
  updated_at      timestamptz not null default now()
);

alter table public.competition_reviews enable row level security;

drop policy if exists "Coaches manage own competition reviews" on public.competition_reviews;
create policy "Coaches manage own competition reviews"
  on public.competition_reviews for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
