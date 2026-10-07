import { describe, expect, it } from "vitest";
import { scaleTrend } from "@/lib/wellnessTrend";

const day = (offset: number) => new Date(Date.parse("2026-10-07") - offset * 86_400_000).toISOString().slice(0, 10);
const entry = (offset: number, sleep: number) => ({ entry_date: day(offset), sleep_quality: sleep, energy: 7, muscle_feeling: 7, stress: 7, mood: 7 });

describe("scaleTrend", () => {
  it("braucht je Zeitraum mindestens 3 Eintraege", () => {
    expect(scaleTrend([entry(0, 4), entry(20, 8)], "2026-10-07")).toEqual([]);
  });

  it("zeigt nur deutliche Veraenderungen, schlechteste zuerst", () => {
    const entries = [entry(0, 4), entry(2, 5), entry(4, 4), entry(15, 8), entry(18, 8), entry(21, 7)];
    const result = scaleTrend(entries, "2026-10-07");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ key: "sleep_quality", label: "Schlaf" });
    expect(result[0].change).toBeCloseTo(-3.3, 1);
  });
});
