-- =====================================================================
-- "Mein Fortschritt" fuer Athleten: eigene Daten lesen
--
-- Athleten duerfen Ergebnisse, Pflichtzeiten und Laktattests nicht direkt
-- lesen. Diese Funktionen geben jedem angemeldeten Athleten NUR seine
-- eigenen Daten (ueber swimmers.profile_id = eigener Login) bzw. die
-- Pflichtzeiten-Listen seines Trainers. Nur lesen, nur additiv.
-- Einmal im Supabase SQL-Editor ausfuehren.
-- =====================================================================

-- eigener Athleten-Datensatz als JSON (enthaelt auch Fokus-Spalten, falls vorhanden)
create or replace function public.my_swimmer()
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select to_jsonb(s)
  from public.swimmers s
  where s.profile_id = auth.uid()
  limit 1;
$$;

create or replace function public.my_results()
returns setof public.swimmer_results
language sql stable security definer set search_path = ''
as $$
  select r.*
  from public.swimmer_results r
  join public.swimmers s on s.id = r.swimmer_id
  where s.profile_id = auth.uid();
$$;

create or replace function public.my_qualifying_standards()
returns setof public.qualifying_standards
language sql stable security definer set search_path = ''
as $$
  select q.*
  from public.qualifying_standards q
  where q.coach_id in (select s.coach_id from public.swimmers s where s.profile_id = auth.uid());
$$;

create or replace function public.my_qualifying_times()
returns setof public.qualifying_times
language sql stable security definer set search_path = ''
as $$
  select t.*
  from public.qualifying_times t
  join public.qualifying_standards q on q.id = t.standard_id
  where q.coach_id in (select s.coach_id from public.swimmers s where s.profile_id = auth.uid());
$$;

revoke all on function public.my_swimmer() from public, anon;
revoke all on function public.my_results() from public, anon;
revoke all on function public.my_qualifying_standards() from public, anon;
revoke all on function public.my_qualifying_times() from public, anon;
grant execute on function public.my_swimmer() to authenticated;
grant execute on function public.my_results() to authenticated;
grant execute on function public.my_qualifying_standards() to authenticated;
grant execute on function public.my_qualifying_times() to authenticated;

-- Laktattests (nur wenn laktattests.sql schon lief)
do $$
begin
  if to_regclass('public.lactate_tests') is not null then
    execute $f$
      create or replace function public.my_lactate_tests()
      returns setof public.lactate_tests
      language sql stable security definer set search_path = ''
      as $body$
        select l.*
        from public.lactate_tests l
        join public.swimmers s on s.id = l.swimmer_id
        where s.profile_id = auth.uid();
      $body$;
    $f$;
    execute 'revoke all on function public.my_lactate_tests() from public, anon';
    execute 'grant execute on function public.my_lactate_tests() to authenticated';
  end if;
end $$;
