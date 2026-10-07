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

## Berechtigungsmodell (Stand 07.10.2026, Korrekturphase)

### Rollen
| Wer | Bedeutung | Gespeichert in |
|---|---|---|
| Stammtrainer | zuständig für einen Athleten, pflegt Stammdaten, nimmt ihn in Teams auf | `swimmers.coach_id` |
| Haupttrainer | Besitzer eines Teams, fügt weitere Trainer hinzu und entzieht sie | `teams.coach_id` |
| weiterer Trainer | arbeitet in einem Team mit (Skript 25/26) | `team_coaches` (`revoked_at` = entzogen) |
| Athlet | sieht nur Eigenes | `swimmers.profile_id` = Login |

Athleten werden **nie dupliziert**. Ein Athlet kann in mehreren Teams sein (`team_swimmers`).
`team_coaches` startet leer – vorhandene Zuordnungen bleiben über `teams.coach_id`/`swimmers.coach_id`
gültig, es werden keine Daten übertragen.

### Wer sieht was – heute (bis Skript 25)
Nur der Stammtrainer sieht Athletendaten (`coach_owns_swimmer`). Teaminhalte sieht nur der Haupttrainer.

### Wer sieht was – nach Skript 26 (optional)
- **Stammtrainer:** wie bisher, alles zu seinen Athleten.
- **Haupttrainer:** zusätzlich alle Athleten, die *aktuell* in seinen Teams sind.
- **weiterer Trainer:** Athleten der Teams, denen er aktiv zugeordnet ist; Einheiten, Anwesenheit und Feedback dieser Teams. Stammdaten nur lesen.
- **Historische Daten:** Wer Zugriff auf einen Athleten hat, sieht auch dessen Vorgeschichte (Zeiten, Befinden, Gesundheit) – es ist dieselbe Person. Endet die Zuordnung (Entzug, Athlet verlässt das Team), endet der Zugriff **sofort und vollständig**, auch auf alte Daten. Einheiten, die ein entzogener Trainer selbst angelegt hat, sieht er weiter, aber ohne Athletendaten.
- **Weitergabe verhindert:** Athleten in Teams aufnehmen darf nur der Stammtrainer. Ein weiterer Trainer kann einen Athleten also nicht in ein eigenes Team „mitnehmen“ und so anderen Zugriff verschaffen. Neue Trainer trägt nur der Haupttrainer ein; nur Konten mit Rolle `coach`.
- **Rolle:** Seit Skript 25 kann niemand seine eigene Rolle über die App ändern (Trigger `profiles_protect_role`).
- **Rückweg:** `trainerteam_zuruecksetzen.sql` stellt den Zustand vor 26 wieder her.

### Übergang
1. Skript 25 ausführen. Es zeigt am Ende, in welchen Teams Athleten mit *anderem* Stammtrainer sind – diese sieht der Haupttrainer nach Skript 26 zusätzlich. Liste ansehen.
2. Datensicherung, dann Skript 26.
3. Weitere Trainer eintragen (bis es dafür einen Dialog gibt, im SQL-Editor als Haupttrainer-Aktion):
   `insert into public.team_coaches (team_id, coach_id) values ('<team-id>', '<profil-id des Trainers>');`
   Entziehen: `update public.team_coaches set revoked_at = now() where team_id = '<team-id>' and coach_id = '<profil-id>';`

### Getestet
`bash tests/rls/run.sh` – Wegwerf-Datenbank, eingeschränkte Rollen `authenticated`/`anon`, 73 Prüfungen in drei Phasen
(vorher, Trainerteam aktiv, nach dem Rückweg): fremde Athleten, Umhängen auf fremde Athleten, fremde Ordner, ungültige
Ordner, Rolle selbst ändern, sich selbst als Trainer eintragen, Entzug, Teamwechsel, Weitergabe über ein zweites Team.
**Grenze:** Die Regeln der Kern-Tabellen (Trainings, Profile, Teams) stehen nicht im Projekt und sind im Test *angenommen*.
Ob die echte Datenbank so aussieht, zeigen erst `regeln_anzeigen.sql` und `sicherheitscheck.sql`.

### Dateien
`athlete-documents` ist privat. Zugriff nur über `coach_owns_swimmer_folder` (Textvergleich, kein uuid-Cast).
Die App lädt erst die Datei, dann den Eintrag; schlägt der Eintrag fehl, wird die Datei wieder entfernt. Beim Löschen
wird erst der Eintrag gelöscht, dann die Datei; schlägt das Entfernen der Datei fehl, bietet die App „Datei erneut
löschen“ an. Ein Athlet mit hochgeladenen Dateien kann erst gelöscht werden, wenn seine Dokumente gelöscht sind –
so bleiben keine Dateien ohne Eintrag zurück. Bestehende Dateien werden nie automatisch aufgeräumt.
