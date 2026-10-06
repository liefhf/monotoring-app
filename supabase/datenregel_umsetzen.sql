-- =====================================================================
-- Datenregel umsetzen: nichts automatisch loeschen
--
-- Einmal im Supabase SQL-Editor ausfuehren. Aendert KEINE Daten,
-- entfernt nur das automatische Loeschen alter, gelesener Hinweise
-- (war in hinweise.sql enthalten).
-- =====================================================================

drop trigger if exists notifications_cleanup on public.notifications;
drop function if exists public.cleanup_notifications();
