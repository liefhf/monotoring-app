# Informationsarchitektur – Prüfung aller Seiten

Stand: 07.10.2026 (Korrekturphase). Grundsatz: Jede Funktion gibt es an genau einer Stelle. Ein Athlet hat genau eine Seite.
Entfernte Adressen leiten weiter (`next.config.ts`, Abschnitt `redirects`). Es gehen keine Daten verloren.

## Coach – Navigation (Korrekturphase)

Erste Ebene = vier Arbeitsbereiche plus „Mehr“. Seltenere Seiten liegen eine Ebene tiefer und klappen auf,
wenn man im Bereich ist oder den Pfeil antippt.

| Erste Ebene | Seite | Zweite Ebene |
|---|---|---|
| Start | `/coach` | – |
| Athleten | `/coach/schwimmer` | Athleten-Check · Anwesenheit · Wochenbericht · Teams |
| Training | `/coach/training` (Trainingswoche) | Saisonplanung · Belastungsverlauf · Kalender |
| Wettkampf | `/coach/competitions` | Ergebnisse · Meldehilfe · Pflichtzeiten · DMS-Aufstellung · Testbatterie |
| Mehr | – | News · Gruppenräume · Wissen |

Einstellungen (Teams, Darstellung, Datenexport, Abmelden) liegen unten in der Seitenleiste.
Handy: Leiste unten **Start · Athleten · + (neue Einheit) · Training · Mehr**.

### Athletenprofil – Gliederung
Kopf: Name, Alter, Teams, **Schnellaktionen „+ Zeiten“, „+ Notiz“, „+ Einschränkung“**.

| Bereich | Inhalt |
|---|---|
| Überblick | Status mit Hinweisen (Zusammenfassung zuerst), aktuelle Bestzeiten, offene Ziele, Notizen, Anwesenheit |
| Training | Befinden & Rückmeldungen, Formkurve |
| Bestzeiten & Ziele | Bestzeiten mit Saisonbestzeit, Ziele, Pflichtzeiten |
| Ergebnisse | alle Zeiten, Entwicklung, Saison-Auswertung, Staffeln & Freiwasser |
| Gesundheit | Trainingsfähigkeit, Einschränkungen, Freigabe, Schmerzmeldungen |
| Diagnostik | Testbatterie, Laktat |
| Stammdaten & Dokumente | Infos, Dokumente mit Ablauf, Trainingsfokus |

### Dashboard (Handy-Reihenfolge)
Kopf: **„Heute · Datum“** und Team-Umschalter statt Begrüßung.
1. **Aufmerksamkeit:** ein Eintrag je Athlet, nach Dringlichkeit sortiert. Zuerst Trainingsfähigkeit, Einschränkung und offene Freigabe, danach ergänzend Schmerz, Befinden usw. – ohne Meldungen fachlich zu verschmelzen. Jeder Eintrag führt direkt zur passenden Stelle („Einschränkung ansehen →“). Höchstens 4 Einträge, sonst „Alle n Hinweise ansehen“. Darunter ablaufende Dokumente des Teams (nur hier, keine zweite Fristen-Karte). Fehlende Daten werden einzeln benannt („2 ohne Check-in heute“, „1 ohne eigenen Login“, „3 mit zu wenig Daten für einen Belastungsvergleich“, „Gesundheit: nicht geladen“) und gelten nie als Entwarnung.
2. **Training heute** mit Knopf „Anwesenheit“ je Einheit.
3. **Check-ins heute:** fehlende Namen anklickbar; „ohne eigenen Login“ erklärt, mit Weg zur Kontoverknüpfung (Profil → Stammdaten).
4. **Neue Bestzeiten** („Mia Schulz · 100 m Rücken · 1:11,80 · 1,20 s schneller“), **Anwesenheit**, Aufgaben als kurze Zeile, wenn nichts offen ist.

Gestaltung Coach: Linien und Abstand statt Schatten und Innenkacheln, Rundung 16 px, Farbe nur für Status und Hauptaktionen. Der Athletenbereich bleibt bewusst größer und freundlicher.

### Anwesenheit – Darstellungsregel (Dashboard, Profil, Anwesenheitsseite, Hinweis)
- Grundlage: **erfasste** Einträge (anwesend, entschuldigt, krank, fehlt) von Einheiten bis einschließlich heute; nicht erfasste Einheiten zählen weder als anwesend noch als abwesend und werden als „x von y Einheiten erfasst“ genannt.
- Zeitraum: die letzten 4 Wochen (28 Tage) bis heute.
- Unter **8 erfassten Einträgen** keine Prozentzahl, sondern „x von y anwesend · noch wenig Daten“ (`MIN_ATTENDANCE_BASIS` in `lib/attendance.ts`). Der Hinweis „Anwesenheit niedrig“ entsteht ebenfalls erst ab 8 Einträgen.

### Handy-Navigation
Leiste: Start · Athleten · Neue Einheit (normaler Tab, nicht hervorgehoben) · Training · Mehr. Darstellung (Hell/Dunkel, Sonnen-Modus) liegt beschriftet unter „Mehr“ und in den Einstellungen; oben bleibt nur die Glocke.

### Athlet „Heute“
Genau **eine Hauptaktion** oben (Check-in, sonst offene Rückmeldung), danach das laufende oder nächste Training,
dann Wettkampf, Fortschritt, Nachricht. Rückmeldungen werden erst nach dem Ende einer Einheit erfragt, nicht bei
gemeldeter Abwesenheit und nur für die letzten 3 Tage. Eine angeheftete Nachricht, die älter als 7 Tage ist, heißt
„Wichtige Nachricht“, nicht „Neu“.

### Vorlagen?
Geprüft: Für wiederkehrende Einheiten reicht **Kopieren** (Trainingswoche) plus **Schnelleingabe**. Eine eigene
Vorlagenverwaltung würde eine zweite Stelle für dieselbe Einheit schaffen und wird deshalb nicht gebaut.

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
