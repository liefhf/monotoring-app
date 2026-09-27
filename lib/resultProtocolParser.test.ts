import { describe, expect, it } from "vitest";
import type { Swimmer } from "@/lib/swim";
import { matchSwimmer, normalizeName, parseResultProtocol } from "@/lib/resultProtocolParser";

/* Nachgestellter Ausschnitt eines typischen DSV-/EasyWK-Protokolls */
const PROTOKOLL = `
Bezirksmeisterschaften 2026
Ergebnisliste
Wettkampf 3 - 100m Freistil männlich
Offene Wertung
1. Petrov, Dario 2010 SV Darmstadt 1:03,19 395
    50m: 30,12   100m: 1:03,19
2. Müller, Jonas 2009 SG Frankfurt 1:04,02 380
3. Özdemir, Can 2011 SV Darmstadt 1:05,80 350
Schmidt, Paul 2010 TV Langen disq.
Weber, Tim 2012 SV Darmstadt n.a.
Wettkampf 4 - 50m Schmetterling männlich Vorlauf
1. Petrov, Dario 2010 SV Darmstadt 33,58 291
Wettkampf 5 - 4x50m Freistil mixed
1. SV Darmstadt 1:55,20
Wettkampf 6 - 400m Freistil weiblich
1. Beispiel, Lena 2011 SV Darmstadt 5:09,12 360
    1:13,20  2:31,40  3:50,10  5:09,12
`;

describe("parseResultProtocol", () => {
  const { events, results } = parseResultProtocol(PROTOKOLL);

  it("erkennt Wettkaempfe mit Strecke, Lage, Geschlecht und Lauf", () => {
    expect(events.map((event) => `${event.eventNumber}:${event.distance}:${event.stroke}`)).toEqual([
      "3:100:freestyle",
      "4:50:butterfly",
      "5:50:freestyle",
      "6:400:freestyle",
    ]);
    expect(events[0].gender).toBe("male");
    expect(events[1].round).toBe("Vorlauf");
    expect(events[2].isRelay).toBe(true);
  });

  it("liest Ergebniszeilen und ignoriert Staffeln", () => {
    expect(results).toHaveLength(7);
    const dario = results[0];
    expect(dario).toMatchObject({ placement: 1, lastName: "Petrov", firstName: "Dario", birthYear: 2010, club: "SV Darmstadt", timeMs: 63190, points: 395, status: "ok" });
  });

  it("uebernimmt Umlaute und Sonderfaelle", () => {
    expect(results[1].lastName).toBe("Müller");
    expect(results[2].lastName).toBe("Özdemir");
    expect(results[3]).toMatchObject({ lastName: "Schmidt", status: "dsq", timeMs: null, placement: null });
    expect(results[4]).toMatchObject({ lastName: "Weber", status: "dns" });
  });

  it("haengt Zwischenzeiten an das Ergebnis darueber", () => {
    expect(results[0].splitsMs).toEqual([30120]);
    expect(results[6].splitsMs).toEqual([73200, 151400, 230100]);
    expect(results[1].splitsMs).toEqual([]);
  });
});

describe("matchSwimmer", () => {
  const swimmers: Swimmer[] = [
    { id: "1", first_name: "Dario", last_name: null, birth_year: 2010, gender: "male" },
    { id: "2", first_name: "Can", last_name: "Özdemir", birth_year: 2011, gender: "male" },
    { id: "3", first_name: "Lena", last_name: null, birth_year: 2012, gender: "female" },
  ];
  const { results } = parseResultProtocol(PROTOKOLL);

  it("ordnet ueber Vor- und Nachname sicher zu", () => {
    expect(matchSwimmer(results[2], swimmers)).toMatchObject({ swimmer: { id: "2" }, certainty: "sicher" });
  });

  it("ordnet nur ueber Vorname + Jahrgang als wahrscheinlich zu", () => {
    expect(matchSwimmer(results[0], swimmers)).toMatchObject({ swimmer: { id: "1" }, certainty: "wahrscheinlich" });
  });

  it("ordnet nicht zu, wenn der Jahrgang nicht passt oder niemand passt", () => {
    expect(matchSwimmer(results[6], swimmers)).toBeNull(); // Lena 2011 vs. 2012
    expect(matchSwimmer(results[1], swimmers)).toBeNull();
  });

  it("vergleicht Namen ohne Akzente und Gross-/Kleinschreibung", () => {
    expect(normalizeName("Özdemir")).toBe(normalizeName("oezdemir"));
    expect(normalizeName("José")).toBe("jose");
  });
});
