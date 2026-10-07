-- Atomares Speichern einer Einheit (Skript 27), als eingeschraenkte Rolle
\set ON_ERROR_STOP 1
set role authenticated;
select set_config('request.jwt.sub', 'aaaaaaaa-0000-0000-0000-000000000000', false);
-- Version 0 -> 1, Inhalt: 1 Abschnitt mit 2 Serien
select t.expect('speichern: erste Fassung ergibt Version 1', public.save_training_content('5e000000-0000-0000-0000-000000000000', 0,
  '{"title":"TA Montag","team_id":"a0000000-0000-0000-0000-000000000000","session_date":"2026-10-05","notes":"n1"}',
  '[{"section_key":"a","section_name":"Haupt","sort_order":0,"rows":[{"repetitions":8,"distance":200,"style":"Kraul","zone":"GA2","interval_type":"@","interval_time":"3:00","sort_order":0},{"repetitions":4,"distance":50,"sort_order":1}]}]',
  '[]', '[{"exercise":"Mobilisation","sort_order":0}]') = 1);
select t.expect('speichern: Inhalt vollstaendig', (select count(*) from training_rows) = 2 and (select count(*) from training_warmup_land_rows) = 1);
-- veraltete Version -> Konflikt, nichts geaendert
do $$ begin
  perform public.save_training_content('5e000000-0000-0000-0000-000000000000', 0, '{"title":"alt"}', '[]', '[]', '[]');
  perform t.expect('speichern: veraltete Version wird abgelehnt', false);
exception when serialization_failure then perform t.expect('speichern: veraltete Version wird abgelehnt', true); end $$;
select t.expect('speichern: nach Konflikt unveraendert (Titel, 2 Serien)', (select title from training_sessions where id = '5e000000-0000-0000-0000-000000000000') = 'TA Montag' and (select count(*) from training_rows) = 2);
-- Teilfehler (ungueltige Zahl) -> alles zurueck
do $$ begin
  perform public.save_training_content('5e000000-0000-0000-0000-000000000000', 1, '{"title":"kaputt"}', '[{"section_key":"b","section_name":"X","sort_order":0,"rows":[{"repetitions":"abc","distance":100,"sort_order":0}]}]', '[]', '[]');
  perform t.expect('speichern: Teilfehler bricht ab', false);
exception when others then perform t.expect('speichern: Teilfehler bricht ab', true); end $$;
select t.expect('speichern: nach Teilfehler alte Fassung vollstaendig da', (select count(*) from training_rows) = 2 and (select title from training_sessions where id = '5e000000-0000-0000-0000-000000000000') = 'TA Montag' and (select coalesce(content_version,0) from training_sessions where id = '5e000000-0000-0000-0000-000000000000') = 1);
-- Wiederholung nach Fehler mit richtiger Version klappt, keine Doppelungen
select t.expect('speichern: Wiederholung klappt (Version 2)', public.save_training_content('5e000000-0000-0000-0000-000000000000', 1,
  '{"title":"TA Montag","team_id":"a0000000-0000-0000-0000-000000000000","session_date":"2026-10-05"}',
  '[{"section_key":"a","section_name":"Haupt","sort_order":0,"rows":[{"repetitions":8,"distance":200,"sort_order":0}]}]', '[]', '[]') = 2);
select t.expect('speichern: genau die neue Fassung, keine Doppelungen', (select count(*) from training_rows) = 1 and (select count(*) from training_sections) = 1 and (select count(*) from training_warmup_land_rows) = 0);
select t.expect('speichern: Notiz bleibt, wenn nicht mitgeschickt', (select notes from training_sessions where id = '5e000000-0000-0000-0000-000000000000') = 'n1');
-- fremder Trainer: RLS greift auch in der Funktion
select set_config('request.jwt.sub', 'bbbbbbbb-0000-0000-0000-000000000000', false);
do $$ begin
  perform public.save_training_content('5e000000-0000-0000-0000-000000000000', 2, '{"title":"fremd"}', '[]', '[]', '[]');
  perform t.expect('speichern: fremder Trainer kann nicht speichern', false);
exception when others then perform t.expect('speichern: fremder Trainer kann nicht speichern', true); end $$;
-- Athlet
select set_config('request.jwt.sub', 'eeeeeeee-0000-0000-0000-000000000000', false);
do $$ begin
  perform public.save_training_content('5e000000-0000-0000-0000-000000000000', 2, '{"title":"athlet"}', '[]', '[]', '[]');
  perform t.expect('speichern: Athlet kann nicht speichern', false);
exception when others then perform t.expect('speichern: Athlet kann nicht speichern', true); end $$;
reset role;
select t.expect('speichern: nach fremden Versuchen unveraendert', (select title from training_sessions where id = '5e000000-0000-0000-0000-000000000000') = 'TA Montag' and (select count(*) from training_rows) = 1);
