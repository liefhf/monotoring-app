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
