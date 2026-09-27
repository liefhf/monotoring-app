-- =====================================================================
-- Terminkalender, Terminanmeldung, News-Wall und Gruppenraeume
--
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Wiederholbar: "if not exists" / "or replace" / "drop policy if exists".
-- Es werden nur NEUE Tabellen angelegt, bestehende bleiben unberuehrt.
--
-- Zugriffsregeln kurz:
--   Coach   -> verwaltet alles, was er angelegt hat, fuer seine Teams.
--   Athlet  -> sieht Termine/News seiner Teams (nie "nur Trainer"),
--              meldet sich selbst an/ab, schreibt im Gruppenraum
--              seiner Teams.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Hilfsfunktionen (gleiches Muster wie coach_has_athlete)
-- ---------------------------------------------------------------------

-- Ist der angemeldete Nutzer Coach dieses Teams?
create or replace function public.is_team_coach(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teams t
    where t.id = p_team_id and t.coach_id = auth.uid()
  );
$$;

-- Ist der angemeldete Nutzer Mitglied (Athlet) dieses Teams?
create or replace function public.is_team_member(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team_id and tm.athlete_id = auth.uid()
  );
$$;

-- Trainiert der angemeldete Athlet in einem Team dieses Coaches?
create or replace function public.athlete_has_coach(p_coach_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.athlete_id = auth.uid() and t.coach_id = p_coach_id
  );
$$;

-- Darf der Nutzer Inhalte sehen, die ein Coach fuer ein Team
-- (oder mit team_id = null fuer alle seine Teams) angelegt hat?
create or replace function public.can_see_team_content(p_coach_id uuid, p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select
    p_coach_id = auth.uid()
    or (p_team_id is null and public.athlete_has_coach(p_coach_id))
    or (p_team_id is not null and public.is_team_member(p_team_id));
$$;

-- Teams des angemeldeten Nutzers (als Coach oder als Athlet),
-- damit Athleten Teamnamen sehen, ohne die Tabelle teams zu oeffnen.
create or replace function public.my_teams()
returns table (id uuid, name text, is_coach boolean)
language sql stable security definer set search_path = ''
as $$
  select t.id, t.name::text, true
  from public.teams t
  where t.coach_id = auth.uid()
  union
  select t.id, t.name::text, false
  from public.teams t
  join public.team_members tm on tm.team_id = t.id
  where tm.athlete_id = auth.uid()
  order by 2;
$$;

revoke all on function public.is_team_coach(uuid) from public, anon;
revoke all on function public.is_team_member(uuid) from public, anon;
revoke all on function public.athlete_has_coach(uuid) from public, anon;
revoke all on function public.can_see_team_content(uuid, uuid) from public, anon;
revoke all on function public.my_teams() from public, anon;
grant execute on function public.is_team_coach(uuid) to authenticated;
grant execute on function public.is_team_member(uuid) to authenticated;
grant execute on function public.athlete_has_coach(uuid) to authenticated;
grant execute on function public.can_see_team_content(uuid, uuid) to authenticated;
grant execute on function public.my_teams() to authenticated;


-- ---------------------------------------------------------------------
-- Terminkalender
--
-- team_id    leer = gilt fuer alle Teams des Coaches
-- visibility 'team'  = Athleten sehen den Termin
--            'coach' = nur Trainer (eigener Trainerkalender)
-- category   training | wettkampf | trainingslager | besprechung | sonstiges
--
-- Terminanmeldung: registration_enabled = true, optional mit
-- Anmeldeschluss, Hoechstzahl und Kostenhinweis (nur Info-Text,
-- es wird KEIN Geld abgewickelt).
-- ---------------------------------------------------------------------
create table if not exists public.calendar_entries (
  id                     uuid primary key default gen_random_uuid(),
  coach_id               uuid not null default auth.uid() references auth.users(id) on delete cascade,
  team_id                uuid references public.teams(id) on delete cascade,
  title                  text not null check (length(trim(title)) > 0),
  description            text,
  location               text,
  category               text not null default 'sonstiges'
                         check (category in ('training', 'wettkampf', 'trainingslager', 'besprechung', 'sonstiges')),
  visibility             text not null default 'team' check (visibility in ('team', 'coach')),
  starts_at              timestamptz not null,
  ends_at                timestamptz,
  all_day                boolean not null default false,
  registration_enabled   boolean not null default false,
  registration_deadline  timestamptz,
  max_participants       integer check (max_participants > 0),
  fee_note               text,
  created_at             timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at),
  check (visibility = 'team' or registration_enabled = false)
);

create index if not exists calendar_entries_coach_idx on public.calendar_entries (coach_id, starts_at);
create index if not exists calendar_entries_team_idx on public.calendar_entries (team_id, starts_at);

alter table public.calendar_entries enable row level security;

