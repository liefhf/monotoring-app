-- =====================================================================
-- DEMO-DATEN fuer Kapitel 1
--
-- Voraussetzung: kapitel1_grundbegriffe.sql wurde bereits ausgefuehrt.
--
-- Im Supabase SQL-Editor komplett ausfuehren. Das Skript nimmt das Team
-- mit den meisten Athleten, dessen Coach und bis zu 4 Athleten daraus.
--
-- Es legt an:
--   - 7 Wochen Training (6 vergangene + laufende Woche)
--     Wasser Mo/Mi/Fr mit Ueben/Training, Land Di/Do in wechselnder Zahl
--   - geplante RPE und Kernziel-Tags
--   - RPE-Rueckmeldungen der Athleten zu allen vergangenen Einheiten
--   - Wachstumsmessungen fuer bis zu 3 Athleten (frueh / normal / spaet)
--
-- Alle Demo-Einheiten beginnen mit "[Demo]", alle Messungen haben
-- note = 'demo'. Entfernen mit demo_kapitel1_entfernen.sql.
--
-- Hinweis: Die Demo-Einheiten sehen auch die echten Athleten des Teams.
-- =====================================================================

do $$
declare
  v_team      uuid;
  v_coach     uuid;
  v_athletes  uuid[];
  v_week      date;
  v_day       date;
  v_session   uuid;
  v_sec       uuid;
  v_w         int;
  v_d         int;
  v_k         int;
  v_n         int := 0;
  v_planned   int;
  v_rpe       int;
  v_offset    int;
  v_land_days int[];
  v_goals     text[];
  v_gtype     text;
  -- Landeinheiten pro Woche, aelteste zuerst -> gruen/gelb/rot im Check
  c_land_pattern int[] := array[2, 2, 1, 2, 0, 2, 1];
