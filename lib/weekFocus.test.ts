import { describe, expect, it } from "vitest";
import { buildWeekFocus, phaseFor } from "@/lib/weekFocus";
import { SwimmerResult } from "@/lib/swim";

const res = (swimmer_id: string, distance: number, stroke: SwimmerResult["stroke"], points: number): SwimmerResult => ({
  id: `${swimmer_id}${distance}${stroke}`, swimmer_id, result_date: "2026-09-01", location: "X", pool_length: 25,
  distance, stroke, time_ms: 30000, points, round: null, is_split: false,
});

describe("weekFocus", () => {
  it("leitet die Phase aus den Tagen bis zum Wettkampf ab", () => {
    expect(phaseFor(26)).toBe("aufbau");
    expect(phaseFor(14)).toBe("vorbereitung");
    expect(phaseFor(3)).toBe("taper");
    expect(phaseFor(null)).toBe("offen");
  });

  it("teilt Hauptteil A nach Hauptlage auf und macht aus Disqualifikationen einen Technik-Baustein", () => {
    const swimmers = [
      { id: "a", first_name: "Mara", last_name: "W", birth_year: 2009, gender: "female" as const },
      { id: "b", first_name: "Piet", last_name: "B", birth_year: 2011, gender: "male" as const },
    ];
    const week = buildWeekFocus({
      swimmers,
      results: [res("a", 50, "breaststroke", 450), res("b", 50, "freestyle", 330)],
      focusBySwimmer: new Map([
        ["a", { events: ["50-breaststroke", "100-backstroke:neben"], strokes: null, distances: null }],
        ["b", { events: ["50-freestyle", "50-backstroke:neben"], strokes: null, distances: null }],
      ]),
      standard: null,
      standardTimes: [],
      nonFinishes: [{ id: "d", swimmer_id: "a", result_date: "2026-09-01", location: "O", pool_length: 25, distance: 200, stroke: "backstroke", status: "DS", reason: "Wende nicht unverzüglich" }],
      daysUntil: 26,
      today: "2026-09-28",
    });
    expect(week.mainA.map((g) => [g.stroke, g.athletes])).toEqual([["breaststroke", ["Mara"]], ["freestyle", ["Piet"]]]);
    expect(week.mainB).toEqual([{ stroke: "backstroke", label: "Rücken", athletes: ["Mara", "Piet"] }]);
    expect(week.technique[0].title).toBe("Rücken: Wende");
    expect(week.blocks.map((b) => b.id)).toEqual(["technik-Rücken: Wende", "hauptteil-a", "hauptteil-b"]);
  });
});
