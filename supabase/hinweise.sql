-- =====================================================================
-- Hinweise in der App (Glocke)
--
-- Voraussetzung: termine_news_gruppen.sql und wettkampf_feedback.sql
-- wurden ausgefuehrt.
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Wiederholbar.
--
-- Hinweise entstehen automatisch per Trigger:
--   neue News                -> Athleten des Teams (bzw. aller Teams)
--   neuer Team-Termin        -> Athleten des Teams (bzw. aller Teams)
--   neues Wettkampf-Feedback -> der verknuepfte Athlet
--   Einschaetzung des Athleten -> der Coach
-- Es werden keine E-Mails verschickt.
-- =====================================================================

create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  recipient_id  uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('news', 'termin', 'feedback', 'einschaetzung')),
  title         text not null,
  body          text,
  link          text,
  source_id     uuid,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (recipient_id = auth.uid());

drop policy if exists "Users mark own notifications" on public.notifications;
create policy "Users mark own notifications"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "Users delete own notifications" on public.notifications;
create policy "Users delete own notifications"
  on public.notifications for delete
  to authenticated
  using (recipient_id = auth.uid());

-- Kein INSERT fuer Nutzer: Hinweise legen nur die Trigger an.


-- Athleten eines Teams bzw. aller Teams eines Coaches
create or replace function public.team_athlete_ids(p_coach_id uuid, p_team_id uuid)
returns setof uuid
language sql stable security definer set search_path = ''
as $$
  select distinct tm.athlete_id
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where t.coach_id = p_coach_id
    and (p_team_id is null or t.id = p_team_id);
$$;

revoke all on function public.team_athlete_ids(uuid, uuid) from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- News
-- ---------------------------------------------------------------------
create or replace function public.notify_news()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, title, body, link, source_id)
  select athlete_id, 'news', new.title, left(new.body, 200), '/athlete/news', new.id
  from public.team_athlete_ids(new.coach_id, new.team_id) as athlete_id;

  return new;
end;
$$;

drop trigger if exists news_posts_notify on public.news_posts;
create trigger news_posts_notify
  after insert on public.news_posts
  for each row execute function public.notify_news();


-- ---------------------------------------------------------------------
-- Termine (nur Team-Kalender, nicht Trainerkalender)
-- ---------------------------------------------------------------------
create or replace function public.notify_calendar_entry()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.visibility <> 'team' then
    return new;
  end if;

  -- Bei Aenderung nur benachrichtigen, wenn der Termin gerade
  -- fuer das Team sichtbar geworden ist
  if tg_op = 'UPDATE' and old.visibility = 'team' then
    return new;
  end if;

  insert into public.notifications (recipient_id, kind, title, body, link, source_id)
  select athlete_id,
         'termin',
         'Neuer Termin: ' || new.title,
         to_char(new.starts_at at time zone 'Europe/Berlin', 'DD.MM.YYYY')
           || case when new.registration_enabled then ' · Anmeldung möglich' else '' end,
         '/athlete/termine',
         new.id
  from public.team_athlete_ids(new.coach_id, new.team_id) as athlete_id;

  return new;
end;
$$;

drop trigger if exists calendar_entries_notify on public.calendar_entries;
create trigger calendar_entries_notify
  after insert or update of visibility on public.calendar_entries
  for each row execute function public.notify_calendar_entry();


-- ---------------------------------------------------------------------
-- Wettkampf-Feedback an den Athleten / Einschaetzung an den Coach
-- ---------------------------------------------------------------------
create or replace function public.notify_competition_start()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile uuid;
  v_name text;
  v_swimmer text;
begin
  select s.profile_id, trim(s.first_name || ' ' || coalesce(s.last_name, ''))
    into v_profile, v_swimmer
    from public.swimmers s where s.id = new.swimmer_id;

  select c.name into v_name from public.competitions c where c.id = new.competition_id;

  -- Athlet hat sich eingeschaetzt -> Coach
  if tg_op = 'UPDATE' and new.athlete_updated_at is distinct from old.athlete_updated_at then
    insert into public.notifications (recipient_id, kind, title, body, link, source_id)
    values (new.coach_id, 'einschaetzung', v_swimmer || ' hat sich eingeschätzt',
            coalesce(v_name, 'Wettkampf') || coalesce(': ' || left(new.athlete_note, 160), ''),
            '/coach/competitions/' || new.competition_id || '/auswertung', new.id);
    return new;
  end if;

  if v_profile is null or not new.shared_with_athlete then
    return new;
  end if;

  -- Nur wenn es wirklich Feedback gibt und es sich geaendert hat
  if coalesce(new.went_well, new.to_improve, new.coach_note) is null
     and coalesce(new.rating_start, new.rating_turns, new.rating_underwater,
                  new.rating_technique, new.rating_pacing, new.rating_finish) is null then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and new.went_well is not distinct from old.went_well
     and new.to_improve is not distinct from old.to_improve
     and new.coach_note is not distinct from old.coach_note
     and new.shared_with_athlete = old.shared_with_athlete then
    return new;
  end if;

  -- Kein zweiter ungelesener Hinweis zum selben Start
  if exists (
    select 1 from public.notifications
    where recipient_id = v_profile and source_id = new.id and read_at is null
  ) then
    return new;
  end if;

  insert into public.notifications (recipient_id, kind, title, body, link, source_id)
  values (v_profile, 'feedback', 'Neues Feedback vom Trainer',
          coalesce(v_name, 'Wettkampf') || ' · ' || new.distance || ' m', '/athlete/wettkaempfe', new.id);

  return new;
end;
$$;

drop trigger if exists competition_starts_notify on public.competition_starts;
create trigger competition_starts_notify
  after insert or update on public.competition_starts
  for each row execute function public.notify_competition_start();


-- Glocke live aktualisieren
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- Alte, gelesene Hinweise nach 60 Tagen aufraeumen (bei jedem neuen Hinweis)
create or replace function public.cleanup_notifications()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.notifications
  where recipient_id = new.recipient_id
    and read_at is not null
    and created_at < now() - interval '60 days';
  return null;
end;
$$;

drop trigger if exists notifications_cleanup on public.notifications;
create trigger notifications_cleanup
  after insert on public.notifications
  for each row execute function public.cleanup_notifications();
