import { describe, expect, it } from "vitest";
import { suggestEntries } from "@/lib/entryHelper";
import { SwimmerResult } from "@/lib/swim";

const swimmer = { id: "s", first_name: "M", last_name: "W", birth_year: 2009, gender: "female" as const };
const standard = { id: "hm", name: "HM", pool_length: 25 as const, valid_from: "2025-11-03", valid_to: "2026-10-25", count_both_pools: true };
const t = (distance: number, stroke: "breaststroke" | "backstroke" | "freestyle", time_ms: number) => ({
  id: `${distance}${stroke}`, standard_id: "hm", gender: "female" as const, birth_year_from: 2009, birth_year_to: 2009, distance, stroke, time_ms,
});
const r = (distance: number, stroke: "breaststroke" | "backstroke" | "freestyle", time_ms: number, pool: 25 | 50 = 25): SwimmerResult => ({
  id: `${distance}${stroke}${pool}`, swimmer_id: "s", result_date: "2026-09-01", location: "X", pool_length: pool, distance, stroke, time_ms, points: null, round: null, is_split: false,
});

describe("suggestEntries", () => {
  const times = [t(50, "breaststroke", 38500), t(100, "breaststroke", 81000), t(100, "backstroke", 72800), t(50, "freestyle", 30500)];
  const results = [r(50, "breaststroke", 36920), r(100, "breaststroke", 79940), r(100, "backstroke", 73170), r(50, "freestyle", 30700, 50)];
  const events = times.map((time) => ({ distance: time.distance, stroke: time.stroke }));

  it("empfiehlt erfuellte Strecken und knappe Fokus-Strecken", () => {
    const list = suggestEntries({
      swimmer, results, standard, standardTimes: times, events, maxStarts: 8,
      focus: { events: ["100-backstroke:neben"], strokes: null, distances: null },
    });
    expect(list.filter((e) => e.recommended).map((e) => `${e.event.distance}-${e.event.stroke}`)).toEqual([
      "50-breaststroke", "100-breaststroke", "100-backstroke",
    ]);
    // 50 F knapp, aber nicht im Fokus -> nicht empfohlen, aber gelistet
    expect(list.find((e) => e.event.stroke === "freestyle")).toMatchObject({ status: "knapp", recommended: false });
  });

  it("begrenzt auf die Hoechstzahl an Starts", () => {
    const list = suggestEntries({ swimmer, results, standard, standardTimes: times, events, maxStarts: 1, focus: null });
    expect(list.filter((e) => e.recommended)).toHaveLength(1);
  });
});
