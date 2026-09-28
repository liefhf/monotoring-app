# Datenbank-Skripte

Jedes Skript einmal im **Supabase SQL-Editor** ausführen (Inhalt einfügen → *Run*).
Alle Skripte sind wiederholbar – ein zweiter Lauf macht nichts kaputt.
Die Reihenfolge ist wichtig, weil spätere Skripte auf früheren aufbauen.

| # | Datei | Wofür |
|---|-------|-------|
| 1 | `kapitel1_grundbegriffe.sql` | Kapitel 1: Belastung, Kernziele, Wachstum |
| 2 | `schwimmer_pflichtzeiten.sql` | Meine Schwimmer, Zeiten, Pflichtzeiten |
| 3 | `schwimmer_erweiterung.sql` | Infos, Punkte, Staffeln & Freiwasser beim Schwimmer |
| 4 | `termine_news_gruppen.sql` | Kalender, Terminanmeldung, News-Wall, Gruppenräume |
| 5 | `wettkampf_feedback.sql` | Wettkampf-Feedback, Auswertung, Athleten-Login verknüpfen |
| 6 | `staffeln.sql` | Staffeln im Wettkampf-Feedback |
| 7 | `kalender_zusammenfuehren.sql` | alten Saisonkalender in den neuen Kalender übernehmen |
| 8 | `hinweise.sql` | Hinweise in der App (Glocke) |
| 9 | `athleten_zusammenfuehren.sql` | Eine Athletenliste: Teams enthalten alle Athleten, Login nur noch verknüpft |
| 10 | `schmerzen.sql` | Schmerzmeldung mit Körpermodell, Coach sieht Meldungen, Hinweis bei starken Schmerzen |
| 11 | `datenregel_umsetzen.sql` | Automatisches Löschen alter Hinweise abschalten |
| 12 | `pflichtzeiten_beide_bahnen.sql` | Pflichtzeiten-Listen: 25m- und 50m-Zeiten anerkennen (optional je Liste) |
| 13 | `disqualifikationen.sql` | Starts ohne Zeit (DS/AB/NA) mit Grund erfassen |
| 14 | `athleten_fokus.sql` | Trainingsfokus je Athlet (Hauptlagen, Streckenbereich, Notiz) |
| 15 | `athleten_fokus_strecken.sql` | Trainingsfokus: einzelne Strecken je Athlet |


Dateien `daten_*.sql` enthalten echte Schwimmerdaten und werden nicht eingecheckt (`.gitignore`).

## Datenregel (seit 28.09.2026)

Die App läuft mit echten Daten. Neue Skripte ändern, löschen oder ergänzen **keine** vorhandenen Daten – sie legen nur neue Tabellen, Spalten und Regeln an (siehe `CLAUDE.md`).

