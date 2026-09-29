import { describe, expect, it } from "vitest";
import { forecastEvent, reachChance } from "@/lib/forecast";
import { SwimmerResult } from "@/lib/swim";

const r = (date: string, time_ms: number): SwimmerResult => ({
  id: date, swimmer_id: "s", result_date: date, location: "X", pool_length: 25, distance: 100, stroke: "freestyle", time_ms, points: null, round: null, is_split: false,
});
const event = { distance: 100, stroke: "freestyle" as const };

describe("forecast", () => {
  it("braucht mindestens 3 Monate", () => {
    expect(forecastEvent([r("2026-06-01", 62000), r("2026-09-01", 61700)], event, 25, "2026-09-29", "2026-12-12")).toBeNull();
  });

  it("schreibt eine Verbesserung begrenzt fort und nie schlechter als die Bestzeit", () => {
    const results = [r("2025-11-01", 65000), r("2026-02-01", 64000), r("2026-06-01", 62500), r("2026-09-01", 61730)];
    const f = forecastEvent(results, event, 25, "2026-09-29", "2026-12-12")!;
    expect(f.predictedMs).toBeLessThan(61730);
    expect(f.monthlyChangePct).toBeGreaterThanOrEqual(-1.01);
    expect(f.lowMs).toBeLessThan(f.predictedMs);
  });

  it("prognostiziert bei Verschlechterung die aktuelle Bestzeit", () => {
    const results = [r("2026-01-01", 60000), r("2026-04-01", 61000), r("2026-08-01", 62000)];
    expect(forecastEvent(results, event, 25, "2026-09-29", "2026-12-12")!.predictedMs).toBe(60000);
  });

  it("berechnet die Chance auf die Pflichtzeit", () => {
    const results = [r("2025-11-01", 65000), r("2026-02-01", 64000), r("2026-06-01", 62500), r("2026-09-01", 61730)];
    const f = forecastEvent(results, event, 25, "2026-09-29", "2026-12-12")!;
    expect(reachChance(f, 70000)).toBe(100);
    expect(reachChance(f, 50000)).toBeLessThan(5);
  });
});