drop policy if exists "Coaches manage own calendar entries" on public.calendar_entries;
create policy "Coaches manage own calendar entries"
  on public.calendar_entries for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and (team_id is null or public.is_team_coach(team_id)));

drop policy if exists "Athletes read team calendar entries" on public.calendar_entries;
create policy "Athletes read team calendar entries"
  on public.calendar_entries for select
  to authenticated
  using (visibility = 'team' and public.can_see_team_content(coach_id, team_id));


-- ---------------------------------------------------------------------
-- Terminanmeldung
-- An- und Abmelden laeuft ueber die Funktionen unten, damit
-- Anmeldeschluss und Hoechstzahl sicher geprueft werden.
-- ---------------------------------------------------------------------
create table if not exists public.calendar_registrations (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references public.calendar_entries(id) on delete cascade,
  athlete_id  uuid not null references public.profiles(id) on delete cascade,
  note        text,
  created_at  timestamptz not null default now(),
  unique (entry_id, athlete_id)
);

alter table public.calendar_registrations enable row level security;

drop policy if exists "Athletes read own registrations" on public.calendar_registrations;
create policy "Athletes read own registrations"
  on public.calendar_registrations for select
  to authenticated
  using (athlete_id = auth.uid());

drop policy if exists "Coaches read registrations of own entries" on public.calendar_registrations;
create policy "Coaches read registrations of own entries"
  on public.calendar_registrations for select
  to authenticated
  using (exists (
    select 1 from public.calendar_entries e
    where e.id = entry_id and e.coach_id = auth.uid()
  ));

drop policy if exists "Coaches remove registrations of own entries" on public.calendar_registrations;
create policy "Coaches remove registrations of own entries"
  on public.calendar_registrations for delete
  to authenticated
  using (exists (
    select 1 from public.calendar_entries e
    where e.id = entry_id and e.coach_id = auth.uid()
  ));


