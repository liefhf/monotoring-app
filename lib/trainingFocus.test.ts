import { describe, expect, it } from "vitest";
import { qualiRecommendation, topFocus, trainingFocus } from "@/lib/trainingFocus";
import { NonFinish, SwimmerResult } from "@/lib/swim";

const swimmer = { id: "s1", first_name: "Test", last_name: "A", birth_year: 2013, gender: "female" as const };

function result(overrides: Partial<SwimmerResult>): SwimmerResult {
  return {
    id: Math.random().toString(),
    swimmer_id: "s1",
    result_date: "2026-09-01",
    location: "Oberursel",
    pool_length: 25,
    distance: 50,
    stroke: "freestyle",
    time_ms: 40000,
    points: 400,
    round: null,
    is_split: false,
    ...overrides,
  };
}

const dq: NonFinish = {
  id: "d1",
  swimmer_id: "s1",
  result_date: "2026-09-01",
  location: "Oberursel",
  pool_length: 25,
  distance: 100,
  stroke: "backstroke",
  status: "DS",
  reason: "Wende nicht unverzüglich eingeleitet",
};

describe("trainingFocus", () => {
  const results = [
    result({ stroke: "freestyle", points: 400 }),
    result({ stroke: "breaststroke", points: 200 }),
    result({ stroke: "backstroke", points: 390 }),
    result({ stroke: "butterfly", points: 380 }),
  ];

  it("stellt Disqualifikationen immer an die erste Stelle – vor Punkte-Schwaechen", () => {
    const items = trainingFocus({ results, swimmer, standard: null, standardTimes: [], today: "2026-09-28", nonFinishes: [dq] });
    expect(items[0].kind).toBe("dq");
    expect(items[0].detail).toContain("Rückenwende");
    expect(items.some((item) => item.kind === "stroke")).toBe(true);
  });

  it("nennt keine Lage ausserhalb des Fokus (z. B. Brust bei Freistil/Ruecken-Schwimmer)", () => {
    const items = trainingFocus({
      results,
      swimmer,
      standard: null,
      standardTimes: [],
      today: "2026-09-28",
      focus: { strokes: ["freestyle", "backstroke"], distances: null },
    });
    expect(items.some((item) => item.title.includes("Brust"))).toBe(false);
    expect(items.some((item) => item.title.includes("Schmetterling"))).toBe(false);
  });

  it("zeigt Disqualifikationen auch ausserhalb des Fokus", () => {
    const items = trainingFocus({
      results,
      swimmer,
      standard: null,
      standardTimes: [],
      today: "2026-09-28",
      nonFinishes: [dq],
      focus: { strokes: ["freestyle"], distances: null },
    });
    expect(items[0].kind).toBe("dq");
  });

  it("schneidet Disqualifikationen beim Kuerzen nie ab", () => {
    const items = trainingFocus({ results, swimmer, standard: null, standardTimes: [], today: "2026-09-28", nonFinishes: [dq, { ...dq, id: "d2", distance: 200 }] });
    const top = topFocus(items, 1);
    expect(top.filter((item) => item.kind === "dq")).toHaveLength(2);
    expect(top).toHaveLength(3);
  });
});

describe("qualiRecommendation", () => {
  const event = { distance: 100, stroke: "backstroke" as const };
  const best = (time_ms: number) => ({ ...dqlessResult, time_ms });
  const dqlessResult = {
    id: "r", swimmer_id: "s1", result_date: "2026-09-01", location: "Oberursel", pool_length: 25 as const,
    distance: 100, stroke: "backstroke" as const, time_ms: 0, points: null, round: null, is_split: false,
  };

  it("stuft nach Abstand zur Pflichtzeit ein", () => {
    expect(qualiRecommendation(event, 72800, best(73170), "HM").level).toBe("close");
    expect(qualiRecommendation(event, 72800, best(75500), "HM").level).toBe("reach");
    expect(qualiRecommendation(event, 72800, best(79000), "HM").level).toBe("mid");
    expect(qualiRecommendation(event, 72800, best(90000), "HM").level).toBe("far");
    expect(qualiRecommendation(event, 72800, best(72000), "HM").level).toBe("done");
    expect(qualiRecommendation(event, 72800, null, "HM").level).toBe("open");
  });

  it("gibt fuer jede Fokus-Strecke eine Empfehlung – auch weit entfernte", () => {
    const standard = { id: "s", name: "HM", pool_length: 25 as const, valid_from: null, valid_to: null, count_both_pools: true };
    const times = [
      { id: "t1", standard_id: "s", gender: "female" as const, birth_year_from: 2013, birth_year_to: 2013, distance: 100, stroke: "backstroke" as const, time_ms: 60000 },
      { id: "t2", standard_id: "s", gender: "female" as const, birth_year_from: 2013, birth_year_to: 2013, distance: 200, stroke: "backstroke" as const, time_ms: 150000 },
    ];
    const items = trainingFocus({
      results: [best(80000)], swimmer, standard, standardTimes: times, today: "2026-09-28",
      focus: { events: ["100-backstroke", "200-backstroke"], strokes: null, distances: null },
    });
    expect(items.filter((item) => item.kind === "quali").map((item) => item.level).sort()).toEqual(["far", "open"]);
  });
});
