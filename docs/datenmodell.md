# Datenmodell – Prüfung und Zielstruktur

## Kern

```
profiles (Login, Rolle coach/athlete)
   │ 1:n (coach_id)
teams ──< team_swimmers >── swimmers (die eine Athleten-Identität, profile_id = optionaler Login)
   │                           ├─< swimmer_results, swimmer_non_finishes   (Zeiten)
   │                           ├─< fitness_tests, lactate_tests            (Diagnostik)
   │                           ├─< health_events, athlete_documents        (neu, Skript 23)
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