begin
  if exists (select 1 from public.training_sessions where title like '[Demo]%') then
    raise exception 'Demo-Daten sind schon vorhanden. Erst demo_kapitel1_entfernen.sql ausfuehren.';
  end if;

  select t.id, t.coach_id
    into v_team, v_coach
    from public.teams t
    join public.team_members tm on tm.team_id = t.id
   group by t.id, t.coach_id
   order by count(*) desc
   limit 1;

  if v_team is null then
    raise exception 'Kein Team mit Athleten gefunden. Bitte zuerst ein Team anlegen und Athleten zuordnen.';
  end if;

  select array_agg(athlete_id)
    into v_athletes
    from (
      select athlete_id from public.team_members
       where team_id = v_team
       order by athlete_id
       limit 4
    ) a;

  -- -------------------------------------------------------------------
  -- Trainingseinheiten
  -- -------------------------------------------------------------------
  for v_w in 0..6 loop
    -- v_w = 0 ist die aelteste Woche, 6 die laufende
    v_week := (date_trunc('week', current_date)::date) - (6 - v_w) * 7;

    -- Wasser Montag (Technik + GA1), Mittwoch (GA2), Freitag (WA/Sprint)
    for v_d in 0..2 loop
      v_day := v_week + v_d * 2;
      v_planned := case v_d when 0 then 4 when 1 then 7 else 6 end;
      v_goals := case when v_d = 0 then array['schulter', 'beweglichkeit'] else '{}'::text[] end;

      insert into public.training_sessions
        (coach_id, team_id, title, session_date, start_time, training_type,
         duration_minutes, total_meters, pool_length, focus, planned_rpe, core_goals)
      values
        (v_coach, v_team,
         '[Demo] ' || case v_d when 0 then 'Technik + GA1' when 1 then 'GA2 Schwelle' else 'WA + Sprint' end,
         v_day, '16:30', 'water', 90,
         case v_d when 0 then 2400 when 1 then 2200 else 1750 end,
         25,
         case v_d when 0 then 'Kraultechnik, Grundlage' when 1 then 'Tempo halten' else 'Wettkampftempo' end,
         v_planned, v_goals)
      returning id into v_session;

      -- Warm Up am Land
      insert into public.training_warmup_land_rows
        (training_session_id, exercise, sets, repetitions, material, intensity, sort_order)
      values
        (v_session, 'Schulter-Außenrotation', '2', '15', 'Theraband', 'locker', 0),
        (v_session, 'Armkreisen + Mobilisation', '1', '60 s', null, 'locker', 1);

      -- Einschwimmen (nicht gekennzeichnet)
      insert into public.training_sections (training_session_id, section_key, section_name, sort_order, practice_mode)
      values (v_session, 'einschwimmen', 'Einschwimmen', 0, null)
      returning id into v_sec;

      insert into public.training_rows
        (section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order)
      values
        (v_sec, 1, 400, 'locker, lange Züge', 'Lagen', '{}', 'BZ2 (GA1)', 'P', '20s', 0),
        (v_sec, 4, 50, 'Beine mit Brett', 'Beine', '{Brett}', 'BZ2 (GA1)', 'P', '15s', 1);

      -- Technik = Ueben
      insert into public.training_sections (training_session_id, section_key, section_name, sort_order, practice_mode)
      values (v_session, 'technik', 'Technik', 1, 'ueben')
      returning id into v_sec;

      insert into public.training_rows
        (section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order)
      values
        (v_sec, 8, 50, 'Abschlagkraul, sauberer Wasserfassen', 'Kraul', '{Flossen}', 'BZ2 (GA1)', 'P', '20s', 0);

      -- Hauptblock = Training
      insert into public.training_sections (training_session_id, section_key, section_name, sort_order, practice_mode)
      values (v_session, 'hauptblock', 'Hauptblock', 2, 'training')
      returning id into v_sec;

      if v_d = 0 then
        insert into public.training_rows
          (section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order)
        values (v_sec, 6, 200, 'gleichmäßig', 'Kraul', '{}', 'BZ3 (GA1)', 'P', '20s', 0);
      elsif v_d = 1 then
        insert into public.training_rows
          (section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order)
        values (v_sec, 10, 100, 'Schwellentempo halten', 'Kraul', '{}', 'BZ5 (GA2)', '@', '1:40', 0);
      else
        insert into public.training_rows
          (section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order)
        values
          (v_sec, 8, 50, 'Wettkampftempo', 'Beliebig', '{}', 'BZ7 (SA)', 'P', '1:00', 0),
          (v_sec, 6, 25, 'maximal aus dem Wasserstart', 'Beliebig', '{}', 'BZ8 (S)', 'P', '1:30', 1);
      end if;

      -- Ausschwimmen (nicht gekennzeichnet)
      insert into public.training_sections (training_session_id, section_key, section_name, sort_order, practice_mode)
      values (v_session, 'ausschwimmen', 'Ausschwimmen', 3, null)
      returning id into v_sec;

      insert into public.training_rows
        (section_id, repetitions, distance, exercise, style, materials, zone, interval_type, interval_time, sort_order)
      values (v_sec, 1, 200, 'ganz locker', 'Rücken', '{}', 'BZ1 (Rekom)', 'P', null, 0);
    end loop;

    -- Land Dienstag / Donnerstag, Anzahl laut Muster
    v_land_days := case c_land_pattern[v_w + 1]
                     when 0 then '{}'::int[]
                     when 1 then array[1]
                     else array[1, 3] end;

    foreach v_d in array coalesce(v_land_days, '{}'::int[]) loop
      v_day := v_week + v_d;
      v_goals := case (v_w + v_d) % 4
                   when 0 then array['kraft', 'rumpf']
                   when 1 then array['kraftausdauer', 'schulter']
                   when 2 then array['koordination', 'beweglichkeit']
                   else array['kraft', 'ruecken_knie'] end;
      -- "regeneration" wird bewusst nie gesetzt -> Luecke in der Monatsuebersicht

      insert into public.training_sessions
        (coach_id, team_id, title, session_date, start_time, training_type,
         duration_minutes, total_meters, pool_length, focus, planned_rpe, core_goals)
      values
        (v_coach, v_team, '[Demo] Athletik', v_day, '15:00', 'land',
         60, null, null, 'Kraft und Stabilität', 6, v_goals)
      returning id into v_session;

      insert into public.training_land_rows
        (training_session_id, exercise, sets, repetitions, weight, material, intensity, sort_order)
      values
        (v_session, 'Kniebeuge', '3', '10', 'Körpergewicht', null, 'RPE 6', 0),
        (v_session, 'Klimmzug-Negativ', '3', '5', null, 'Stange', 'RPE 7', 1),
        (v_session, 'Unterarmstütz', '3', '45 s', null, 'Matte', 'RPE 6', 2),
        (v_session, 'Y-T-W am Boden', '2', '12', null, 'Matte', 'locker', 3);
    end loop;
  end loop;

  -- -------------------------------------------------------------------
  -- RPE-Rueckmeldungen zu allen vergangenen Demo-Einheiten
  --   Athlet 1: meist wie geplant
  --   Athlet 2: harte Einheiten deutlich haerter  -> rot
  --   Athlet 3: oft leichter als geplant          -> gelb
  --   Athlet 4: gemischt
  -- -------------------------------------------------------------------
  for v_session, v_planned in
    select id, planned_rpe
      from public.training_sessions
     where title like '[Demo]%'
       and team_id = v_team
       and session_date < current_date
     order by session_date
  loop
    v_n := v_n + 1;

    for v_k in 1..array_length(v_athletes, 1) loop
      v_offset := case v_k
                    when 1 then v_n % 2
                    when 2 then case when v_planned >= 6 then 2 else 1 end
                    when 3 then case when v_n % 3 = 0 then -2 else -1 end
                    else (v_n % 3) - 1
                  end;
      v_rpe := greatest(1, least(10, v_planned + v_offset));

      insert into public.training_feedback
        (training_session_id, athlete_id, rpe, comment, completed)
      values
        (v_session, v_athletes[v_k], v_rpe, '[Demo]', true)
      on conflict (training_session_id, athlete_id) do nothing;
    end loop;
  end loop;

  -- -------------------------------------------------------------------
  -- Entwicklungsverlauf fuer bis zu 3 Athleten
  -- Geburtsdatum/Geschlecht werden nur gesetzt, wenn sie leer sind.
  -- -------------------------------------------------------------------
  select pg_catalog.format_type(a.atttypid, a.atttypmod)
    into v_gtype
    from pg_catalog.pg_attribute a
   where a.attrelid = 'public.profiles'::regclass
     and a.attname = 'gender';

  for v_k in 1..least(3, array_length(v_athletes, 1)) loop
    execute format(
      'update public.profiles
          set birth_date = coalesce(birth_date, $1),
              gender     = coalesce(gender, $2::%s)
        where id = $3',
      v_gtype
    )
    using
      (array['2014-05-20', '2013-02-10', '2011-03-20'])[v_k]::date,
      (array['male', 'female', 'male'])[v_k],
      v_athletes[v_k];

    insert into public.growth_measurements
      (athlete_id, measured_on, height_cm, sitting_height_cm, weight_kg, note, created_by)
    select
      v_athletes[v_k],
      current_date - make_interval(months => (4 - i) * 3),
      (case v_k
         when 1 then array[158.0, 161.5, 164.5, 166.5, 168.0]  -- frueh entwickelt, im Schub
         when 2 then array[154.0, 155.8, 157.5, 158.6, 159.5]  -- altersgemaess
         else        array[142.0, 144.0, 146.3, 148.5, 150.5]  -- spaet entwickelt
       end)[i + 1],
      (case v_k
         when 1 then array[82.0, 84.0, 85.5, 87.0, 88.0]
         when 2 then array[80.5, 81.5, 82.4, 83.0, 83.5]
         else        array[72.5, 73.5, 74.7, 75.6, 76.5]
       end)[i + 1],
      (case v_k
         when 1 then array[48.0, 51.0, 53.0, 55.0, 57.0]
         when 2 then array[42.0, 43.5, 45.0, 46.0, 47.0]
         else        array[34.0, 35.2, 36.5, 37.8, 39.0]
       end)[i + 1],
      'demo',
      v_coach
    from generate_series(0, 4) as i
    on conflict (athlete_id, measured_on) do nothing;
  end loop;

  raise notice 'Demo-Daten angelegt fuer Team % mit % Athleten.', v_team, array_length(v_athletes, 1);
end;
$$;
