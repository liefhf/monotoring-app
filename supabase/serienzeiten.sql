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
