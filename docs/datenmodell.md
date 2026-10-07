# Datenmodell – Prüfung und Zielstruktur

## Kern

```
profiles (Login, Rolle coach/athlete)
   │ 1:n (coach_id)
teams ──< team_swimmers >── swimmers (die eine Athleten-Identität, profile_id = optionaler Login)
   │                           ├─< swimmer_results, swimmer_non_finishes   (Zeiten)
   │                           ├─< fitness_tests, lactate_tests            (Diagnostik)
   │                           ├─< health_events, athlete_documents        (neu, Skript 23)
   │                           ├─< athlete_goals, athlete_notes            (neu, Skript 24)
   │                           └─< training_attendance
   └─< training_sessions ─< training_sections ─< training_rows (Serien, Zone)
          ├─< training_land_rows, training_warmup_land_rows
          └─< training_feedback (RPE vom Athleten, über profile_id)
befinden_entries, pain_reports, growth_measurements, athlete_routines → über profile_id (Login)
competitions ─< competition_events/sections ─< competition_starts (→ Trigger in swimmer_results)
calendar_entries, calendar_tasks, news_posts, team_messages, notifications
```

## Bewertung
- **Eine Identität je Athlet (`swimmers`)** ist richtig: Athleten ohne Login (Kinder, Gäste) gehören dazu. Was der Athlet selbst erfasst (Check-in, Schmerz, RPE), hängt technisch am Login (`profile_id`). Die App führt beides im Profil zusammen.
- **Altlasten (nicht löschen, Datenregel):** `team_members` wird per Trigger aus `team_swimmers` mitgepflegt. `swim_results` ist durch `swimmer_results` ersetzt und wird nicht mehr gelesen. `annual_plans`/`olympic_cycles` werden nicht mehr gelesen.
- **Redundanz:** `training_sessions.total_meters` ist eine gespeicherte Summe der Serien. Das ist bewusst so, damit Listen schnell laden.
- **Neu (Skript 23):** `health_events` (Gesundheit mit Trainingsrelevanz, ohne Diagnosen) und `athlete_documents` mit privatem Speicher `athlete-documents`. Beide hängen an `swimmers`, mit RLS über `coach_owns_swimmer`. Athleten dürfen eigene Einträge nur lesen.

## RLS
- Im Projekt sichtbar und geprüft: alle Tabellen aus den Skripten 1–23. Coach-Zugriff läuft über `coach_owns_swimmer`, `coach_has_athlete` oder `is_team_coach`, Athleten-Zugriff über `auth.uid()`.
- **Nicht sichtbar:** Die Regeln der Kern-Tabellen (`profiles`, `teams`, `team_members`, `befinden_entries`, `pain_reports`, `training_*`, `competitions`, `competition_events`, `competition_sections`, `calendar_tasks`). Zur Prüfung `supabase/regeln_anzeigen.sql` und `supabase/sicherheitscheck.sql` ausführen.
- Bekannter offener Punkt: Die Regel „Coaches can read athlete profiles“ erlaubt laut früherer Analyse jedem Coach, alle Athletenprofile zu lesen.

- **Neu (Skript 24):** `athlete_goals`. Athleten lesen sichtbare eigene Ziele. `athlete_notes` ist nur für Trainer sichtbar.

## Berechtigungsmodell (geprüft am 07.10.2026)

- **Zuständigkeit:** Ein Athlet (`swimmers`) gehört genau einem Coach (`swimmers.coach_id`). Ein Team gehört genau einem Coach (`teams.coach_id`). Alle neuen Tabellen (Skripte 23/24) prüfen über `coach_owns_swimmer`. Wechselt ein Athlet den Coach (`coach_id` ändert sich), wandern Gesundheit, Ziele, Notizen und Dokumente automatisch mit, und der alte Coach sieht sie nicht mehr.
- **Mehrere Trainer pro Team** kennt das Datenmodell bisher nicht. Ein Co-Trainer bräuchte heute ein eigenes Team bzw. eigene Athleten. Eine Erweiterung (Tabelle `team_coaches`) wäre eine Produktentscheidung.
- **Athleten** lesen nur eigene Einträge über `swimmers.profile_id = auth.uid()`: Gesundheit (nur `visible_to_athlete`), Ziele (nur sichtbare) und Dokumentliste. Ändern dürfen sie nichts. **Trainernotizen** haben keine Regel für Athleten und sind damit für sie unsichtbar.
- **Nicht angemeldet:** Alle Regeln gelten nur für die Rolle `authenticated`.
- **Dateien** (`athlete-documents`) sind privat. Zugriff gibt es nur für den zuständigen Coach über `coach_owns_swimmer_folder` (Textvergleich statt uuid-Cast, damit fremde Ordnernamen nie zu Fehlern führen).
- **Getestet** mit einem lokalen PostgreSQL 16 und nachgebildetem `auth.uid()`/Storage: Jeder Coach sieht nur eigene Daten, kann nicht in fremde Athleten schreiben und keine eigenen Einträge auf fremde Athleten umhängen. Der Athlet sieht keine Notizen und nichts Unsichtbares und kann nichts schreiben. Wer nicht angemeldet ist, sieht nichts. Beide Skripte lassen sich zweimal hintereinander ausführen.
- **Löschverhalten:** Wird ein Athlet gelöscht, werden seine Einträge in den neuen Tabellen mitgelöscht (`on delete cascade`), wie bei Ergebnissen und Tests. Das Löschen eines Athleten fragt in der App vorher nach.
