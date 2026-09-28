-- =====================================================================
-- ALLE DATEN LOESCHEN - nur der Coach-Login bleibt
--
-- Achtung: Das Loeschen ist ENDGUELTIG und kann nicht rueckgaengig
-- gemacht werden.
--
-- So benutzen:
--   1. Skript im Supabase SQL-Editor ausfuehren, so wie es ist.
--      -> Es wird NICHTS geloescht. Unten unter "Messages" steht,
--         wie viele Eintraege je Bereich geloescht wuerden.
--   2. Wenn alles stimmt: in Zeile 28 'nein' durch 'JA' ersetzen
--      und noch einmal ausfuehren. Erst dann wird geloescht.
--
-- Was bleibt:  der eine Login mit der Rolle "coach" (Konto + Profil).
-- Was geht:    alle anderen Logins (Athleten), alle Athleten/Schwimmer,
--              Teams, Zeiten, Pflichtzeiten, Trainings, Saisonplanung,
--              Kalender, Anmeldungen, News, Gruppenraeume, Wettkaempfe,
--              Feedback, Check-ins, Befinden, Schmerzen, Hinweise.
--
-- Dateien (Gruppenraum-Dateien, Wettkampf-PDFs) lassen sich per SQL
-- nicht loeschen. Die Ordner leert man danach im Supabase-Dashboard
-- unter "Storage" (siehe Ende des Skripts).
-- =====================================================================

do $$
declare
  -- >>> Zum Loeschen hier 'nein' durch 'JA' ersetzen <<<
  v_bestaetigung text := 'nein';

  v_coach_count integer;
  v_coach_id uuid;
  v_table text;
  v_count bigint;
  v_tables text[] := array[
    'notifications',
    'team_messages', 'team_files',
    'news_posts',
    'calendar_registrations', 'calendar_tasks', 'calendar_entries', 'calendar_events',
    'competition_relay_legs', 'competition_relays', 'competition_reviews', 'competition_starts',
    'competition_import_drafts', 'competition_documents', 'competition_events',
    'competition_sections', 'competitions',
    'qualifying_times', 'qualifying_standards',
    'swimmer_results', 'team_swimmers', 'swimmers',
    'swim_results',
    'pain_reports', 'befinden_entries', 'growth_measurements',
    'training_feedback', 'training_warmup_land_rows', 'training_land_rows',
    'training_rows', 'training_sections', 'training_sessions',
    'annual_plans', 'olympic_cycles',
    'team_members', 'teams'
  ];
begin
  -- Den einen Coach finden, der bleibt
  select count(*) into v_coach_count from public.profiles where role = 'coach';

  if v_coach_count <> 1 then
    raise exception 'Abbruch: Es gibt % Coach-Konten. Das Skript erwartet genau eins - bitte Bescheid geben.', v_coach_count;
  end if;

  select id into v_coach_id from public.profiles where role = 'coach';

  raise notice '--- Es bleibt: Coach-Login % ---', v_coach_id;

  -- Uebersicht: was wuerde geloescht?
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('select count(*) from public.%I', v_table) into v_count;
      raise notice '%: % Eintraege', rpad(v_table, 28), v_count;
    end if;
  end loop;

  select count(*) into v_count from public.profiles where id <> v_coach_id;
  raise notice '%: % Eintraege', rpad('profiles (ausser Coach)', 28), v_count;
  select count(*) into v_count from auth.users where id <> v_coach_id;
  raise notice '%: % Eintraege', rpad('Logins (ausser Coach)', 28), v_count;

  if v_bestaetigung <> 'JA' then
    raise notice '=== VORSCHAU - es wurde NICHTS geloescht. Zum Loeschen v_bestaetigung auf ''JA'' setzen. ===';
    return;
  end if;

  -- Loeschen in der Reihenfolge der Liste (abhaengige Tabellen zuerst).
  -- Bewusst DELETE statt TRUNCATE ... CASCADE: Verweist eine unbekannte
  -- Tabelle auf diese Daten, bricht das Skript mit einer Meldung ab und
  -- es wird GAR NICHTS geloescht (alles laeuft in einem Schritt).
  foreach v_table in array v_tables loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I', v_table);
    end if;
  end loop;

  -- Alle anderen Profile und Logins entfernen
  delete from public.profiles where id <> v_coach_id;
  delete from auth.users where id <> v_coach_id;

  raise notice '=== FERTIG - alle Daten geloescht, nur der Coach-Login ist geblieben. ===';
end $$;

-- ---------------------------------------------------------------------
-- Danach die Dateien im Dashboard entfernen:
--   Supabase -> Storage -> Bucket "team-files"      -> alles markieren -> Delete
--   Supabase -> Storage -> Bucket "competition-pdfs" -> alles markieren -> Delete
-- ---------------------------------------------------------------------
