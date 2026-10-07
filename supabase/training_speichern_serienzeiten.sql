-- =====================================================================
-- Skript 27: Training sicher speichern, Serienzeiten mit Kontext,
--            Trainer im Team verwalten
--
-- Nur additiv: neue optionale Spalten (ohne Wert fuer Altbestand),
-- neue Funktionen und Regeln. Aendert, loescht oder ergaenzt KEINE
-- vorhandenen Daten. Voraussetzung: Skripte 16 (training_notizen),
-- Serienzeiten (serienzeiten.sql) und 25 sind eingespielt.
-- Vorher: Einstellungen -> "Datensicherung herunterladen".
-- =====================================================================

-- ---------------------------------------------------------------------
-- A) Training atomar speichern (kein Verlust, keine doppelten Serien)
--
-- content_version zaehlt jede gespeicherte Fassung. Die Funktion sperrt
-- die Einheit (FOR UPDATE), vergleicht die Version, die der Trainer beim
-- Oeffnen geladen hat, und ersetzt Kopf und Inhalt in EINER Transaktion.
-- Speichern zwei Trainer gleichzeitig, gewinnt genau einer; der andere
-- bekommt "version_conflict" und es wird nichts geaendert.
-- SECURITY INVOKER: alle Zugriffsregeln (RLS) gelten wie bisher.
-- Altbestand hat content_version = leer und gilt als Version 0.
-- ---------------------------------------------------------------------
alter table public.training_sessions add column if not exists content_version integer;

