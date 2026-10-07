-- Nachbau der Supabase-Grundlagen fuer lokale Tests (KEINE echte DB).
-- Die Kern-Tabellen wurden in Supabase direkt angelegt; ihre echten
-- Regeln muessen mit supabase/regeln_anzeigen.sql verglichen werden.
-- Hier sind die ANGENOMMENEN Grundregeln nachgebaut (coach_id = auth.uid()).
\set ON_ERROR_STOP 1
create role authenticated nologin; create role anon nologin;
create schema auth; create schema storage; create schema t;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;

-- Testergebnisse
create table t.results (id serial, label text, ok boolean);
create function t.expect(p_label text, p_ok boolean) returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into t.results (label, ok) values (p_label, coalesce(p_ok, false));
  raise notice '% %', case when coalesce(p_ok, false) then 'PASS' else 'FAIL' end, p_label;
end $$;
grant usage on schema t to authenticated, anon; grant execute on function t.expect(text, boolean) to authenticated, anon;

create table public.profiles (id uuid primary key, role text, first_name text);
create table public.teams (id uuid primary key, name text, coach_id uuid);
create table public.swimmers (id uuid primary key, coach_id uuid, profile_id uuid, first_name text, last_name text);
create table public.team_swimmers (id uuid primary key default gen_random_uuid(), team_id uuid references public.teams(id) on delete cascade, swimmer_id uuid references public.swimmers(id) on delete cascade, unique (team_id, swimmer_id));
create table public.team_members (team_id uuid references public.teams(id) on delete cascade, athlete_id uuid, primary key (team_id, athlete_id));
create table public.training_sessions (id uuid primary key default gen_random_uuid(), coach_id uuid, team_id uuid references public.teams(id), title text, session_date date);
create table public.training_sections (id uuid primary key default gen_random_uuid(), training_session_id uuid references public.training_sessions(id) on delete cascade, section_name text, sort_order int);
create table public.training_rows (id uuid primary key default gen_random_uuid(), section_id uuid references public.training_sections(id) on delete cascade, distance int);
create table public.training_land_rows (id uuid primary key default gen_random_uuid(), training_session_id uuid references public.training_sessions(id) on delete cascade, exercise text);
create table public.training_warmup_land_rows (id uuid primary key default gen_random_uuid(), training_session_id uuid references public.training_sessions(id) on delete cascade, exercise text);
create table public.training_feedback (id uuid primary key default gen_random_uuid(), training_session_id uuid references public.training_sessions(id) on delete cascade, athlete_id uuid, rpe int, unique (training_session_id, athlete_id));
create table public.befinden_entries (id uuid primary key default gen_random_uuid(), athlete_id uuid, entry_date date, has_pain boolean, unique (athlete_id, entry_date));

-- Hilfsfunktionen im Zustand VOR Skript 26 (wie in den Repo-Skripten)
create function public.coach_owns_swimmer(p_swimmer_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.swimmers s where s.id = p_swimmer_id and s.coach_id = auth.uid()) $$;
create function public.is_team_coach(p_team_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teams t where t.id = p_team_id and t.coach_id = auth.uid()) $$;
create function public.coach_has_athlete(p_athlete_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members tm join public.teams t on t.id = tm.team_id where tm.athlete_id = p_athlete_id and t.coach_id = auth.uid()) $$;

-- Supabase-Speicher
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;

-- Angenommene Grundregeln der Kern-Tabellen
do $$ declare r text; begin
  foreach r in array array['profiles','teams','swimmers','team_swimmers','team_members','training_sessions','training_sections','training_rows','training_land_rows','training_warmup_land_rows','training_feedback','befinden_entries'] loop
    execute format('alter table public.%I enable row level security', r);
  end loop;
end $$;
alter table storage.objects enable row level security;
create policy own_profile on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid()); -- bewusst grosszuegig: Rollen-Schutz soll per Trigger greifen
create policy own_teams on public.teams for all to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy own_swimmers on public.swimmers for all to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy athlete_reads_self on public.swimmers for select to authenticated using (profile_id = auth.uid());
create policy "Coaches manage own team swimmers" on public.team_swimmers for all to authenticated using (public.is_team_coach(team_id)) with check (public.is_team_coach(team_id) and public.coach_owns_swimmer(swimmer_id));
create policy own_sessions on public.training_sessions for all to authenticated using (coach_id = auth.uid()) with check (coach_id = auth.uid());
create policy own_sections on public.training_sections for all to authenticated using (exists (select 1 from public.training_sessions s where s.id = training_session_id and s.coach_id = auth.uid()));
create policy own_rows on public.training_rows for all to authenticated using (exists (select 1 from public.training_sections x join public.training_sessions s on s.id = x.training_session_id where x.id = section_id and s.coach_id = auth.uid()));
create policy athlete_feedback on public.training_feedback for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy athlete_befinden on public.befinden_entries for all to authenticated using (athlete_id = auth.uid()) with check (athlete_id = auth.uid());
create policy coach_befinden on public.befinden_entries for select to authenticated using (public.coach_has_athlete(athlete_id));

grant usage on schema public, auth, storage to authenticated, anon;
grant all on all tables in schema public to authenticated, anon;
grant all on all tables in schema storage to authenticated, anon;
alter default privileges in schema public grant all on tables to authenticated, anon;
revoke all on function public.coach_owns_swimmer(uuid), public.is_team_coach(uuid), public.coach_has_athlete(uuid) from public, anon;
grant execute on function public.coach_owns_swimmer(uuid), public.is_team_coach(uuid), public.coach_has_athlete(uuid) to authenticated;
