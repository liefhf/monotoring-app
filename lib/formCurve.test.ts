import { describe, expect, it } from "vitest";
import { DailyLoad, formCurve, taperAdvice } from "@/lib/formCurve";

const addDays = (date: string, days: number) => new Date(Date.parse(date) + days * 86_400_000).toISOString().slice(0, 10);

/* 8 Wochen: Mo-Fr je 600 Belastung, dann bis zum Ziel nach Plan */
function plan(taper: boolean): DailyLoad[] {
  const loads: DailyLoad[] = [];
  for (let d = 0; d < 70; d++) {
    const date = addDays("2026-08-01", d);
    const weekday = new Date(date).getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const future = date > "2026-09-29";
    const inTaper = taper && date >= "2026-09-30";
    loads.push({ date, load: inTaper ? 250 : 600, planned: future });
  }
  return loads;
}

describe("formCurve", () => {
  it("Form ist nach Belastung negativ und steigt bei Tapering", () => {
    const heavy = formCurve(plan(false), "2026-08-01", "2026-10-09");
    const tapered = formCurve(plan(true), "2026-08-01", "2026-10-09");
    expect(heavy.find((p) => p.date === "2026-09-29")!.form).toBeLessThan(0);
    expect(tapered[tapered.length - 1].form).toBeGreaterThan(heavy[heavy.length - 1].form);
  });

  it("gibt eine Tapering-Empfehlung", () => {
    const heavy = formCurve(plan(false), "2026-08-01", "2026-10-09");
    expect(taperAdvice(heavy, "2026-09-29", "2026-10-09").status).toBe("zu-muede");
    const tapered = formCurve(plan(true), "2026-08-01", "2026-10-09");
    expect(taperAdvice(tapered, "2026-09-29", "2026-10-09").status).not.toBe("zu-muede");
  });

  it("ohne Daten keine Empfehlung", () => {
    expect(taperAdvice(formCurve([], "2026-09-01", "2026-10-09"), "2026-09-29", "2026-10-09").status).toBe("keine-daten");
  });
});
