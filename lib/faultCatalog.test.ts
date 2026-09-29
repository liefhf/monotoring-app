import { describe, expect, it } from "vitest";
import { buildAthleteFeedback, plausibilityWarnings, raceSegments } from "@/lib/faultCatalog";
import { buildWeekFocus } from "@/lib/weekFocus";

describe("faultCatalog", () => {
  it("baut die Abschnitte eines 100m-Rennens auf der 25m-Bahn", () => {
    expect(raceSegments(100, 25).map((s) => s.label)).toEqual(["Start", "0–25", "Wende 25 m", "25–50", "Wende 50 m", "50–75", "Wende 75 m", "75–100", "Ziel", "gesamt"]);
  });

  it("warnt bei vertauschten Zwischenzeiten und Tippfehlern", () => {
    const warnings = plausibilityWarnings({ finalMs: 6_500, splits: [31_000, 30_000], distance: 100, bestMs: 65_000 });
    expect(warnings.some((w) => w.includes("nicht größer"))).toBe(true);
    expect(warnings.some((w) => w.includes("unrealistisch schnell"))).toBe(true);
  });

  it("formuliert Feedback mit Abschnitt und Regelhinweis", () => {
    const feedback = buildAthleteFeedback({
      faults: [{ code: "wende_rueckendrehung", segment: "wende-2" }],
      poolLength: 25,
      laps: [],
      goalMs: 72_000,
      finalMs: 73_170,
      bestMs: 85_000,
    });
    expect(feedback.wentWell).toContain("Neue Bestzeit");
    expect(feedback.toImprove).toContain("Wende bei 50 m");
    expect(feedback.toImprove.startsWith("⚠ Regelrelevant")).toBe(true);
  });

  it("macht aus Wettkampffehlern Bausteine im Wochenfokus", () => {
    const week = buildWeekFocus({
      swimmers: [], results: [], focusBySwimmer: new Map(), standard: null, standardTimes: [], nonFinishes: [],
      competitionFaults: [{ name: "Emma", code: "wende_rueckendrehung" }, { name: "Mara", code: "wende_rueckendrehung" }, { name: "Piet", code: "tempo_einbruch" }],
      daysUntil: 26, today: "2026-09-29",
    });
    expect(week.blocks[0].id).toBe("fehler-wende_rueckendrehung");
    expect(week.blocks[0].why).toBe("Emma, Mara");
    expect(week.blocks[1].rows[0].section).toBe("hauptblock");
  });
});
