import { describe, expect, it } from "vitest";
import { attendanceSummary, checkInSummary, newPersonalBests, trainingSummary } from "@/lib/weeklyReport";
import { SwimmerResult } from "@/lib/swim";

const result = (date: string, time: number, extra: Partial<SwimmerResult> = {}): SwimmerResult => ({
  id: `${date}-${time}`,
  swimmer_id: "s1",
  result_date: date,
  location: null,
  pool_length: 25,
  distance: 100,
  stroke: "freestyle",
  time_ms: time,
  points: null,
  round: null,
  is_split: false,
  ...extra,
} as SwimmerResult);

describe("weeklyReport", () => {
  it("fasst Training zusammen und trennt Wasser und Land", () => {
    const summary = trainingSummary(
      [
        { id: "a", session_date: "2026-10-05", training_type: "water", total_meters: 4000, duration_minutes: 90, planned_rpe: 6 },
        { id: "b", session_date: "2026-10-06", training_type: "land", total_meters: null, duration_minutes: 60, planned_rpe: 4 },
      ],
      [{ training_session_id: "a", athlete_id: "p", rpe: 8 }]
    );
    expect(summary).toMatchObject({ sessions: 2, landSessions: 1, waterMeters: 4000, minutes: 150, plannedLoad: 780, avgPlannedRpe: 5, avgReportedRpe: 8 });
  });

  it("findet Athleten unter 70 % Anwesenheit", () => {
    const att = [
      { training_session_id: "a", swimmer_id: "x", status: "anwesend" },
      { training_session_id: "b", swimmer_id: "x", status: "fehlt" },
      { training_session_id: "c", swimmer_id: "x", status: "fehlt" },
      { training_session_id: "a", swimmer_id: "y", status: "anwesend" },
    ];
    const summary = attendanceSummary(att, ["x", "y"]);
    expect(summary.rate).toBe(50);
    expect(summary.low.map((item) => item.swimmerId)).toEqual(["x"]);
  });

  it("zaehlt regelmaessige Check-ins (mind. 4 von 7 Tagen)", () => {
    const entries = ["01", "02", "03", "04"].map((d) => ({ athlete_id: "p1", entry_date: `2026-10-${d}` })).concat([{ athlete_id: "p2", entry_date: "2026-10-01" }]);
    expect(checkInSummary(entries, ["p1", "p2", "p3"])).toEqual({ withLogin: 3, regular: 1, missing: ["p3"] });
  });

  it("meldet nur echte neue Bestzeiten, je Strecke die schnellste der Woche", () => {
    const results = [
      result("2026-09-01", 62000),
      result("2026-10-05", 61500),
      result("2026-10-06", 61000),
      result("2026-10-06", 30000, { distance: 50 }),
      result("2026-10-06", 60000, { is_split: true }),
    ];
    const bests = newPersonalBests(results, "2026-10-05", "2026-10-11");
    expect(bests).toHaveLength(1);
    expect(bests[0]).toMatchObject({ previous: 62000 });
    expect(bests[0].result.time_ms).toBe(61000);
  });
});
