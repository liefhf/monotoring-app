import { describe, expect, it } from "vitest";
import { analyzeLactateTest, formatPace, thresholdChange } from "@/lib/lactate";

/* 5 x 200 m ansteigend */
const steps = [
  { time_ms: 170_000, lactate: 1.2, heart_rate: 140 },
  { time_ms: 162_000, lactate: 1.6, heart_rate: 152 },
  { time_ms: 155_000, lactate: 2.6, heart_rate: 164 },
  { time_ms: 149_000, lactate: 4.4, heart_rate: 176 },
  { time_ms: 144_000, lactate: 7.9, heart_rate: 186 },
];

describe("lactate", () => {
  it("interpoliert 2- und 4-mmol-Schwelle mit Herzfrequenz", () => {
    const result = analyzeLactateTest({ steps, step_distance: 200 });
    // v2 zwischen Stufe 2 (1,6) und 3 (2,6): 40 % des Weges
    expect(result.v2!.speed).toBeCloseTo(1.2346 + 0.4 * (1.2903 - 1.2346), 3);
    expect(result.v2!.heartRate).toBe(157);
    expect(result.v4!.speed).toBeGreaterThan(result.v2!.speed);
    expect(formatPace(result.v4!.pace100Ms)).toMatch(/^1:1\d,\d$/);
    expect(result.warnings).toEqual([]);
  });

  it("liefert Zonen, langsam nach schnell", () => {
    const { zones } = analyzeLactateTest({ steps, step_distance: 200 });
    expect(zones.map((z) => z.code)).toEqual(["BZ1 (Rekom)", "BZ2 (GA1)", "BZ3 (GA1)", "BZ4 (GA2)", "BZ5 (GA2)", "BZ6 (WA)"]);
    expect(zones[2].fromPace!).toBeGreaterThan(zones[2].toPace!);
  });

  it("warnt, wenn 4 mmol/l nicht erreicht wurden", () => {
    const result = analyzeLactateTest({ steps: steps.slice(0, 3), step_distance: 200 });
    expect(result.v4).toBeNull();
    expect(result.warnings[0]).toContain("nicht ausbelastet");
  });

  it("vergleicht Schwellen zweier Tests", () => {
    const a = analyzeLactateTest({ steps, step_distance: 200 }).v4;
    const faster = analyzeLactateTest({ steps: steps.map((s) => ({ ...s, time_ms: s.time_ms * 0.98 })), step_distance: 200 }).v4;
    expect(thresholdChange(faster, a)).toBeCloseTo(2.04, 1);
  });
});
