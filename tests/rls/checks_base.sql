-- Gilt in jeder Phase (mit eingeschraenkten Rollen, nie als Admin)
\set ON_ERROR_STOP 1
\set A '''aaaaaaaa-0000-0000-0000-000000000000'''
\set B '''bbbbbbbb-0000-0000-0000-000000000000'''
\set C '''cccccccc-0000-0000-0000-000000000000'''
\set X '''eeeeeeee-0000-0000-0000-000000000000'''
select set_config('t.phase', :'phase', false);

set role authenticated;
-- Trainer A
select set_config('request.jwt.sub', :A, false);
select t.expect(current_setting('t.phase') || ': A sieht Notiz seines Athleten S1', (select count(*) from athlete_notes where body = 'Notiz S1') = 1);
select t.expect(current_setting('t.phase') || ': A sieht S2 (fremdes Team) nicht', (select count(*) from athlete_notes where body = 'Notiz S2') = 0);
select t.expect(current_setting('t.phase') || ': A sieht S3 (anderer Stammtrainer, aber in TA) nur wenn Trainerteam aktiv',
  (select count(*) from athlete_notes where body = 'Notiz S3') = case when current_setting('t.phase') = '2' then 1 else 0 end);
do $$ begin
  update athlete_notes set swimmer_id = '52000000-0000-0000-0000-000000000000' where body = 'Notiz S1';
  perform t.expect(current_setting('t.phase') || ': A kann Notiz nicht auf fremden Athleten umhaengen', false);
exception when others then perform t.expect(current_setting('t.phase') || ': A kann Notiz nicht auf fremden Athleten umhaengen', true); end $$;
do $$ declare n int; begin
  delete from athlete_notes where body = 'Notiz S2'; get diagnostics n = row_count;
  perform t.expect(current_setting('t.phase') || ': A loescht fremde Notiz -> 0 Zeilen', n = 0);
end $$;
do $$ begin
  insert into team_swimmers (team_id, swimmer_id) values ('a0000000-0000-0000-0000-000000000000', '52000000-0000-0000-0000-000000000000');
  perform t.expect(current_setting('t.phase') || ': A kann fremden Athleten S2 nicht ins eigene Team holen', false);
exception when others then perform t.expect(current_setting('t.phase') || ': A kann fremden Athleten S2 nicht ins eigene Team holen', true); end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('athlete-documents', '52000000-0000-0000-0000-000000000000/x.pdf');
  perform t.expect(current_setting('t.phase') || ': A laedt keine Datei in Ordner von S2', false);
exception when others then perform t.expect(current_setting('t.phase') || ': A laedt keine Datei in Ordner von S2', true); end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('athlete-documents', 'kein-uuid/x.pdf');
  perform t.expect(current_setting('t.phase') || ': ungueltiger Ordner wird abgelehnt (ohne Absturz)', false);
exception when insufficient_privilege then perform t.expect(current_setting('t.phase') || ': ungueltiger Ordner wird abgelehnt (ohne Absturz)', true);
          when others then perform t.expect(current_setting('t.phase') || ': ungueltiger Ordner wird abgelehnt (ohne Absturz)', false); end $$;

-- Trainer C ohne Zuordnung
select set_config('request.jwt.sub', :C, false);
select t.expect(current_setting('t.phase') || ': C ohne Zuordnung sieht keine Athletendaten',
  (select count(*) from athlete_notes) + (select count(*) from health_events) + (select count(*) from training_attendance) = 0);

-- Athlet X (Login von S1)
select set_config('request.jwt.sub', :X, false);
select t.expect(current_setting('t.phase') || ': Athlet sieht keine Trainernotizen', (select count(*) from athlete_notes) = 0);
select t.expect(current_setting('t.phase') || ': Athlet sieht nur sichtbare eigene Gesundheit', (select string_agg(title, ',') from health_events) = 'Schulter');
select t.expect(current_setting('t.phase') || ': Athlet liest eigene Anwesenheit (krank)', (select status from training_attendance limit 1) = 'krank');
do $$ declare n int; begin
  update training_attendance set status = 'anwesend'; get diagnostics n = row_count;
  perform t.expect(current_setting('t.phase') || ': Athlet kann Anwesenheit nicht aendern', n = 0);
end $$;
do $$ begin
  update profiles set role = 'coach' where id = auth.uid();
  perform t.expect(current_setting('t.phase') || ': Athlet kann sich nicht selbst zum Trainer machen', false);
exception when others then perform t.expect(current_setting('t.phase') || ': Athlet kann sich nicht selbst zum Trainer machen', true); end $$;
do $$ begin
  insert into team_coaches (team_id, coach_id) values ('a0000000-0000-0000-0000-000000000000', auth.uid());
  perform t.expect(current_setting('t.phase') || ': Athlet traegt sich nicht als Trainer ein', false);
exception when others then perform t.expect(current_setting('t.phase') || ': Athlet traegt sich nicht als Trainer ein', true); end $$;
do $$ begin
  update befinden_entries set pain_answer = 'vielleicht';
  perform t.expect(current_setting('t.phase') || ': pain_answer nimmt nur ja/nein/keine_angabe', false);
exception when check_violation then perform t.expect(current_setting('t.phase') || ': pain_answer nimmt nur ja/nein/keine_angabe', true); end $$;

-- Nicht angemeldet
reset role; set role anon; select set_config('request.jwt.sub', '', false);
select t.expect(current_setting('t.phase') || ': anon sieht nichts',
  (select count(*) from athlete_notes) + (select count(*) from health_events) + (select count(*) from training_attendance) + (select count(*) from team_coaches) = 0);
reset role;
