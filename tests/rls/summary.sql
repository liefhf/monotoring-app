\pset format aligned
select count(*) filter (where ok) as bestanden, count(*) filter (where not ok) as fehlgeschlagen from t.results;
select label as fehlgeschlagen from t.results where not ok order by id;
do $$ begin if exists (select 1 from t.results where not ok) then raise exception 'RLS-Tests fehlgeschlagen'; end if; end $$;
