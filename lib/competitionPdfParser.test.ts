import { describe, expect, it } from "vitest";
import { parseCompetitionText } from "@/lib/competitionPdfParser";

/* Typischer Ausschnitt einer Ausschreibung (Wettkampffolge) */
const AUSSCHREIBUNG = `
1. Abschnitt Samstag, 14.03.2026
Einlass und Einschwimmen: 08:00 Uhr Kampfrichtersitzung: 08:40 Uhr Beginn: 09:00 Uhr
WK 1 200 m Lagen weiblich Jahrgang 2012 und älter
WK 2 200 m Lagen männlich Jahrgang 2012 und älter
WK 3 100 m Freistil weiblich Vorlauf
WK 4 4 x 50 m Freistil mixed
2. Abschnitt Sonntag, 15.03.2026
Beginn: 14:00 Uhr
WK 5 100 m Freistil weiblich Finale
WK 6 50 m Schmetterling männlich 2010/2011
`;

describe("parseCompetitionText (Ausschreibung)", () => {
  const parsed = parseCompetitionText(AUSSCHREIBUNG);

  it("findet beide Abschnitte mit Datum", () => {
    expect(parsed.sections.map((section) => section.sectionNumber)).toEqual([1, 2]);
    expect(parsed.sections[0].sectionDate).toBe("2026-03-14");
    expect(parsed.sections[1].sectionDate).toBe("2026-03-15");
  });

  it("liest die Uhrzeiten des Abschnitts", () => {
    expect(parsed.sections[0].admissionTime).toBe("08:00");
    expect(parsed.sections[0].officialsMeetingTime).toBe("08:40");
    expect(parsed.sections[0].startTime).toBe("09:00");
  });

  it("liest alle Wettkaempfe", () => {
    expect(parsed.eventCount).toBe(6);
    const events = parsed.sections.flatMap((section) => section.events);
    expect(events.map((event) => event.eventNumber)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("erkennt Strecke, Geschlecht, Staffel und Laufart", () => {
    const events = parsed.sections.flatMap((section) => section.events);
    const [wk1, wk2, wk3, wk4, wk5] = events;

    expect(wk1).toMatchObject({ distanceM: 200, gender: "female", relayCount: null });
    expect(wk1.stroke).toContain("Lagen");
    expect(wk2.gender).toBe("male");
    expect(wk3.roundType).toBe("heat");
    expect(wk4).toMatchObject({ relayCount: 4, distanceM: 50, gender: "mixed" });
    expect(wk5.roundType).toBe("final");
  });
});
