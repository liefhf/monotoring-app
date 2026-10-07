# Datensicherung und Wiederherstellung

Es gibt **drei verschiedene Dinge** – nur alle zusammen sind eine Vollsicherung.

| Was | Wo | Enthält | Enthält nicht |
|---|---|---|---|
| **JSON-Datenexport** | App → Einstellungen → „Datensicherung herunterladen“ | alle Zeilen, die der angemeldete Trainer lesen darf (Athleten, Zeiten, Trainings, Befinden, Gesundheit, Ziele, Notizen, Dokument-Einträge …) | Dateien (Atteste), Tabellenstruktur, Regeln, Logins, Daten anderer Trainer |
| **Datei-Sicherung** | Supabase → Storage → `athlete-documents` → Dateien herunterladen | hochgeladene Dokumente | Tabellen |
| **Datenbank-Sicherung mit Struktur** | Supabase → Database → Backups (tägliche Sicherung je nach Tarif) oder `pg_dump` mit der Verbindungs-URL | alles inkl. Struktur, Regeln, Funktionen | Dateien im Storage |

Der JSON-Export schreibt in die Datei `complete: true/false` und `table_status` je Tabelle:
`ok`, `fehlt` (Skript noch nicht ausgeführt – kein Fehler) oder `fehler` (z. B. Verbindung). Ein unvollständiger
Export heißt `…-UNVOLLSTAENDIG.json` und zählt nicht als „letzte Sicherung“. Tabellen werden seitenweise
(1000 Zeilen) und sortiert nach `id` geladen, damit keine Zeile zwischen den Seiten verrutscht.

## Wiederherstellen – nur geübt in einer Testumgebung
Die App hat **bewusst keinen Wiederherstellen-Knopf**. Ein ungetesteter Import könnte echte Daten überschreiben.

Übungsweg (einmal pro Saison, nie im echten Projekt):
1. In Supabase ein **zweites, leeres Projekt** anlegen (kostenlos).
2. Dort die Struktur einspielen: Datenbank-Sicherung (`pg_dump --schema-only`) oder die Skripte aus `supabase/` in der README-Reihenfolge.
3. Daten aus der Datenbank-Sicherung (`pg_restore`) einspielen – *nicht* aus dem JSON-Export.
4. Die App lokal mit den Schlüsseln des Testprojekts starten (`.env.local` nur lokal ändern) und Stichproben prüfen: Athlet öffnen, Zeiten, Befinden, Dokumente.
5. Ergebnis notieren (Datum, was geklappt hat).

Der JSON-Export dient als **Notfall-Kopie zum Nachsehen** (z. B. einzelne gelöschte Zeiten wiederfinden) und für einen
Umzug, der dann von Hand oder mit einem geprüften Skript in einer Testumgebung erfolgt.
