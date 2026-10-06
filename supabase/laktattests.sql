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
