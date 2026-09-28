import { describe, expect, it } from "vitest";
import { topFocus, trainingFocus } from "@/lib/trainingFocus";
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

  it("schneidet Disqualifikationen beim Kuerzen nie ab", () => {
    const items = trainingFocus({ results, swimmer, standard: null, standardTimes: [], today: "2026-09-28", nonFinishes: [dq, { ...dq, id: "d2", distance: 200 }] });
    const top = topFocus(items, 1);
    expect(top.filter((item) => item.kind === "dq")).toHaveLength(2);
    expect(top).toHaveLength(3);
  });
});
