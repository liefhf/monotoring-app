-- Testdaten NUR fuer die Wegwerf-Datenbank.
-- A, B, C, D = Trainer; X = Athlet-Login von S1
-- TA (A), TB (B), TC (C); S1 (Stamm A, in TA), S2 (Stamm B, in TB),
-- S3 (Stamm B, aber in TA = Altlast/Mischfall)
insert into public.profiles values
 ('aaaaaaaa-0000-0000-0000-000000000000','coach','A'),('bbbbbbbb-0000-0000-0000-000000000000','coach','B'),
 ('cccccccc-0000-0000-0000-000000000000','coach','C'),('dddddddd-0000-0000-0000-000000000000','coach','D'),
 ('eeeeeeee-0000-0000-0000-000000000000','athlete','X');
insert into public.teams values ('a0000000-0000-0000-0000-000000000000','TA','aaaaaaaa-0000-0000-0000-000000000000'),
 ('b0000000-0000-0000-0000-000000000000','TB','bbbbbbbb-0000-0000-0000-000000000000'),
 ('c0000000-0000-0000-0000-000000000000','TC','cccccccc-0000-0000-0000-000000000000');
insert into public.swimmers values
 ('51000000-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000000','eeeeeeee-0000-0000-0000-000000000000','S1',''),
 ('52000000-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-000000000000',null,'S2',''),
 ('53000000-0000-0000-0000-000000000000','bbbbbbbb-0000-0000-0000-000000000000',null,'S3','');
insert into public.team_swimmers (team_id, swimmer_id) values
 ('a0000000-0000-0000-0000-000000000000','51000000-0000-0000-0000-000000000000'),
 ('b0000000-0000-0000-0000-000000000000','52000000-0000-0000-0000-000000000000'),
 ('a0000000-0000-0000-0000-000000000000','53000000-0000-0000-0000-000000000000');
insert into public.team_members values ('a0000000-0000-0000-0000-000000000000','eeeeeeee-0000-0000-0000-000000000000');
insert into public.training_sessions (id, coach_id, team_id, title, session_date) values
 ('5e000000-0000-0000-0000-000000000000','aaaaaaaa-0000-0000-0000-000000000000','a0000000-0000-0000-0000-000000000000','TA Montag','2026-10-05');
insert into public.athlete_notes (swimmer_id, body) values ('51000000-0000-0000-0000-000000000000','Notiz S1'),('52000000-0000-0000-0000-000000000000','Notiz S2'),('53000000-0000-0000-0000-000000000000','Notiz S3');
insert into public.health_events (swimmer_id, title, visible_to_athlete) values ('51000000-0000-0000-0000-000000000000','Schulter',true),('51000000-0000-0000-0000-000000000000','intern',false);
insert into public.training_attendance (training_session_id, swimmer_id, status) values ('5e000000-0000-0000-0000-000000000000','51000000-0000-0000-0000-000000000000','krank');
insert into public.befinden_entries (athlete_id, entry_date, has_pain) values ('eeeeeeee-0000-0000-0000-000000000000','2026-10-05',false);
insert into storage.buckets (id, name, public) values ('athlete-documents','athlete-documents',false) on conflict do nothing;
