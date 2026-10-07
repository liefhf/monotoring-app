-- Nur nach Skript 26: weitere Trainer, Entzug, Teamwechsel
\set ON_ERROR_STOP 1
\set A '''aaaaaaaa-0000-0000-0000-000000000000'''
\set B '''bbbbbbbb-0000-0000-0000-000000000000'''
\set C '''cccccccc-0000-0000-0000-000000000000'''
set role authenticated;

-- C versucht, sich selbst in TA einzutragen
select set_config('request.jwt.sub', :C, false);
do $$ begin
  insert into team_coaches (team_id, coach_id) values ('a0000000-0000-0000-0000-000000000000', auth.uid());
  perform t.expect('team: C kann sich nicht selbst in fremdes Team eintragen', false);
exception when others then perform t.expect('team: C kann sich nicht selbst in fremdes Team eintragen', true); end $$;

-- A (Haupttrainer TA) nimmt C auf
select set_config('request.jwt.sub', :A, false);
insert into team_coaches (team_id, coach_id) values ('a0000000-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000');
do $$ begin
  insert into team_coaches (team_id, coach_id) values ('a0000000-0000-0000-0000-000000000000', 'eeeeeeee-0000-0000-0000-000000000000');
  perform t.expect('team: Athleten-Konto kann nicht Trainer werden', false);
exception when others then perform t.expect('team: Athleten-Konto kann nicht Trainer werden', true); end $$;

select set_config('request.jwt.sub', :C, false);
select t.expect('team: TA erscheint in my_teams() von C als Trainer-Team', exists (select 1 from public.my_teams() where name = 'TA' and is_coach));
select t.expect('team: C liest die Team-Zeile TA (Umschalter, Berichte)', (select count(*) from teams where name = 'TA') = 1);
select t.expect('team: C sieht TB nicht', (select count(*) from teams where name = 'TB') = 0 and not exists (select 1 from public.my_teams() where name = 'TB'));
select t.expect('team: Team-Inhalte von A fuer TA sichtbar (can_see_team_content)', public.can_see_team_content('aaaaaaaa-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000'));
insert into training_set_times (training_session_id, swimmer_id, set_label) values ('5e000000-0000-0000-0000-000000000000','53000000-0000-0000-0000-000000000000','8x50');
select t.expect('team: C erfasst Serienzeiten in TA', true);
select t.expect('team: C sieht Athleten S1 und S3 aus TA', (select count(*) from swimmers where first_name in ('S1','S3')) = 2);
select t.expect('team: C sieht Notizen und Gesundheit von S1', (select count(*) from athlete_notes where body = 'Notiz S1') = 1 and (select count(*) from health_events) = 2);
select t.expect('team: C sieht S2 (TB) nicht', (select count(*) from swimmers where first_name = 'S2') = 0);
select t.expect('team: C sieht Einheit von TA', (select count(*) from training_sessions where title = 'TA Montag') = 1);
select t.expect('team: C sieht Befinden des Athleten', (select count(*) from befinden_entries) = 1);
do $$ declare n int; begin
  update swimmers set first_name = 'geaendert' where first_name = 'S1'; get diagnostics n = row_count;
  perform t.expect('team: C kann Stammdaten nicht aendern', n = 0);
end $$;
do $$ declare n int; begin
  update swimmers set coach_id = auth.uid() where first_name = 'S1'; get diagnostics n = row_count;
  perform t.expect('team: C kann sich nicht zum Stammtrainer machen', n = 0);
end $$;
insert into training_attendance (training_session_id, swimmer_id, status) values ('5e000000-0000-0000-0000-000000000000','53000000-0000-0000-0000-000000000000','anwesend');
select t.expect('team: C erfasst Anwesenheit in TA', true);
insert into training_sessions (coach_id, team_id, title, session_date) values (auth.uid(), 'a0000000-0000-0000-0000-000000000000', 'TA von C', '2026-10-06');
select t.expect('team: C plant Einheit fuer TA', true);
do $$ begin
  insert into training_sessions (coach_id, team_id, title, session_date) values ('bbbbbbbb-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'falscher Verfasser', '2026-10-06');
  perform t.expect('team: C kann keinen teamfremden Verfasser eintragen', false);
exception when others then perform t.expect('team: C kann keinen teamfremden Verfasser eintragen', true); end $$;
do $$ begin
  insert into team_swimmers (team_id, swimmer_id) values ('c0000000-0000-0000-0000-000000000000', '51000000-0000-0000-0000-000000000000');
  perform t.expect('team: C kann S1 nicht in sein eigenes Team TC mitnehmen', false);
exception when others then perform t.expect('team: C kann S1 nicht in sein eigenes Team TC mitnehmen', true); end $$;
do $$ begin
  insert into team_coaches (team_id, coach_id) values ('a0000000-0000-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000000');
  perform t.expect('team: C (weiterer Trainer) kann keine Trainer hinzufuegen', false);
exception when others then perform t.expect('team: C (weiterer Trainer) kann keine Trainer hinzufuegen', true); end $$;

select set_config('request.jwt.sub', :A, false);
select t.expect('team: A sieht die von C geplante Einheit', (select count(*) from training_sessions where title = 'TA von C') = 1);

select set_config('request.jwt.sub', :B, false);
select t.expect('team: B sieht S1 weiterhin nicht', (select count(*) from athlete_notes where body = 'Notiz S1') = 0);
select t.expect('team: B (Stammtrainer S3) sieht S3 weiterhin', (select count(*) from athlete_notes where body = 'Notiz S3') = 1);

-- Entzug
select set_config('request.jwt.sub', :A, false);
update team_coaches set revoked_at = now() where coach_id = 'cccccccc-0000-0000-0000-000000000000';
select set_config('request.jwt.sub', :C, false);
select t.expect('team: nach Entzug sieht C keine Athletendaten mehr (auch keine alten)',
  (select count(*) from athlete_notes) + (select count(*) from health_events) + (select count(*) from training_attendance) + (select count(*) from befinden_entries) = 0);
select t.expect('team: nach Entzug ist TA nicht mehr in my_teams() von C', not exists (select 1 from public.my_teams() where name = 'TA'));
select t.expect('team: nach Entzug sieht C die Einheiten von A nicht mehr', (select count(*) from training_sessions where title = 'TA Montag') = 0);

-- Teamwechsel: C wieder aktiv, S1 verlaesst TA
select set_config('request.jwt.sub', :A, false);
update team_coaches set revoked_at = null where coach_id = 'cccccccc-0000-0000-0000-000000000000';
delete from team_swimmers where team_id = 'a0000000-0000-0000-0000-000000000000' and swimmer_id = '51000000-0000-0000-0000-000000000000';
select t.expect('team: A (Stammtrainer) sieht S1 nach Teamwechsel weiter', (select count(*) from athlete_notes where body = 'Notiz S1') = 1);
select set_config('request.jwt.sub', :C, false);
select t.expect('team: C sieht S1 nach Teamwechsel nicht mehr', (select count(*) from athlete_notes where body = 'Notiz S1') = 0);
select t.expect('team: C sieht S3 (noch in TA) weiter', (select count(*) from athlete_notes where body = 'Notiz S3') = 1);
reset role;

-- Aufraeumen der Wegwerf-DB fuer Phase 3 (Zustand wie vorher)
insert into public.team_swimmers (team_id, swimmer_id) values ('a0000000-0000-0000-0000-000000000000','51000000-0000-0000-0000-000000000000');
