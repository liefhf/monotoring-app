import { describe, expect, it } from "vitest";
import { comparability, seriesFindings, seriesGaps, seriesStats } from "./setAnalysis";

const base = { distance: 200, repetitions: 8, stroke: "Kraul", pool_length: 25, interval_seconds: 180, interval_type: "@", materials: [] as string[] };

describe("seriesStats", () => {
  it("fehlende und nicht geschwommene Wiederholungen zaehlen nicht als 0", () => {
    const s = seriesStats({ times_ms: [150000, null, 152000, 151000], missed_reps: [5], target_ms: null, repetitions: 6 });
    expect(s.planned).toBe(6);
    expect(s.valid).toBe(3);
    expect(s.missed).toBe(1);
    expect(s.notRecorded).toBe(2); // Wdh. 2 und 6
    expect(s.meanMs).toBe(151000);
    expect(s.bestMs).toBe(150000);
    expect(s.bestRep).toBe(1);
    expect(s.worstRep).toBe(3);
  });
  it("Verlauf erst ab 6 Zeiten: letztes minus erstes Drittel", () => {
    const s = seriesStats({ times_ms: [150000, 150000, 151000, 151000, 154000, 154000], missed_reps: null, target_ms: null, repetitions: 6 });
    expect(s.trendMs).toBe(4000);
    expect(seriesStats({ times_ms: [1, 2, 3, 4, 5], missed_reps: null, target_ms: null, repetitions: 5 }).trendMs).toBeNull();
  });
  it("Streuung und Gleichmaessigkeit ab 3 Zeiten", () => {
    const s = seriesStats({ times_ms: [100000, 100000, 100000], missed_reps: null, target_ms: null, repetitions: 3 });
    expect(s.sdMs).toBe(0);
    expect(s.cvPercent).toBe(0);
    expect(seriesStats({ times_ms: [100000, 101000], missed_reps: null, target_ms: null, repetitions: 2 }).sdMs).toBeNull();
  });
  it("Sollzeit nur wenn hinterlegt", () => {
    const s = seriesStats({ times_ms: [149000, 151000, 150000], missed_reps: null, target_ms: 150000, repetitions: 3 });
    expect(s.targetHits).toBe(2);
    expect(s.targetMeanDiffMs).toBe(0);
    expect(seriesStats({ times_ms: [149000], missed_reps: null, target_ms: null, repetitions: 1 }).targetHits).toBeNull();
  });
  it("auffaellige Einzelwerte > 3 % vom Median", () => {
    const s = seriesStats({ times_ms: [100000, 100000, 100000, 110000], missed_reps: null, target_ms: null, repetitions: 4 });
    expect(s.outliers).toEqual([{ rep: 4, diffPercent: 10 }]);
  });
});

describe("comparability", () => {
  it("gleiche Bedingungen", () => {
    expect(comparability(base, { ...base })).toEqual({ comparable: true, differences: [], unknown: [] });
  });
  it("abweichende Bedingungen werden benannt", () => {
    const r = comparability(base, { ...base, pool_length: 50, materials: ["Flossen"] });
    expect(r.comparable).toBe(false);
    expect(r.differences).toEqual(["Beckenlänge", "Hilfsmittel"]);
  });
  it("fehlende Angaben = nicht sicher vergleichbar", () => {
    const r = comparability(base, { ...base, pool_length: null });
    expect(r.comparable).toBe(false);
    expect(r.unknown).toEqual(["Beckenlänge"]);
  });
});

describe("seriesFindings", () => {
  it("Beobachtung, Einordnung, Handlung bei langsamer werdender Serie", () => {
    const s = seriesStats({ times_ms: [150000, 150000, 151000, 151000, 155000, 156000], missed_reps: null, target_ms: null, repetitions: 6 });
    const f = seriesFindings(s);
    expect(f[0].observation).toMatch(/letzte Drittel .* langsamer/);
    expect(f[0].action).toMatch(/Prüfe, ob das Tempo absichtlich verändert wurde/);
  });
  it("nicht vergleichbare fruehere Serie ergibt KEINE Entwicklungsaussage", () => {
    const s = seriesStats({ times_ms: [150000, 150000, 150000], missed_reps: null, target_ms: null, repetitions: 3 });
    const prev = seriesStats({ times_ms: [160000, 160000, 160000], missed_reps: null, target_ms: null, repetitions: 3 });
    const f = seriesFindings(s, { previous: { stats: prev, date: "2026-09-30", comparable: false } });
    expect(f.map((x) => x.observation).join()).not.toMatch(/schneller/);
    expect(f[0].action).toMatch(/Keine Leistungsentwicklung/);
  });
});

describe("seriesGaps", () => {
  it("benennt fehlende Informationen", () => {
    const s = seriesStats({ times_ms: [150000, null], missed_reps: null, target_ms: null, repetitions: 2 });
    expect(seriesGaps(s, { ...base, pool_length: null, target_ms: null }, false)).toEqual([
      "1 Wiederholung nicht erfasst",
      "weniger als 3 Zeiten – keine Aussage zur Gleichmäßigkeit",
      "keine Sollzeit hinterlegt",
      "Beckenlänge unbekannt",
      "keine frühere vergleichbare Serie",
    ]);
  });
});
