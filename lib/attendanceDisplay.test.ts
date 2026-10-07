import { describe, expect, it } from "vitest";
import { attendanceDisplay } from "./attendance";

describe("attendanceDisplay", () => {
  it("zeigt bei wenig Grundlage keine Prozentzahl", () => {
    expect(attendanceDisplay(1, 1)).toEqual({ main: "1 von 1", sub: "anwesend · noch wenig Daten", enough: false });
    expect(attendanceDisplay(0, 0).main).toBe("–");
  });
  it("Prozent erst ab ausreichender Grundlage", () => {
    expect(attendanceDisplay(9, 10)).toEqual({ main: "90 %", sub: "9 von 10 erfassten Einträgen anwesend", enough: true });
  });
});
