import { describe, expect, it } from "vitest";
import { acwr, buildFlags, sessionLoad } from "@/lib/monitoring";

const day = (offset: number) => new Date(Date.parse("2026-09-29") - offset * 86_400_000).toISOString().slice(0, 10);

describe("acwr", () => {
  it("braucht mindestens 3 Wochen Daten", () => {
    expect(acwr([{ date: day(0), load: 500, estimated: false }], "2026-09-29").zone).toBe("zu-wenig-daten");
  });

  it("erkennt deutlich hoehere Belastung als in den Vorwochen (entkoppelt)", () => {
    const entries = [
      ...[27, 24, 20, 17, 13, 10].map((d) => ({ date: day(d), load: 400, estimated: false })),
      ...[6, 5, 4, 3, 2, 1, 0].map((d) => ({ date: day(d), load: 600, estimated: false })),
    ];
    const result = acwr(entries, "2026-09-29");
    // akut 4200, Vorwochen (Tage 7-27) 2400 / 3 = 800 -> 5,25
    expect(result.ratio).toBeCloseTo(5.25, 2);
    expect(result.changePercent).toBe(425);
    expect(result.zone).toBe("deutlich-hoeher");
  });

  it("ist bei gleichmaessiger Belastung im gewohnten Bereich", () => {
    const entries = [27, 24, 20, 17, 13, 10, 6, 3].map((d) => ({ date: day(d), load: 500, estimated: false }));
    expect(acwr(entries, "2026-09-29").zone).toBe("ueblich");
  });

  it("berechnet Session-RPE", () => {
    expect(sessionLoad(7, 90)).toBe(630);
    expect(sessionLoad(null, 90)).toBe(0);
  });
});

describe("buildFlags", () => {
  it("markiert steigende Schmerzen rot und sortiert Rot vor Gelb", () => {
    const flags = buildFlags({
      acwr: null,
      painReports: [
        { created_at: `${day(2)}T08:00:00Z`, pain_level: 2, spot_label: "Schulter rechts", body_region: null },
        { created_at: `${day(0)}T08:00:00Z`, pain_level: 4, spot_label: "Schulter rechts", body_region: null },
      ],
      wellness: [{ entry_date: day(0), score: 58 }],
      attendanceRate: 90,
      today: "2026-09-29",
    });
    expect(flags.map((f) => [f.kind, f.level])).toEqual([
      ["schmerz", "rot"],
      ["befinden", "gelb"],
    ]);
    expect(flags[0].text).toContain("zunehmend");
    expect(flags[0].check).not.toBe("");
  });

  it("spricht nie von Verletzungsrisiko und meldet fehlende Check-ins", () => {
    const flags = buildFlags({
      acwr: { acute: 3000, chronicWeekly: 1500, ratio: 2, changePercent: 100, zone: "deutlich-hoeher", daysWithData: 28 },
      painReports: [],
      wellness: [],
      attendanceRate: null,
      lastCheckIn: day(5),
      today: "2026-09-29",
    });
    expect(flags.map((f) => f.kind)).toEqual(["acwr", "checkin"]);
    expect(flags.map((f) => f.text).join(" ")).not.toMatch(/Risiko|Gefahr/);
  });

  it("meldet anhaltend schlechtes Befinden rot", () => {
    const flags = buildFlags({
      acwr: null,
      painReports: [],
      wellness: [
        { entry_date: day(0), score: 60 },
        { entry_date: day(1), score: 58 },
        { entry_date: day(2), score: 62 },
      ],
      attendanceRate: null,
      today: "2026-09-29",
    });
    expect(flags[0]).toMatchObject({ kind: "befinden", level: "rot" });
  });
});

describe("readinessScore", () => {
  it("zieht fuer wenig Schlaf, Schmerzen und Abweichung vom eigenen Schnitt ab", async () => {
    const { readinessScore } = await import("@/lib/monitoring");
    const good = readinessScore({ sleep_quality: 8, energy: 8, muscle_feeling: 8, stress: 8, mood: 8, sleep_hours: 8.5, has_pain: false });
    expect(good).toMatchObject({ score: 80, level: "bereit" });
    const bad = readinessScore({ sleep_quality: 5, energy: 6, muscle_feeling: 4, stress: 6, mood: 6, sleep_hours: 6, has_pain: true }, 8);
    // Basis 5,4 -> 54, -8 Schlaf, -10 Schmerz, -10 unter Schnitt = 26
    expect(bad.score).toBe(26);
    expect(bad.level).toBe("regeneration");
    expect(bad.hints.join(" ")).toContain("Muskelgefühl");
  });
});
