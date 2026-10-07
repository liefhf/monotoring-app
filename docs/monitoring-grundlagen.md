# Monitoring – fachliche Grundlagen

Diese Datei hält fest, warum die App Belastung und Befinden so auswertet, wie sie es tut.

## Trainingsbelastung
- **Session-RPE** (Foster): RPE 1–10 × Dauer in Minuten. Das ist ein gut belegtes, aufwandsarmes Maß und für den Schwimmsport validiert.
- Fehlt das RPE eines Athleten, der laut Anwesenheit da war, zählt die geplante Belastung (als „geschätzt“ markiert).

## Belastungsänderung statt ACWR-Risiko
- Angezeigt wird: **Belastung der letzten 7 Tage im Vergleich zum Wochenschnitt der 3 Wochen davor** (entkoppelt, in Prozent).
- Die App zeigt **keine Verletzungsprognose**. Das klassische ACWR (7 zu 28 Tage) ist mathematisch gekoppelt, und als Einzelwert lässt sich daraus kein Verletzungsrisiko ableiten (Impellizzeri et al. 2020 und 2021; Lolli et al. 2019).
- Hinweise erscheinen ab +30 % (beachten) bzw. +50 % (kritisch). Sie beschreiben die Abweichung vom Gewohnten, denn sprunghafte Steigerungen werden schlechter vertragen als schrittweise.
- Erst ab 3 Wochen Daten wird verglichen.

## Befinden (Check-in)
- Es gibt fünf Skalen (Energie, Stimmung, Muskelgefühl, Entspannung, Schlafqualität), dazu optional Schlafdauer und Schmerzen. Kurze subjektive Fragebögen reagieren empfindlicher auf Belastung als viele objektive Marker (Saw et al. 2016).
- Bewertet wird vor allem **gegenüber dem eigenen Durchschnitt** (≥ 1,5 Punkte darunter) und der **Verlauf über mehrere Tage**. Ein einzelner schlechter Tag ist normal, erst wiederholte schlechte Tage sind ein Signal.
- Die Texte beschreiben das Befinden („Befinden eingeschränkt“), statt Anweisungen zu geben. Die Entscheidung trifft der Trainer im Gespräch.
- Der Check-in springt nach jedem Antippen automatisch weiter und dauert so unter 30 Sekunden.

## Hinweise
Jeder Hinweis enthält drei Teile: **was erkannt wurde**, **warum es relevant ist** und **was zu prüfen ist**. Die App stellt keine Diagnosen und zeigt keine Risiko-Prozente.

| Hinweis | Gelb (beachten) | Rot (kritisch) |
|---|---|---|
| Belastung | ≥ 30 % über Vorwochen | ≥ 50 % über Vorwochen |
| Schmerzen (3 Tage) | gemeldet | ≥ 6/10 oder zunehmend |
| Befinden | < 65 oder unter eigenem Schnitt | < 50 oder 3 Tage in Folge eingeschränkt |
| Check-in fehlt | ≥ 4 Tage ohne Rückmeldung | – |
| Anwesenheit 4 Wochen | < 70 % | < 50 % |

## Modelle mit Vorsicht
- **Formkurve** (Fitness-Fatigue nach Banister): arbeitet mit Standardwerten und ist nicht individuell kalibriert. Sie dient nur zur Orientierung bei Belastungsverlauf und Tapering.
- **Zeitprognose**: Die Chance auf eine Pflichtzeit wird nur noch in Worten angegeben (realistisch / möglich / eher nicht), nicht als Prozentzahl.
