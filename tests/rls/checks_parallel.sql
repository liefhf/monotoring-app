-- laeuft WAEHREND Verbindung 1 die Sperre haelt; beide haben Version 2 geladen
set role authenticated;
select set_config('request.jwt.sub', 'aaaaaaaa-0000-0000-0000-000000000000', false);
do $$ begin
  perform public.save_training_content('5e000000-0000-0000-0000-000000000000', 2, '{"title":"parallel 2","team_id":"a0000000-0000-0000-0000-000000000000","session_date":"2026-10-05"}', '[{"section_key":"p2","section_name":"P2","sort_order":0,"rows":[{"repetitions":2,"distance":100,"sort_order":0}]}]', '[]', '[]');
  perform t.expect('parallel: zweites gleichzeitiges Speichern bekommt Konflikt', false);
exception when serialization_failure then perform t.expect('parallel: zweites gleichzeitiges Speichern bekommt Konflikt', true); end $$;
