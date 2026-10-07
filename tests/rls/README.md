# Zugriffsregeln lokal testen

`bash tests/rls/run.sh` startet eine **leere Wegwerf-Datenbank** (lokales PostgreSQL 16),
spielt `stub.sql` (Nachbau der Supabase-Grundlagen), die Skripte 17, 23, 24, 25 und Testdaten
(`fixtures.sql`) ein und prüft als eingeschränkte Rollen `authenticated`/`anon` – nicht als Admin.

1. Phase 1: Zustand nach Skript 25 (Trainerteam vorbereitet, nicht aktiv)
2. Phase 2: nach Skript 26 (Trainerteam aktiv) + Trainerteam-Fälle (`checks_team.sql`)
3. Phase 3: nach dem Rückweg (`trainerteam_zuruecksetzen.sql`) – muss wieder wie Phase 1 sein

**Grenze:** Die Kern-Tabellen (Trainings, Profile, Teams …) wurden direkt in Supabase angelegt.
Ihre Regeln sind in `stub.sql` nur *angenommen* (`coach_id = auth.uid()`). Ob die echte Datenbank
so aussieht, zeigt erst `supabase/regeln_anzeigen.sql` + `supabase/sicherheitscheck.sql`.
Nie gegen die echte Datenbank ausführen.
