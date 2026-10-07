select t.expect('parallel: genau eine Fassung (Titel parallel 1, 1 Abschnitt, 1 Serie)',
  (select title from training_sessions where id = '5e000000-0000-0000-0000-000000000000') = 'parallel 1'
  and (select count(*) from training_sections) = 1 and (select count(*) from training_rows) = 1
  and (select content_version from training_sessions where id = '5e000000-0000-0000-0000-000000000000') = 3);
