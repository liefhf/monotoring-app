@AGENTS.md

# Datenregel (verbindlich – Produktivbetrieb seit 28.09.2026)

Die App wird mit echten Daten genutzt. Für jede Weiterentwicklung gilt:

- **Keine vorhandenen Daten ändern, überschreiben oder löschen.** Kein `UPDATE`, `DELETE`, `TRUNCATE` auf bestehende Zeilen in Migrationen oder Skripten.
- **Keine zusätzlichen Daten eintragen.** Keine Demo-, Beispiel- oder Testdaten, keine Seed-Skripte, keine Datenübernahmen (`INSERT … SELECT`) aus anderen Tabellen.
- **Datenbank-Änderungen nur additiv:** neue Tabellen, neue optionale Spalten (`add column if not exists`, ohne Pflichtwert für Altbestand), neue Policies/Funktionen/Trigger. Spalten und Tabellen nicht umbenennen oder entfernen.
- **Trigger dürfen Daten nur als direkte Folge einer Nutzeraktion schreiben** (z. B. Wettkampfzeit → Ergebnis beim Athleten). Kein automatisches Aufräumen oder Löschen im Hintergrund.
- **Nichts selbst in der Datenbank ausführen.** SQL-Skripte werden nur geschrieben; die Nutzerin führt sie selbst im Supabase SQL-Editor aus.
- Lösch- oder Aufräumfunktionen in der App nur, wenn die Nutzerin sie ausdrücklich verlangt, und immer mit Bestätigung.
- Vor riskanten Änderungen auf die Datensicherung hinweisen (Einstellungen → „Datensicherung herunterladen“).

## Dokumentation

- `docs/informationsarchitektur.md` – welche Seite wofuer da ist (jede Funktion an genau einer Stelle)
- `docs/monitoring-grundlagen.md` – fachliche Begruendung aller Kennzahlen mit Quellen
- `docs/datenmodell.md` – Tabellen, Altlasten, RLS