create or replace function public.register_for_entry(p_entry_id uuid, p_note text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_entry public.calendar_entries%rowtype;
  v_count integer;
begin
  select * into v_entry from public.calendar_entries where id = p_entry_id;

  if not found
     or v_entry.visibility <> 'team'
     or not public.can_see_team_content(v_entry.coach_id, v_entry.team_id) then
    raise exception 'Termin nicht gefunden';
  end if;

  if not v_entry.registration_enabled then
    raise exception 'Fuer diesen Termin ist keine Anmeldung moeglich';
  end if;

  if v_entry.registration_deadline is not null and now() > v_entry.registration_deadline then
    raise exception 'Der Anmeldeschluss ist vorbei';
  end if;

  if v_entry.max_participants is not null then
    select count(*) into v_count from public.calendar_registrations where entry_id = p_entry_id;

    if v_count >= v_entry.max_participants then
      raise exception 'Der Termin ist leider ausgebucht';
    end if;
  end if;

  insert into public.calendar_registrations (entry_id, athlete_id, note)
  values (p_entry_id, auth.uid(), nullif(trim(p_note), ''))
  on conflict (entry_id, athlete_id) do update set note = excluded.note;
end;
$$;

create or replace function public.unregister_from_entry(p_entry_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_deadline timestamptz;
begin
  select registration_deadline into v_deadline from public.calendar_entries where id = p_entry_id;

  if v_deadline is not null and now() > v_deadline then
    raise exception 'Nach dem Anmeldeschluss bitte beim Trainer abmelden';
  end if;

  delete from public.calendar_registrations
  where entry_id = p_entry_id and athlete_id = auth.uid();
end;
$$;

-- Anzahl Anmeldungen je Termin (fuer "noch 3 Plaetze frei"),
-- ohne dass Athleten die Namen der anderen sehen.
create or replace function public.entry_registration_counts(p_entry_ids uuid[])
returns table (entry_id uuid, registered integer)
language sql stable security definer set search_path = ''
as $$
  select r.entry_id, count(*)::integer
  from public.calendar_registrations r
  join public.calendar_entries e on e.id = r.entry_id
  where r.entry_id = any (p_entry_ids)
    and (e.coach_id = auth.uid()
         or (e.visibility = 'team' and public.can_see_team_content(e.coach_id, e.team_id)))
  group by r.entry_id;
$$;

-- Angemeldete Athleten mit Namen - nur fuer den Coach des Termins.
create or replace function public.entry_registrations_for_coach(p_entry_id uuid)
returns table (athlete_id uuid, first_name text, last_name text, note text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select r.athlete_id, p.first_name::text, p.last_name::text, r.note, r.created_at
  from public.calendar_registrations r
  join public.calendar_entries e on e.id = r.entry_id
  join public.profiles p on p.id = r.athlete_id
  where r.entry_id = p_entry_id and e.coach_id = auth.uid()
  order by r.created_at;
$$;

revoke all on function public.register_for_entry(uuid, text) from public, anon;
revoke all on function public.unregister_from_entry(uuid) from public, anon;
revoke all on function public.entry_registration_counts(uuid[]) from public, anon;
revoke all on function public.entry_registrations_for_coach(uuid) from public, anon;
grant execute on function public.register_for_entry(uuid, text) to authenticated;
grant execute on function public.unregister_from_entry(uuid) to authenticated;
grant execute on function public.entry_registration_counts(uuid[]) to authenticated;
grant execute on function public.entry_registrations_for_coach(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- News-Wall
-- team_id leer = an alle Teams des Coaches
-- ---------------------------------------------------------------------
create table if not exists public.news_posts (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete cascade,
  title       text not null check (length(trim(title)) > 0),
  body        text not null default '',
  pinned      boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists news_posts_coach_idx on public.news_posts (coach_id, created_at desc);

alter table public.news_posts enable row level security;

drop policy if exists "Coaches manage own news" on public.news_posts;
create policy "Coaches manage own news"
  on public.news_posts for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and (team_id is null or public.is_team_coach(team_id)));

drop policy if exists "Athletes read team news" on public.news_posts;
create policy "Athletes read team news"
  on public.news_posts for select
  to authenticated
  using (public.can_see_team_content(coach_id, team_id));


-- ---------------------------------------------------------------------
-- Digitale Gruppenraeume: ein Raum pro Team
-- Nachrichten und Dateien sehen Coach und Mitglieder des Teams.
-- ---------------------------------------------------------------------
create or replace function public.can_access_team_room(p_team_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_team_coach(p_team_id) or public.is_team_member(p_team_id);
$$;

revoke all on function public.can_access_team_room(uuid) from public, anon;
grant execute on function public.can_access_team_room(uuid) to authenticated;

create table if not exists public.team_messages (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams(id) on delete cascade,
  author_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name  text,
  author_role  text,
  body         text not null check (length(trim(body)) > 0 and length(body) <= 4000),
  created_at   timestamptz not null default now()
);

create index if not exists team_messages_team_idx on public.team_messages (team_id, created_at);

-- Name und Rolle beim Schreiben aus profiles uebernehmen, damit
-- Athleten die Profile anderer nicht lesen muessen.
create or replace function public.team_messages_set_author()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.author_id := auth.uid();

  select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), p.role::text
    into new.author_name, new.author_role
    from public.profiles p
   where p.id = auth.uid();

  return new;
end;
$$;

drop trigger if exists team_messages_set_author on public.team_messages;
create trigger team_messages_set_author
  before insert on public.team_messages
  for each row execute function public.team_messages_set_author();

alter table public.team_messages enable row level security;

drop policy if exists "Room members read messages" on public.team_messages;
create policy "Room members read messages"
  on public.team_messages for select
  to authenticated
  using (public.can_access_team_room(team_id));

drop policy if exists "Room members write messages" on public.team_messages;
create policy "Room members write messages"
  on public.team_messages for insert
  to authenticated
  with check (public.can_access_team_room(team_id));

drop policy if exists "Authors and coaches delete messages" on public.team_messages;
create policy "Authors and coaches delete messages"
  on public.team_messages for delete
  to authenticated
  using (author_id = auth.uid() or public.is_team_coach(team_id));


create table if not exists public.team_files (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  uploader_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  storage_path  text not null unique,
  file_name     text not null,
  size_bytes    bigint,
  created_at    timestamptz not null default now()
);

create index if not exists team_files_team_idx on public.team_files (team_id, created_at desc);

alter table public.team_files enable row level security;

drop policy if exists "Room members read files" on public.team_files;
create policy "Room members read files"
  on public.team_files for select
  to authenticated
  using (public.can_access_team_room(team_id));

drop policy if exists "Room members add files" on public.team_files;
create policy "Room members add files"
  on public.team_files for insert
  to authenticated
  with check (public.can_access_team_room(team_id) and uploader_id = auth.uid());

drop policy if exists "Uploaders and coaches delete files" on public.team_files;
create policy "Uploaders and coaches delete files"
  on public.team_files for delete
  to authenticated
  using (uploader_id = auth.uid() or public.is_team_coach(team_id));


-- Speicherort fuer die Dateien: privater Bucket, Ordner = team_id.
-- Hoechstens 20 MB pro Datei.
insert into storage.buckets (id, name, public, file_size_limit)
values ('team-files', 'team-files', false, 20971520)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "Team room files read" on storage.objects;
create policy "Team room files read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'team-files'
    and public.can_access_team_room(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Team room files upload" on storage.objects;
create policy "Team room files upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'team-files'
    and public.can_access_team_room(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "Team room files delete" on storage.objects;
create policy "Team room files delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'team-files'
    and (
      owner = auth.uid()
      or public.is_team_coach(((storage.foldername(name))[1])::uuid)
    )
  );
