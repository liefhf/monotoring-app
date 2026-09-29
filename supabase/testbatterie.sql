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
