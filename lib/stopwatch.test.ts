import { describe, expect, it } from "vitest";
import { Lane, addSplit, expectedSplits, finishLane, laps, startLane, undoLane } from "@/lib/stopwatch";

const lane = (): Lane => ({ id: "1", swimmerId: "s", distance: 100, stroke: "freestyle", startedAt: null, splits: [], finalMs: null, saved: false });

describe("stopwatch", () => {
  it("nimmt Splits und Endzeit auf Hundertstel gerundet", () => {
    let l = startLane(lane(), 1_000_000);
    l = addSplit(l, 1_000_000 + 14_123);
    l = addSplit(l, 1_000_000 + 30_457);
    l = finishLane(l, 1_000_000 + 63_191);
    expect(l.splits).toEqual([14_120, 30_460]);
    expect(l.finalMs).toBe(63_190);
    expect(laps(l.splits, l.finalMs)).toEqual([14_120, 16_340, 32_730]);
  });

  it("ignoriert Doppeltipper innerhalb von 3 Sekunden", () => {
    let l = startLane(lane(), 0);
    l = addSplit(l, 15_000);
    l = addSplit(l, 15_800);
    expect(l.splits).toEqual([15_000]);
  });

  it("wertet einen Split direkt vor 'Ziel' als Anschlag", () => {
    let l = startLane(lane(), 0);
    l = addSplit(l, 30_000);
    l = addSplit(l, 63_000);
    l = finishLane(l, 63_900);
    expect(l.finalMs).toBe(63_000);
    expect(l.splits).toEqual([30_000]);
  });

  it("nimmt den letzten Tipp zurueck", () => {
    let l = finishLane(addSplit(startLane(lane(), 0), 30_000), 63_000);
    l = undoLane(l);
    expect(l.finalMs).toBeNull();
    expect(undoLane(l).splits).toEqual([]);
  });

  it("kennt die erwartete Zahl Zwischenzeiten", () => {
    expect(expectedSplits(100, 25)).toBe(3);
    expect(expectedSplits(50, 50)).toBe(0);
  });
});
