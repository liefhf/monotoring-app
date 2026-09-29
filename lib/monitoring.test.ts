import { describe, expect, it } from "vitest";
import { acwr, buildFlags, sessionLoad } from "@/lib/monitoring";

const day = (offset: number) => new Date(Date.parse("2026-09-29") - offset * 86_400_000).toISOString().slice(0, 10);

describe("acwr", () => {
  it("braucht mindestens 3 Wochen Daten", () => {
    expect(acwr([{ date: day(0), load: 500, estimated: false }], "2026-09-29").zone).toBe("zu-wenig-daten");
  });

  it("erkennt die Gefahrenzone bei stark gestiegener Belastung", () => {
    const entries = [
      ...[27, 24, 20, 17, 13, 10].map((d) => ({ date: day(d), load: 400, estimated: false })),
      ...[6, 5, 4, 3, 2, 1, 0].map((d) => ({ date: day(d), load: 600, estimated: false })),
    ];
    const result = acwr(entries, "2026-09-29");
    // akut 4200, chronisch (2400 + 4200) / 4 = 1650 -> 2,55
    expect(result.ratio).toBeCloseTo(2.545, 2);
    expect(result.zone).toBe("gefahr");
  });

  it("ist bei gleichmaessiger Belastung optimal", () => {
    const entries = [27, 24, 20, 17, 13, 10, 6, 3].map((d) => ({ date: day(d), load: 500, estimated: false }));
    expect(acwr(entries, "2026-09-29").zone).toBe("optimal");
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
      wellness: [{ entry_date: day(0), score: 5.6 }],
      attendanceRate: 90,
      today: "2026-09-29",
    });
    expect(flags.map((f) => [f.kind, f.level])).toEqual([
      ["schmerz", "rot"],
      ["befinden", "gelb"],
    ]);
    expect(flags[0].text).toContain("zunehmend");
  });
});
