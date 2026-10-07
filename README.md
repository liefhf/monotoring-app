# Monitoring App

Athlete-Monitoring für den leistungsorientierten Schwimmsport. Die App hat zwei Bereiche:

- **Coach:** Kommandozentrale (wer braucht heute Aufmerksamkeit?), zentrales Athletenprofil, Trainingswoche mit Schnelleingabe, Anwesenheit, Wettkämpfe und Meldehilfe, Pflichtzeiten, Diagnostik, Gesundheit, Ziele, Wochenbericht.
- **Athlet:** bewusst einfach, auch für Kinder: Heute · Training · Fortschritt · Termine. Check-in mit fünf Gesichtern, Feedback nach dem Training, Bestzeiten und Ziele.

Technik: Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS v4, Supabase (`@supabase/supabase-js`, RLS), Vitest.

## Starten

```bash
npm install
npm run dev          # http://localhost:3000
```

Benötigt `.env.local` mit `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Nur den Anon-Key verwenden.

| Befehl | Zweck |
|---|---|
| `npm run dev` | Entwicklung |
| `npm run build` | Produktions-Build |
| `npm run lint` | ESLint |
| `npm test` | Tests (Vitest) |
| `npx tsc --noEmit` | TypeScript-Prüfung |

## Aufbau

```
app/coach/        Coach-Bereich (RoleGuard in layout.tsx)
app/athlete/      Athleten-Bereich
components/       UI-Bausteine (ui.tsx) und Fach-Komponenten (Panels, Navigation)
lib/              Berechnungen ohne Datenbank (mit Tests) und Datenzugriff-Helfer
supabase/         SQL-Skripte – nur additiv, werden von Hand im SQL-Editor ausgeführt
docs/             Produkt- und Fachdokumentation
```

## Dokumentation

- `docs/informationsarchitektur.md` – welche Seite wofür da ist, Bewertung aller Funktionen
- `docs/monitoring-grundlagen.md` – fachliche Begründung aller Kennzahlen mit Quellen
- `docs/datenmodell.md` – Tabellen, Altlasten, RLS
- `supabase/README.md` – Reihenfolge der SQL-Skripte
- `CLAUDE.md` – verbindliche Datenregel (Produktivbetrieb)
