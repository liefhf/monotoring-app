# Informationsarchitektur – Prüfung aller Seiten

Stand: 07.10.2026. Grundsatz: Jede Funktion gibt es an genau einer Stelle. Ein Athlet hat genau eine Seite.
Entfernte Adressen leiten weiter (`next.config.ts`, Abschnitt `redirects`). Es gehen keine Daten verloren.

## Coach – Navigation

| Gruppe | Menüpunkt | Seite |
|---|---|---|
| – | Start | `/coach` |
| Team | Athleten · Athleten-Check · Anwesenheit · Wochenbericht · Teams | `/coach/schwimmer`, `/coach/athleten-check`, `/coach/anwesenheit`, `/coach/bericht`, `/coach/teams` |
| Training | Trainingswoche · Saisonplanung · Belastungsverlauf · Kalender | `/coach/training`, `/coach/training/season`, `/coach/analytics`, `/coach/kalender` |
| Wettkampf | Wettkämpfe · Ergebnisse · Meldehilfe · DMS-Aufstellung | `/coach/competitions`, `/coach/analytics/wettkampf`, `/coach/meldehilfe`, `/coach/dms` |
| Leistung | Pflichtzeiten · Testbatterie | `/coach/pflichtzeiten`, `/coach/tests` |
| Kommunikation | News · Gruppenräume · Wissen | `/coach/news`, `/coach/gruppen`, `/coach/infoboard` |

Auf dem Handy gibt es unten eine Leiste: Start · Team · **+** (neue Einheit) · Training · Mehr.

## Entscheidungen je Seite (Coach)

| Seite | Entscheidung | Begründung |
|---|---|---|
| `/coach` Dashboard | verbessert | Beantwortet „Wo muss ich heute hinschauen?“: heutige Einheit, Team heute (nur Athleten mit Hinweis), nächster Wettkampf, Fristen, Anwesenheit, Wochenumfang, Wochenplan, To-dos. Die Schnellzugriffs-Knöpfe und der Ring als Dekoration sind entfernt. |
| `/coach/schwimmer` Athleten | verbessert | Die eine Athletenliste. „Anlegen“ öffnet einen Dialog. Am Handy erscheint eine Liste statt einer Tabelle. |
| `/coach/schwimmer/[id]` Athletenprofil | **zentral**, neu gegliedert | Bereiche: Überblick · Befinden & Training · Gesundheit · Zeiten & Wettkämpfe · Diagnostik · Stammdaten (inkl. Dokumente). |
| `/coach/athletes/[id]` | **zusammengelegt** | Befinden, Trainings-Rückmeldungen, Belastung und Wachstum stecken jetzt im Profil unter „Befinden & Training“. Die Seite leitet alte Links (Login-ID) auf den richtigen Athleten weiter. |
| `/coach/athletes`, `/coach/swimmerabfrage/*` | **entfernt** (Weiterleitung) | Die alte Schwimmerabfrage las die Tabelle `swim_results`. Deren Zeiten wurden schon mit `athleten_zusammenfuehren.sql` in die Ergebnisse der Athleten übernommen. Die Tabelle bleibt unverändert bestehen. |
| `/coach/athleten-check` | behalten | Vollständige Tabelle aller Hinweise. Jeder Hinweis nennt, was erkannt wurde, warum es relevant ist und was zu prüfen ist. |
| `/coach/anwesenheit` | behalten | Übersicht Athleten × Einheiten. Erfasst wird in der Einheit. |
| `/coach/bericht` | **neu** | Wochenbericht je Mannschaft (siehe unten). |
| `/coach/teams` | behalten | |
| `/coach/training` + `/coach/wochenplan` | **zusammengelegt** zu „Trainingswoche“ | Beide Seiten zeigten die Einheiten einer Woche. Jetzt gibt es eine Seite mit Wasser/Land, Trainingszeit, Intensitätsverteilung (Meter je Zone) und den Aktionen Bearbeiten und **Kopieren**. |
| `/coach/training/week/[id]`, `/coach/training/meso/[id]` | **entfernt** (Weiterleitung) | Das waren Platzhalter mit fest eingebauten Beispieldaten ohne Datenbankanbindung. |
| `/coach/training/cycle` (Olympiazyklus) | **entfernt** (Weiterleitung) | Die Seite war über kein Menü erreichbar. Ein Vierjahreszyklus ist für die Trainingssteuerung im Verein nicht handlungsrelevant. Die Saisonplanung deckt die Periodisierung ab. Die Tabellen `annual_plans` und `olympic_cycles` bleiben unverändert bestehen. |
| `/coach/training/season` | behalten | Saisonplanung: Zeitstrahl mit Wettkämpfen, Lehrgängen und Aufgaben. |
| `/coach/training/new`, `/coach/training/session/[id]` | behalten | Einheit planen und auswerten. Neu: Kopieren aus der Trainingswoche. |
| `/coach/analytics` | behalten, umbenannt in „Belastungsverlauf“ | Die Seite war vorher nicht im Menü. Session-RPE und Umfang je Einheit im Verlauf. |
| `/coach/kalender` | behalten | Termine für Team und Trainer, mit Anmeldung. Termin-Sicht, die Saisonplanung ist die Planungs-Sicht. |
| `/coach/competitions/*` | behalten | Wettkampf, Feedback je Start, Live-Stoppuhr. |
| `/coach/analytics/wettkampf` | behalten, umbenannt in „Ergebnisse“ | |
| `/coach/meldehilfe`, `/coach/dms` | behalten | Spart viel Handarbeit bei Meldung und Mannschaftswettbewerb. |
| `/coach/pflichtzeiten/*`, `/coach/tests` | behalten | |
| `/coach/news` | behalten, **neu im Menü** | War vorher nur über Umwege erreichbar. |
| `/coach/gruppen` | behalten | |
| `/coach/infoboard` | behalten, umbenannt in „Wissen“ | Nachschlagewerk für Trainer, getrennt von den News an die Athleten. |
| `/coach/settings` | verbessert | Platzhalter („kommt später“) entfernt. Es bleiben: Teams, Darstellung, Datensicherung, Abmelden. |

## Athleten

| Seite | Entscheidung | Begründung |
|---|---|---|
| `/athlete` Start | verbessert | Der Check-in steht ganz oben. |
| `/athlete/check-in` | verbessert | Antippen springt automatisch weiter, dauert unter 30 Sekunden. |
| `/athlete/befinden` | Weiterleitung (war schon so) | |
| `/athlete/analytics` „Meine Werte“ | **entfernt** (Weiterleitung auf Fortschritt) | Die Seite zeigte **fest eingebaute Beispielzahlen** statt der echten Daten des Athleten. |
| `/athlete/fortschritt` | behalten, ins Menü „Mehr“ | Echte Bestzeiten, Pflichtzeiten und Zonen. |
| `/athlete/training`, `/athlete/training/[id]` | verbessert | Die Rückmeldung läuft nur noch über **einen** Weg (`/athlete/feedback/[id]`). Vorher gab es zwei verschiedene Formulare für dieselbe Tabelle. |
| `/athlete/feedback/[id]` | behalten | Der eine Weg für das Trainings-Feedback. |
| `/athlete/wettkaempfe`, `/athlete/wettkampftag`, `/athlete/termine`, `/athlete/news`, `/athlete/gruppen`, `/athlete/pain` | behalten | Wettkampf-Tag ist jetzt auch im Menü „Mehr“. |