create or replace function public.save_training_content(
  p_session_id uuid,
  p_expected_version integer,
  p_session jsonb,
  p_sections jsonb,
  p_land jsonb,
  p_warmup jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_current integer;
  v_section jsonb;
  v_section_id uuid;
begin
  select coalesce(s.content_version, 0) into v_current
  from public.training_sessions s
  where s.id = p_session_id
  for update;

  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if v_current <> coalesce(p_expected_version, 0) then
    raise exception 'version_conflict' using errcode = '40001';
  end if;

  -- Kopfdaten (Typen aus der Tabellendefinition)
  update public.training_sessions s set
    title = r.title,
    team_id = r.team_id,
    session_date = r.session_date,
    start_time = r.start_time,
    training_type = r.training_type,
    duration_minutes = r.duration_minutes,
    total_meters = r.total_meters,
    pool_length = r.pool_length,
    focus = r.focus,
    planned_rpe = r.planned_rpe,
    core_goals = r.core_goals,
    notes = case when p_session ? 'notes' then r.notes else s.notes end,
    content_version = v_current + 1
  from jsonb_populate_record(null::public.training_sessions, p_session) r
  where s.id = p_session_id;

  -- alten Inhalt ersetzen
  delete from public.training_rows
  where section_id in (select x.id from public.training_sections x where x.training_session_id = p_session_id);
  delete from public.training_sections where training_session_id = p_session_id;
  delete from public.training_land_rows where training_session_id = p_session_id;
  delete from public.training_warmup_land_rows where training_session_id = p_session_id;

  for v_section in select value from jsonb_array_elements(coalesce(p_sections, '[]'::jsonb)) loop
    insert into public.training_sections (training_session_id, section_key, section_name, practice_mode, sort_order)
    select p_session_id, r.section_key, r.section_name, r.practice_mode, r.sort_order
    from jsonb_populate_record(null::public.training_sections, v_section) r
    returning id into v_section_id;

    insert into public.training_rows (section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order)
    select v_section_id, r.repetitions, r.distance, r.exercise, r.style, r.materials, r.zone, r.interval_type, r.interval_time, r.sort_order
    from jsonb_populate_recordset(null::public.training_rows, coalesce(v_section -> 'rows', '[]'::jsonb)) r;
  end loop;

  insert into public.training_land_rows (training_session_id, exercise, sets, repetitions, weight, material, intensity, sort_order)
  select p_session_id, r.exercise, r.sets, r.repetitions, r.weight, r.material, r.intensity, r.sort_order
  from jsonb_populate_recordset(null::public.training_land_rows, coalesce(p_land, '[]'::jsonb)) r;

  insert into public.training_warmup_land_rows (training_session_id, exercise, sets, repetitions, material, intensity, sort_order)
  select p_session_id, r.exercise, r.sets, r.repetitions, r.material, r.intensity, r.sort_order
  from jsonb_populate_recordset(null::public.training_warmup_land_rows, coalesce(p_warmup, '[]'::jsonb)) r;

  return v_current + 1;
end;
$$;

revoke all on function public.save_training_content(uuid, integer, jsonb, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.save_training_content(uuid, integer, jsonb, jsonb, jsonb, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- B) Serienzeiten mit Kontext (alle Spalten optional)
--
-- Die geplante Serie wird beim Bearbeiten einer Einheit neu angelegt.
-- Darum KEINE harte Verknuepfung (die Zeiten wuerden mitgeloescht),
-- sondern eine Kopie des Serienkontexts zum Zeitpunkt der Erfassung.
--   times_ms[i]   = Zeit der Wiederholung i (Millisekunden), leer = nicht erfasst
--   missed_reps   = Wiederholungen, die NICHT geschwommen wurden (1-basiert)
--   target_ms     = ausdruecklich hinterlegte Sollzeit je Wiederholung
--                   (NICHT der Abgang: @3:00 ist keine Zielzeit)
-- ---------------------------------------------------------------------
alter table public.training_set_times add column if not exists distance integer;
alter table public.training_set_times add column if not exists repetitions integer;
alter table public.training_set_times add column if not exists pool_length integer;
alter table public.training_set_times add column if not exists zone text;
alter table public.training_set_times add column if not exists interval_type text;
alter table public.training_set_times add column if not exists target_ms integer;
alter table public.training_set_times add column if not exists missed_reps integer[];
alter table public.training_set_times add column if not exists plan_key text;
alter table public.training_set_times add column if not exists materials text[];

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'training_set_times_target_check') then
    alter table public.training_set_times add constraint training_set_times_target_check
      check (target_ms is null or target_ms > 0);
  end if;
end $$;

-- Athleten sehen ihre eigenen Serienzeiten (nur lesen)
drop policy if exists "Athletes read own set times" on public.training_set_times;
create policy "Athletes read own set times"
  on public.training_set_times for select to authenticated
  using (exists (select 1 from public.swimmers s where s.id = swimmer_id and s.profile_id = auth.uid()));

-- ---------------------------------------------------------------------
-- C) Weitere Trainer eines Teams in der App verwalten (statt SQL)
-- Nur der Haupttrainer. Gesucht wird ueber die Anmelde-E-Mail eines
-- vorhandenen Trainer-Kontos; es werden keine E-Mails anderer Nutzer
-- ausgegeben.
-- ---------------------------------------------------------------------
create or replace function public.add_team_coach(p_team_id uuid, p_email text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_coach uuid;
  v_name text;
begin
  if not public.is_team_owner(p_team_id) then
    raise exception 'Nur der Haupttrainer kann Trainer hinzufuegen.' using errcode = '42501';
  end if;
  select u.id, trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
    into v_coach, v_name
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(trim(p_email)) and p.role::text = 'coach';
  if v_coach is null then
    raise exception 'Kein Trainer-Konto mit dieser E-Mail gefunden.' using errcode = 'P0002';
  end if;
  if v_coach = auth.uid() then
    raise exception 'Du bist bereits Haupttrainer dieses Teams.' using errcode = '23514';
  end if;
  insert into public.team_coaches (team_id, coach_id, added_by)
  values (p_team_id, v_coach, auth.uid())
  on conflict (team_id, coach_id) do update set revoked_at = null;
  return coalesce(nullif(v_name, ''), 'Trainer');
end;
$$;

create or replace function public.team_coach_list(p_team_id uuid)
returns table (coach_id uuid, name text, added_at timestamptz, revoked_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select tc.coach_id, trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), tc.added_at, tc.revoked_at
  from public.team_coaches tc
  join public.profiles p on p.id = tc.coach_id
  where tc.team_id = p_team_id and public.is_team_staff(p_team_id)
  order by tc.revoked_at nulls first, 2;
$$;

revoke all on function public.add_team_coach(uuid, text) from public, anon;
revoke all on function public.team_coach_list(uuid) from public, anon;
grant execute on function public.add_team_coach(uuid, text) to authenticated;
grant execute on function public.team_coach_list(uuid) to authenticated;
