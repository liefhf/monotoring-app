-- =====================================================================
-- 23 · Gesundheit (Ausfaelle/Einschraenkungen) und Dokumente je Athlet
--
-- Einmal im Supabase SQL-Editor ausfuehren. Wiederholbar.
-- Nur additiv: zwei neue Tabellen, ein privater Speicherbereich fuer
-- Dateien, Regeln (RLS). Vorhandene Daten werden nicht angefasst.
--
-- Gesundheit: keine Diagnosen, sondern was fuers Training zaehlt:
--   Art, Koerperregion, Trainingsfaehigkeit, Einschraenkung, Zeitraum,
--   Freigabe (z. B. aerztliche Freigabe noetig), Notiz.
-- Dokumente: Sportattest, Einverstaendnisse, Startpass ... mit
--   optionalem Ablaufdatum (die App erinnert 30 Tage vorher).
--
-- Zugriff:
--   * Coach: alles zu den eigenen Schwimmern (coach_owns_swimmer).
--   * Athlet: liest nur eigene Eintraege, die fuer ihn sichtbar sind;
--     aendern kann er nichts.
-- =====================================================================

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

drop policy if exists "Coaches read own athlete documents" on storage.objects;
create policy "Coaches read own athlete documents"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'athlete-documents' and public.coach_owns_swimmer(((storage.foldername(name))[1])::uuid));

drop policy if exists "Coaches upload own athlete documents" on storage.objects;
create policy "Coaches upload own athlete documents"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'athlete-documents' and public.coach_owns_swimmer(((storage.foldername(name))[1])::uuid));

drop policy if exists "Coaches delete own athlete documents" on storage.objects;
create policy "Coaches delete own athlete documents"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'athlete-documents' and public.coach_owns_swimmer(((storage.foldername(name))[1])::uuid));
