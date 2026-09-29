import { describe, expect, it } from "vitest";
import { weekStart, weeklyVolume } from "@/lib/dashboardStats";

describe("dashboardStats", () => {
  it("findet den Montag der Woche", () => {
    expect(weekStart("2026-09-29")).toBe("2026-09-28");
    expect(weekStart("2026-10-04")).toBe("2026-09-28");
  });

  it("summiert Meter je Woche und markiert die aktuelle", () => {
    const bars = weeklyVolume(
      [
        { session_date: "2026-09-28", total_meters: 4500 },
        { session_date: "2026-09-30", total_meters: 3000 },
        { session_date: "2026-09-22", total_meters: 5000 },
      ],
      "2026-09-29",
      3
    );
    expect(bars.map((bar) => bar.meters)).toEqual([0, 5000, 7500]);
    expect(bars[2]).toMatchObject({ current: true, sessions: 2, label: "28.09" });
  });
});

describe("weekDays", () => {
  it("zeigt Mo-So der aktuellen Woche mit Kalenderwoche", async () => {
    const { weekDays, isoWeek } = await import("@/lib/dashboardStats");
    const days = weekDays([{ session_date: "2026-09-29", total_meters: 4800 }, { session_date: "2026-10-01", total_meters: 4000 }], "2026-09-29");
    expect(days.map((d) => d.label)).toEqual(["Mo 28.09", "Di 29.09", "Mi 30.09", "Do 01.10", "Fr 02.10", "Sa 03.10", "So 04.10"]);
    expect(days[1]).toMatchObject({ meters: 4800, today: true, planned: false });
    expect(days[3]).toMatchObject({ meters: 4000, planned: true });
    expect(isoWeek("2026-09-29")).toBe(40);
    expect(isoWeek("2026-01-01")).toBe(1);
    expect(isoWeek("2027-01-01")).toBe(53);
  });
});

describe("localDateOf", () => {
  it("nimmt das lokale Datum eines Zeitstempels (Berlin)", async () => {
    const { localDateOf } = await import("@/lib/community");
    process.env.TZ = "Europe/Berlin";
    // 24.10. 00:00 Berlin = 23.10. 22:00 UTC
    expect(localDateOf("2026-10-23T22:00:00+00:00")).toBe("2026-10-24");
  });
});
