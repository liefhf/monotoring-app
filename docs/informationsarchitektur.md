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


## Final Product Design Pass (07.10.2026)

### Funktionen nach Arbeitswert (A = täglich und zentral, B = wichtig, aber seltener, C = integriert/vereinfacht, D = entfernt)

| Funktion | Stufe | Platz |
|---|---|---|
| Dashboard (Aufmerksamkeit, Heute, Team, Bestzeiten, Fristen) | A | Start |
| Anwesenheit in der Einheit | A | Dashboard → „Anwesenheit“ springt direkt in die Liste |
| Athletenprofil | A | Team → Athleten |
| Trainingswoche (planen, kopieren, verschieben) | A | Training |
| Schnelleingabe Serien („8x200 Kraul GA2 @3:00“) | A | in jedem Abschnitt der Einheit. Unbekannte Lage wird „Beliebig“, unbekannte Zone bleibt leer, Zeitangaben wie „10 min“ werden nicht als Strecke gelesen. Nicht erkannte Zeilen bleiben im Feld stehen. |
| Athleten-Check | A | Dashboard („Alle ansehen“) und Team |
| Trainernotizen | A | Überblick im Profil |
| Gesundheit / Einschränkungen | A | Profil; Hinweise auf Dashboard und in der Anwesenheitsliste |
| Ziele je Athlet | B | Profil → Leistung → Ziele; Kurzfassung im Überblick |
| Wettkämpfe, Ergebnisse, Meldehilfe | B | Wettkampf |
| Pflichtzeiten, Testbatterie, Laktat | B | Leistung bzw. Profil → Diagnostik |
| Wochenbericht | B | Team |
| Saisonplanung, Kalender, Belastungsverlauf | B | Training |
| DMS-Aufstellung | B (saisonal) | Wettkampf |
| Dokumente | C | Profil → Stammdaten; Fristen automatisch auf dem Dashboard |
| Formkurve | C | Profil → Training (mit Modellhinweis) |
| News, Gruppenräume, Wissen | C | Kommunikation |
| Wochenumfang-Diagramm und Monatskalender auf dem Dashboard | D | entfernt: ohne Handlungswert, die Wochenansicht liegt unter Training |
| Kennzahl-Kacheln (Umfang, Wasser, Land) beim Athleten | D | entfernt: für Athleten ohne Nutzen |
| Punktzahl „Befinden 0–100“ für Athleten | D | ersetzt durch eine kurze Rückmeldung in Worten |

### Athletenprofil (Coach)
Kopf: Name, Jahrgang mit Alter, Geschlecht, Hauptstrecken, Trainingsgruppen.
Bereiche: **Überblick** (Status und Hinweise, aktuelle Bestzeiten mit Saisonbestzeit, offene Ziele, Notizen, Anwesenheit) · **Training** (Befinden, Rückmeldungen, Belastung, Formkurve) · **Leistung** (Bestzeiten, Ziele, Entwicklung, Pflichtzeiten, alle Zeiten, Staffeln, Saison-Auswertung) · **Gesundheit** · **Diagnostik** · **Stammdaten**.

### Athleten (auch Kinder ab 9 Jahren)
Navigation: **Heute · Training · Fortschritt · Termine · Mehr**.
- **Heute:** (1) Check-in, falls offen, (2) „Wie anstrengend war dein Training?“, falls offen, (3) nächstes Training, (4) nächster Wettkampf mit Tagen bis dahin, (5) neue Bestzeit 🎉 und eigenes Ziel, (6) neue Nachricht vom Trainer. Keine Diagramme und keine Kennzahlen.
- **Check-in:** 5 Fragen mit Gesichtern in Alltagssprache. Antippen springt automatisch weiter. Danach eine kurze Rückmeldung statt einer Punktzahl.
- **Fortschritt:** zuerst „Neue Bestzeiten – x Sekunden schneller“ und „Meine Ziele – noch x Sekunden“, darunter die Details.
- Darstellung und Abmelden liegen unter „Mehr“, damit die Kopfzeile ruhig bleibt.
