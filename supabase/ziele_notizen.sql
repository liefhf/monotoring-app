-- =====================================================================
-- 24 · Ziele und Trainernotizen je Athlet
--
-- Einmal im Supabase SQL-Editor ausfuehren. Wiederholbar.
-- Nur additiv: zwei neue Tabellen mit Regeln (RLS).
--
-- Ziele: Zeitziel (Strecke + Zielzeit), Technik- oder Trainingsziel als
--   Text. Der Athlet sieht seine Ziele (motivierend), aendern kann er nichts.
-- Notizen: kurze interne Trainernotizen ("Wende Brust verbessern").
--   Nur der Coach sieht sie - nie der Athlet.
-- =====================================================================

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
