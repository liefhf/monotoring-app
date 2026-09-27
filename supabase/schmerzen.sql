-- =====================================================================
-- Schmerzmeldungen mit Koerpermodell
--
-- Voraussetzung: hinweise.sql (Glocke) wurde ausgefuehrt.
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Wiederholbar. Bestehende Meldungen bleiben erhalten.
--
-- Neu pro Meldung (eine Zeile pro Koerperstelle):
--   spot_id / spot_label  genaue Stelle aus dem Koerpermodell
--   body_view             'front' oder 'back'
--   qualities             Art: stechend, ziehend, ...
--   onset                 seit wann
--   triggers              wann tritt es auf
--   training_impact       kann normal / eingeschraenkt / nicht trainieren
--   report_group          Stellen, die zusammen gemeldet wurden
--
-- Der Coach sieht die Meldungen seiner Athleten und bekommt einen
-- Hinweis (Glocke), wenn Staerke >= 7 oder Training nicht moeglich.
-- =====================================================================

alter table public.pain_reports add column if not exists spot_id          text;
alter table public.pain_reports add column if not exists spot_label       text;
alter table public.pain_reports add column if not exists body_view        text;
alter table public.pain_reports add column if not exists qualities        text[] not null default '{}';
alter table public.pain_reports add column if not exists onset            text;
alter table public.pain_reports add column if not exists triggers         text[] not null default '{}';
alter table public.pain_reports add column if not exists training_impact  text;
alter table public.pain_reports add column if not exists report_group     uuid;

-- created_at fuer Verlauf und Sortierung (falls es die Spalte noch nicht gibt)
alter table public.pain_reports add column if not exists created_at timestamptz not null default now();

create index if not exists pain_reports_athlete_idx on public.pain_reports (athlete_id, created_at desc);

alter table public.pain_reports enable row level security;

-- Athleten: eigene Meldungen anlegen und lesen
drop policy if exists "Athletes insert own pain reports" on public.pain_reports;
create policy "Athletes insert own pain reports"
  on public.pain_reports for insert
  to authenticated
  with check (athlete_id = auth.uid());

drop policy if exists "Athletes read own pain reports" on public.pain_reports;
create policy "Athletes read own pain reports"
  on public.pain_reports for select
  to authenticated
  using (athlete_id = auth.uid());

-- Coach: Meldungen der Athleten in seinen Teams lesen
drop policy if exists "Coaches read pain reports of own athletes" on public.pain_reports;
create policy "Coaches read pain reports of own athletes"
  on public.pain_reports for select
  to authenticated
  using (public.coach_has_athlete(athlete_id));


-- ---------------------------------------------------------------------
-- Hinweis an die Coaches bei starken Schmerzen
-- ---------------------------------------------------------------------
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check
  check (kind in ('news', 'termin', 'feedback', 'einschaetzung', 'schmerz'));

create or replace function public.notify_pain_report()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text;
  v_source uuid := coalesce(new.report_group, new.id);
begin
  if coalesce(new.pain_level, 0) < 7 and coalesce(new.training_impact, '') <> 'none' then
    return new;
  end if;

  select trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
    into v_name
    from public.profiles p where p.id = new.athlete_id;

  -- ein Hinweis pro Meldung und Coach (auch wenn mehrere Stellen)
  insert into public.notifications (recipient_id, kind, title, body, link, source_id)
  select distinct on (t.coach_id)
         t.coach_id,
         'schmerz',
         coalesce(nullif(v_name, ''), 'Ein Athlet') || ' meldet Schmerzen',
         coalesce(new.spot_label, new.body_region, 'Körper') || ' · Stärke ' || new.pain_level
           || case when new.training_impact = 'none' then ' · kann nicht trainieren' else '' end,
         coalesce('/coach/schwimmer/' || s.id || '?tab=schmerzen', '/coach/schwimmer'),
         v_source
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    left join public.swimmers s on s.profile_id = new.athlete_id and s.coach_id = t.coach_id
   where tm.athlete_id = new.athlete_id
     and not exists (
       select 1 from public.notifications n
       where n.recipient_id = t.coach_id and n.source_id = v_source and n.kind = 'schmerz'
     );

  return new;
end;
$$;

drop trigger if exists pain_reports_notify on public.pain_reports;
create trigger pain_reports_notify
  after insert on public.pain_reports
  for each row execute function public.notify_pain_report();
