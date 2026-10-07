# Browser-Tests der Arbeitsabläufe

Keine echten Daten, keine echte Datenbank: `mockdb.cjs` beantwortet alle Supabase-Anfragen im Browser
und behält Änderungen im Speicher (so ist „nach dem Neuladen noch da“ prüfbar). Fehler lassen sich gezielt
auslösen: fehlende Tabelle, Lesefehler, Schreibfehler, 0 betroffene Zeilen (wie bei RLS), Speicherfehler,
verzögerte Antworten. Die Browser-Uhr steht fest auf Mi 07.10.2026 12:00.

```bash
# 1. Testserver mit Schein-Adresse (die echte .env.local wird dabei nicht benutzt)
NEXT_PUBLIC_SUPABASE_URL=http://mock.local NEXT_PUBLIC_SUPABASE_ANON_KEY=x npx next dev -p 3200
# 2. Tests (Handy und Desktop)
node tests/e2e/workflows.cjs 390x844
node tests/e2e/workflows.cjs 1280x900
# optional: nur einen Test, Screenshots in einen Ordner
SHOTS=/tmp/shots node tests/e2e/workflows.cjs 390x844 "9 Dokument"
```

Benötigt Playwright mit Chromium (`npm i -D playwright` oder vorinstalliert; Pfad über `CHROMIUM=`).
