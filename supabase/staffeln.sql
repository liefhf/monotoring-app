-- =====================================================================
-- Staffeln im Wettkampf-Feedback
--
-- Voraussetzung: wettkampf_feedback.sql wurde ausgefuehrt.
-- Einmal im Supabase SQL-Editor ausfuehren (komplett markieren -> Run).
-- Wiederholbar.
--
-- competition_relays     = eine Staffel bei einem Wettkampf
-- competition_relay_legs = Aufstellung: Position, Schwimmer, Lage,
--                          Teilzeit und Wechselzeit
-- Das Ergebnis wird fuer jeden Schwimmer der Aufstellung automatisch
-- unter "Staffeln & Freiwasser" (swimmer_results, kind 'staffel')
-- eingetragen.
-- =====================================================================

create table if not exists public.competition_relays (
  id                uuid primary key default gen_random_uuid(),
  competition_id    uuid not null references public.competitions(id) on delete cascade,
  coach_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id          uuid references public.competition_events(id) on delete set null,
  name              text,
  start_date        date not null,
  pool_length       smallint not null check (pool_length in (25, 50)),
  relay_type        text not null check (relay_type in ('freestyle', 'medley')),
  leg_distance      smallint not null check (leg_distance > 0),
  leg_count         smallint not null default 4 check (leg_count between 2 and 10),
  time_ms           integer check (time_ms > 0),
  status            text not null default 'ok' check (status in ('ok', 'dsq', 'dns', 'dnf')),
  placement         smallint check (placement > 0),
  points            smallint check (points >= 0),
  rating_exchanges  smallint check (rating_exchanges between 1 and 5),
  went_well         text,
  to_improve        text,
  created_at        timestamptz not null default now()
);

create index if not exists competition_relays_competition_idx on public.competition_relays (competition_id);

alter table public.competition_relays enable row level security;

drop policy if exists "Coaches manage own relays" on public.competition_relays;
create policy "Coaches manage own relays"
  on public.competition_relays for all
  to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());


create or replace function public.coach_owns_relay(p_relay_id uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.competition_relays r
    where r.id = p_relay_id and r.coach_id = auth.uid()
  );
$$;

revoke all on function public.coach_owns_relay(uuid) from public, anon;
grant execute on function public.coach_owns_relay(uuid) to authenticated;


create table if not exists public.competition_relay_legs (
  id           uuid primary key default gen_random_uuid(),
  relay_id     uuid not null references public.competition_relays(id) on delete cascade,
  leg_number   smallint not null check (leg_number between 1 and 10),
  swimmer_id   uuid not null references public.swimmers(id) on delete cascade,
  stroke       text not null check (stroke in ('freestyle', 'backstroke', 'breaststroke', 'butterfly')),
  split_ms     integer check (split_ms > 0),          -- Teilzeit dieses Schwimmers
  exchange_ms  integer check (exchange_ms between -2000 and 5000), -- Wechselzeit (Reaktion), ab Position 2
  unique (relay_id, leg_number),
  unique (relay_id, swimmer_id)
);

alter table public.competition_relay_legs enable row level security;

drop policy if exists "Coaches manage legs of own relays" on public.competition_relay_legs;
create policy "Coaches manage legs of own relays"
  on public.competition_relay_legs for all
  to authenticated
  using (public.coach_owns_relay(relay_id))
  with check (public.coach_owns_relay(relay_id) and public.coach_owns_swimmer(swimmer_id));


-- ---------------------------------------------------------------------
-- Staffelergebnis bei jedem Schwimmer der Aufstellung eintragen
-- ---------------------------------------------------------------------
alter table public.swimmer_results
  add column if not exists relay_id uuid references public.competition_relays(id) on delete cascade;

create or replace function public.sync_relay_results(p_relay_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_relay public.competition_relays%rowtype;
  v_label text;
  v_location text;
begin
  delete from public.swimmer_results where relay_id = p_relay_id;

  select * into v_relay from public.competition_relays where id = p_relay_id;

  if not found or v_relay.status <> 'ok' or v_relay.time_ms is null then
    return;
  end if;

  v_label := v_relay.leg_count || 'x' || v_relay.leg_distance || ' '
             || case when v_relay.relay_type = 'medley' then 'L' else 'F' end;

  select coalesce(nullif(trim(c.location), ''), c.name) into v_location
    from public.competitions c where c.id = v_relay.competition_id;

  insert into public.swimmer_results
    (swimmer_id, kind, result_date, location, pool_length, event_label, time_ms, points, placement, relay_id)
  select l.swimmer_id, 'staffel', v_relay.start_date, v_location, v_relay.pool_length, v_label,
         v_relay.time_ms, v_relay.points, v_relay.placement, v_relay.id
    from public.competition_relay_legs l
   where l.relay_id = p_relay_id;
end;
$$;

revoke all on function public.sync_relay_results(uuid) from public, anon;

create or replace function public.relay_results_trigger()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'competition_relays' then
    if tg_op <> 'DELETE' then
      perform public.sync_relay_results(new.id);
    end if;
  else
    perform public.sync_relay_results(coalesce(new.relay_id, old.relay_id));
  end if;

  return null;
end;
$$;

drop trigger if exists competition_relays_sync on public.competition_relays;
create trigger competition_relays_sync
  after insert or update on public.competition_relays
  for each row execute function public.relay_results_trigger();

drop trigger if exists competition_relay_legs_sync on public.competition_relay_legs;
create trigger competition_relay_legs_sync
  after insert or update or delete on public.competition_relay_legs
  for each row execute function public.relay_results_trigger();
