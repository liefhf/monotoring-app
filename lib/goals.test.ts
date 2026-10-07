import { describe, expect, it } from "vitest";
import { Goal, goalLabel, goalProgress, sortGoals } from "@/lib/goals";
import { SwimmerResult } from "@/lib/swim";

const goal = (extra: Partial<Goal> = {}): Goal => ({
  id: "g",
  swimmer_id: "s",
  kind: "zeit",
  title: null,
  distance: 100,
  stroke: "backstroke",
  pool_length: 25,
  target_ms: 69500,
  due_date: null,
  achieved_at: null,
  visible_to_athlete: true,
  created_at: "2026-10-01",
  ...extra,
});

const result = (time: number, extra: Partial<SwimmerResult> = {}) =>
  ({ id: String(time), swimmer_id: "s", result_date: "2026-09-01", location: null, pool_length: 25, distance: 100, stroke: "backstroke", time_ms: time, points: null, round: null, is_split: false, ...extra }) as SwimmerResult;

describe("goals", () => {
  it("vergleicht ein Zeitziel automatisch mit der Bestzeit", () => {
    const progress = goalProgress(goal(), [result(72400), result(71900), result(65000, { pool_length: 50 })]);
    expect(progress).toMatchObject({ remainingMs: 2400, reached: false });
    expect(progress.best?.time_ms).toBe(71900);
  });

  it("zaehlt offizielle Zwischenzeiten wie der Bestzeiten-Tab", () => {
    expect(goalProgress(goal(), [result(71900), result(69000, { is_split: true })]).reached).toBe(true);
  });

  it("erkennt ein erreichtes Ziel", () => {
    expect(goalProgress(goal(), [result(69400)]).reached).toBe(true);
  });

  it("beschriftet Zeit- und Textziele", () => {
    expect(goalLabel(goal())).toBe("100 m Rücken (25-m-Bahn)");
    expect(goalLabel(goal({ kind: "technik", title: "15 m Unterwasser stabil" }))).toBe("15 m Unterwasser stabil");
  });

  it("sortiert offene, knappe Ziele nach vorn", () => {
    const goals = [goal({ id: "erreicht", target_ms: 75000 }), goal({ id: "weit", target_ms: 60000 }), goal({ id: "knapp", target_ms: 71000 })];
    expect(sortGoals(goals, [result(71900)]).map((item) => item.id)).toEqual(["knapp", "weit", "erreicht"]);
  });
});
