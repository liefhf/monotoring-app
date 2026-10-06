import { describe, expect, it } from "vitest";
import { Candidate, optimizeLineup } from "@/lib/dmsLineup";
import { SwimmerResult } from "@/lib/swim";

const e = (distance: number, stroke: "freestyle" | "backstroke") => ({ distance, stroke });
const c = (swimmerId: string, event: { distance: number; stroke: "freestyle" | "backstroke" }, points: number): Candidate => ({
  swimmerId, event, points, timeMs: 60000, result: {} as SwimmerResult,
});

describe("optimizeLineup", () => {
  const events = [e(100, "freestyle"), e(100, "backstroke")];

  it("findet die punktbeste Verteilung statt jeweils den Besten zu nehmen", () => {
    // A ist ueberall am besten, darf aber nur 1x starten -> A in Ruecken (groessere Luecke zu B)
    const candidates = [c("A", events[0], 500), c("A", events[1], 480), c("B", events[0], 490), c("B", events[1], 300)];
    const result = optimizeLineup({ candidates, events, swimmerIds: ["A", "B"], startsPerEvent: 1, maxStartsPerSwimmer: 1 });
    expect(result.total).toBe(970);
    expect(result.assignments[0].slots[0]?.swimmerId).toBe("B");
    expect(result.assignments[1].slots[0]?.swimmerId).toBe("A");
  });

  it("haelt Startgrenzen ein und laesst Luecken sichtbar", () => {
    const candidates = [c("A", events[0], 500), c("A", events[1], 480)];
    const result = optimizeLineup({ candidates, events, swimmerIds: ["A"], startsPerEvent: 2, maxStartsPerSwimmer: 5 });
    expect(result.startsBySwimmer.A).toBe(2);
    expect(result.assignments[0].slots[1]).toBeNull();
  });

  it("beruecksichtigt feste und ausgeschlossene Starts", () => {
    const candidates = [c("A", events[0], 500), c("A", events[1], 480), c("B", events[0], 490), c("B", events[1], 300)];
    const result = optimizeLineup({
      candidates, events, swimmerIds: ["A", "B"], startsPerEvent: 1, maxStartsPerSwimmer: 1,
      locked: ["A|100-freestyle"], excluded: [],
    });
    expect(result.assignments[0].slots[0]?.swimmerId).toBe("A");
    expect(result.assignments[1].slots[0]?.swimmerId).toBe("B");
  });
});
