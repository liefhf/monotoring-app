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
