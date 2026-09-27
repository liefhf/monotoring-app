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

Optional: `demo_kapitel1_einfuegen.sql` / `demo_kapitel1_entfernen.sql` für Beispieldaten.

Dateien `daten_*.sql` enthalten echte Schwimmerdaten und werden nicht eingecheckt (`.gitignore`).
