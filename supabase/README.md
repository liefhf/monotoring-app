# Datenbank-Skripte

**Kurzweg:** `status_pruefen.sql` ausführen (zeigt ✓/✗ je Skript, ändert nichts).
Fehlt etwas aus 1, 12–25, 27 oder `serienzeiten.sql`, einfach **`alles_aktualisieren.sql`** ausführen – das spielt
alle diese Skripte auf einmal ein und überspringt Vorhandenes.

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
| 16 | `training_notizen.sql` | Notizen zur Trainingseinheit (auch im Ausdruck) |
| 17 | `anwesenheit.sql` | Anwesenheitsliste je Trainingseinheit |
| 18 | `wettkampf_fehler.sql` | Wettkampf: Technikfehler per Klick je Abschnitt |
| 19 | `laktattests.sql` | Laktat-Stufentests mit Schwellen und Zonen |
| 20 | `wettkampftag.sql` | Mein Wettkampf-Tag: Routine der Athleten, Startzeiten |
| 21 | `testbatterie.sql` | Testbatterie (Athletik- und Schwimmtests) |
| 22 | `mein_fortschritt.sql` | Athleten sehen ihre eigenen Zeiten, Pflichtzeiten, Laktat-Zonen |
| 23 | `gesundheit_dokumente.sql` | Gesundheit (Ausfälle, Einschränkungen, Freigabe) und Dokumente mit Ablaufdatum je Athlet |
| 24 | `ziele_notizen.sql` | Ziele je Athlet (Zeit-, Technik-, Trainingsziel) und interne Trainernotizen |
| 25 | `sicherheit_trainerteam.sql` | Rollen-Schutz, Schmerzfrage „nicht angegeben“, Athlet liest eigene Anwesenheit, Trainerteam **vorbereiten** (noch ohne Wirkung) |
| – | `serienzeiten.sql` | Serienzeiten je Trainingseinheit (Grundtabelle) |
| 27 | `training_speichern_serienzeiten.sql` | Training **atomar** speichern (Versionsvergleich, keine doppelten/verlorenen Serien), Serienzeiten mit Kontext (Strecke, Becken, Abgang, Sollzeit, „nicht geschwommen“), Athleten sehen eigene Serienzeiten, Trainer im Team per E-Mail verwalten |
| 26 | `trainerteam_aktivieren.sql` | **Optional, einzeln:** mehrere Trainer je Team. Rückweg: `trainerteam_zuruecksetzen.sql` |
| – | `speicher_absichern.sql` | **Optional:** Dokumenten-Ordner privat + 10 MB + nur PDF/Fotos (ändert eine Ordner-Einstellung, keine Daten) |

### Prüfskripte (lesen nur)
- `status_pruefen.sql` – welche Skripte sind eingespielt
- `sicherheitscheck.sql` – automatische Befunde. **Leer ist kein Beweis für Sicherheit.**
- `regeln_anzeigen.sql` – alle Regeln, Funktionen und Rechte (3 Ergebnisse als CSV an Claude geben)

### Reihenfolge für diese Version
1. Einstellungen → „Datensicherung herunterladen“ (und Supabase-Backup prüfen, siehe `docs/datensicherung.md`)
2. `status_pruefen.sql` → fehlt etwas aus 23–25, 27 oder Serienzeiten: `alles_aktualisieren.sql` (enthält alles außer 26)
3. `sicherheitscheck.sql` und `regeln_anzeigen.sql` → Ergebnisse als CSV an Claude
4. bei Befund zum Dokumenten-Ordner: `speicher_absichern.sql`
5. erst nach Durchsicht der Prüfabfrage aus 25: optional `trainerteam_aktivieren.sql`


Dateien `daten_*.sql` enthalten echte Schwimmerdaten und werden nicht eingecheckt (`.gitignore`).

## Datenregel (seit 28.09.2026)

Die App läuft mit echten Daten. Neue Skripte ändern, löschen oder ergänzen **keine** vorhandenen Daten – sie legen nur neue Tabellen, Spalten und Regeln an (siehe `CLAUDE.md`).

