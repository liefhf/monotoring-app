-- =====================================================================
-- Athleten, Schwimmer und Teams zusammenfuehren
--
-- Voraussetzung: Skripte 2-8 aus supabase/README.md wurden ausgefuehrt.
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Wiederholbar: nichts wird doppelt angelegt, nichts geloescht.
--
-- Neu:
--   * Jede Person gibt es genau einmal: als Schwimmer (swimmers).
--     Ein Login (profiles) ist nur noch eine Verknuepfung (profile_id).
--   * Teams enthalten Schwimmer (team_swimmers) - mit oder ohne Login.
--   * Fuer Schwimmer mit Login pflegt die Datenbank team_members
--     automatisch mit. Check-in, Training, Kalender usw. der
--     Athleten funktionieren dadurch unveraendert weiter.
--
-- Einmalige Uebernahme:
--   * Fuer jeden Athleten mit Login in deinen Teams entsteht (falls noch
--     nicht vorhanden) ein Schwimmer, verknuepft mit dem Login.
--   * Team-Zugehoerigkeiten werden uebernommen.
--   * Zeiten aus der alten Schwimmerabfrage (swim_results) werden zu
--     den Ergebnissen des Schwimmers kopiert (ohne Doppelte).
-- =====================================================================


-- Ein Login darf pro Coach nur mit einem Schwimmer verknuepft sein
-- (vorher galt das ueber alle Coaches hinweg).
drop index if exists public.swimmers_profile_unique;
create unique index if not exists swimmers_coach_profile_unique
  on public.swimmers (coach_id, profile_id) where profile_id is not null;


-- ---------------------------------------------------------------------
-- Team-Mitgliedschaft fuer Schwimmer
-- ---------------------------------------------------------------------
create table if not exists public.team_swimmers (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams(id) on delete cascade,
  swimmer_id  uuid not null references public.swimmers(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (team_id, swimmer_id)
);

create index if not exists team_swimmers_swimmer_idx on public.team_swimmers (swimmer_id);

alter table public.team_swimmers enable row level security;

drop policy if exists "Coaches manage own team swimmers" on public.team_swimmers;
create policy "Coaches manage own team swimmers"
  on public.team_swimmers for all
  to authenticated
  using (public.is_team_coach(team_id))
  with check (public.is_team_coach(team_id) and public.coach_owns_swimmer(swimmer_id));


-- ---------------------------------------------------------------------
-- team_members (Logins) automatisch mitpflegen
-- ---------------------------------------------------------------------
create or replace function public.sync_team_member(p_team_id uuid, p_profile_id uuid, p_add boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_profile_id is null then
    return;
  end if;

  if p_add then
    insert into public.team_members (team_id, athlete_id)
    select p_team_id, p_profile_id
    where not exists (
      select 1 from public.team_members tm
      where tm.team_id = p_team_id and tm.athlete_id = p_profile_id
    );
  else
    -- nur entfernen, wenn kein anderer Schwimmer mit diesem Login im Team ist
    if not exists (
      select 1 from public.team_swimmers ts
      join public.swimmers s on s.id = ts.swimmer_id
      where ts.team_id = p_team_id and s.profile_id = p_profile_id
    ) then
      delete from public.team_members
      where team_id = p_team_id and athlete_id = p_profile_id;
    end if;
  end if;
end;
$$;

revoke all on function public.sync_team_member(uuid, uuid, boolean) from public, anon, authenticated;

create or replace function public.team_swimmers_sync()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_profile uuid;
begin
  if tg_op = 'INSERT' then
    select profile_id into v_profile from public.swimmers where id = new.swimmer_id;
    perform public.sync_team_member(new.team_id, v_profile, true);
    return new;
  end if;

  select profile_id into v_profile from public.swimmers where id = old.swimmer_id;
  perform public.sync_team_member(old.team_id, v_profile, false);
  return old;
end;
$$;

drop trigger if exists team_swimmers_sync on public.team_swimmers;
create trigger team_swimmers_sync
  after insert or delete on public.team_swimmers
  for each row execute function public.team_swimmers_sync();

-- Login wird verknuepft/geaendert -> Teams des Schwimmers nachziehen
create or replace function public.swimmers_profile_sync()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_team uuid;
begin
  if new.profile_id is not distinct from old.profile_id then
    return new;
  end if;

  for v_team in select team_id from public.team_swimmers where swimmer_id = new.id loop
    if old.profile_id is not null then
      -- alten Login zuerst aus dem Team nehmen (Pruefung sieht schon new)
      perform public.sync_team_member(v_team, old.profile_id, false);
    end if;
    perform public.sync_team_member(v_team, new.profile_id, true);
  end loop;

  return new;
end;
$$;

drop trigger if exists swimmers_profile_sync on public.swimmers;
create trigger swimmers_profile_sync
  after update of profile_id on public.swimmers
  for each row execute function public.swimmers_profile_sync();


-- HINWEIS (Datenregel): Die einmalige Datenuebernahme ist bereits gelaufen
-- und wurde aus diesem Skript entfernt (steht in der Git-Historie).
-- Dieses Skript aendert oder ergaenzt keine vorhandenen Daten mehr.
