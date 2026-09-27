import { describe, expect, it } from "vitest";
import {
  Swimmer,
  SwimmerResult,
  QualifyingTime,
  findBestResult,
  findQualifyingTime,
  formatBirthYearRange,
  formatEventShort,
  formatMonthYear,
  formatTime,
  formatTimeDifference,
  getEventsForPool,
  parseSwimTimeToMs,
  qualifyingTimeApplies,
  splitResults,
} from "@/lib/swim";

const result = (overrides: Partial<SwimmerResult>): SwimmerResult => ({
  id: "r",
  swimmer_id: "s",
  result_date: "2026-05-01",
  location: null,
  pool_length: 50,
  distance: 100,
  stroke: "freestyle",
  time_ms: 65000,
  points: null,
  round: null,
  is_split: false,
  ...overrides,
});

const swimmer: Swimmer = { id: "s", first_name: "Dario", last_name: null, birth_year: 2010, gender: "male" };

const qualifying = (overrides: Partial<QualifyingTime>): QualifyingTime => ({
  id: "q",
  standard_id: "x",
  gender: null,
  birth_year_from: null,
  birth_year_to: null,
  distance: 100,
  stroke: "freestyle",
  time_ms: 70000,
  ...overrides,
});

describe("parseSwimTimeToMs", () => {
  it.each([
    ["31,45", 31450],
    ["31.45", 31450],
    ["1:05,23", 65230],
    ["1:05.2", 65200],
    ["10:46,72", 646720],
    [" 28,31 ", 28310],
  ])("liest %s", (input, expected) => {
    expect(parseSwimTimeToMs(input)).toBe(expected);
  });

  it.each(["", "abc", "1:75,00", ":30", "1:", "-3", "0"])("lehnt %j ab", (input) => {
    expect(parseSwimTimeToMs(input)).toBeNull();
  });
});

describe("formatTime", () => {
  it("formatiert Sekunden und Minuten", () => {
    expect(formatTime(31450)).toBe("31,45");
    expect(formatTime(65230)).toBe("1:05,23");
    expect(formatTime(646720)).toBe("10:46,72");
  });

  it("rundet ohne 60er-Sekunden", () => {
    expect(formatTime(599999)).toBe("10:00,00");
  });

  it("ist die Umkehrung von parseSwimTimeToMs", () => {
    for (const ms of [28310, 62020, 141670, 309120, 1233500]) {
      expect(parseSwimTimeToMs(formatTime(ms))).toBe(ms);
    }
  });

  it("zeigt Abstaende mit Vorzeichen", () => {
    expect(formatTimeDifference(-1230)).toBe("−1,23");
    expect(formatTimeDifference(450)).toBe("+0,45");
    expect(formatTimeDifference(0)).toBe("±0,00");
  });
});

describe("findBestResult", () => {
  const results = [
    result({ id: "a", time_ms: 64000, result_date: "2026-02-01" }),
    result({ id: "b", time_ms: 63190, result_date: "2026-05-01" }),
    result({ id: "c", time_ms: 60000, pool_length: 25 }),
    result({ id: "d", time_ms: 30000, distance: 50 }),
  ];

  it("nimmt die schnellste Zeit der gleichen Strecke und Bahn", () => {
    expect(findBestResult(results, { distance: 100, stroke: "freestyle" }, 50)?.id).toBe("b");
    expect(findBestResult(results, { distance: 100, stroke: "freestyle" }, 25)?.id).toBe("c");
  });

  it("beachtet einen Zeitraum", () => {
    expect(findBestResult(results, { distance: 100, stroke: "freestyle" }, 50, { from: null, to: "2026-03-01" })?.id).toBe("a");
  });

  it("liefert null ohne passende Zeit", () => {
    expect(findBestResult(results, { distance: 200, stroke: "medley" }, 50)).toBeNull();
  });
});

describe("Pflichtzeiten", () => {
  it("prueft Geschlecht und Jahrgang", () => {
    expect(qualifyingTimeApplies(qualifying({ gender: "female" }), swimmer)).toBe(false);
    expect(qualifyingTimeApplies(qualifying({ birth_year_to: 2008 }), swimmer)).toBe(false);
    expect(qualifyingTimeApplies(qualifying({ birth_year_from: 2009, birth_year_to: 2011 }), swimmer)).toBe(true);
  });

  it("ohne Jahrgang passt nur eine Zeit ohne Jahrgangsgrenze", () => {
    const unknown = { ...swimmer, birth_year: null };
    expect(qualifyingTimeApplies(qualifying({ birth_year_from: 2010 }), unknown)).toBe(false);
    expect(qualifyingTimeApplies(qualifying({}), unknown)).toBe(true);
  });

  it("nimmt bei mehreren passenden Zeiten die strengste", () => {
    const times = [qualifying({ id: "alle", time_ms: 70000 }), qualifying({ id: "jg", birth_year_from: 2010, birth_year_to: 2010, time_ms: 66000 })];
    expect(findQualifyingTime(times, swimmer, { distance: 100, stroke: "freestyle" })?.id).toBe("jg");
  });

  it("beschreibt Jahrgangsbereiche", () => {
    expect(formatBirthYearRange(null, null)).toBe("alle");
    expect(formatBirthYearRange(2010, 2010)).toBe("2010");
    expect(formatBirthYearRange(null, 2008)).toBe("2008 und älter");
    expect(formatBirthYearRange(2012, null)).toBe("2012 und jünger");
  });
});

describe("Hilfen fuer die Anzeige", () => {
  it("kuerzt Strecken wie der DSV", () => {
    expect(formatEventShort({ distance: 50, stroke: "butterfly" })).toBe("50 S");
    expect(formatEventShort({ distance: 200, stroke: "medley" })).toBe("200 L");
  });

  it("zeigt 100 m Lagen nur auf der 25m-Bahn", () => {
    const has100Medley = (pool: 25 | 50) => getEventsForPool(pool).some((e) => e.distance === 100 && e.stroke === "medley");
    expect(has100Medley(25)).toBe(true);
    expect(has100Medley(50)).toBe(false);
  });

  it("formatiert Monat/Jahr", () => {
    expect(formatMonthYear("2026-06-14")).toBe("6/2026");
  });

  it("trennt Einzelstarts von Staffeln", () => {
    const { pool, other } = splitResults([
      { id: "1", kind: "einzel", is_split: null },
      { id: "2", kind: "staffel" },
      { id: "3" },
    ]);
    expect(pool.map((r) => r.id)).toEqual(["1", "3"]);
    expect(pool[0].is_split).toBe(false);
    expect(other.map((r) => r.id)).toEqual(["2"]);
  });
});
