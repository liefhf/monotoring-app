import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));
import { formatTimesInput, parseIntervalSeconds, parseTimesInput, setStats } from "./setTimes";

describe("parseTimesInput", () => {
  it("liest Zeiten und Luecken", () => {
    expect(parseTimesInput("1:41 1:40 - 1:31,5")).toEqual({ times: [101000, 100000, null, 91500], invalid: [] });
  });

  it("meldet ungueltige Eingaben", () => {
    expect(parseTimesInput("1:41 abc").invalid).toEqual(["abc"]);
  });

  it("formatiert zurueck", () => {
    expect(formatTimesInput([101000, null])).toBe("1:41,00 -");
  });
});

describe("setStats", () => {
  it("berechnet Schnitt, Bestzeit, Abfall und Abgang", () => {
    const stats = setStats([100000, 100000, null, 110000, 110000], parseIntervalSeconds("1:40"));
    expect(stats.count).toBe(4);
    expect(stats.planned).toBe(5);
    expect(stats.averageMs).toBe(105000);
    expect(stats.bestMs).toBe(100000);
    expect(stats.dropOffMs).toBe(10000);
    expect(stats.withinInterval).toBe(2);
  });

  it("ohne Zeiten leer", () => {
    expect(setStats([], null)).toMatchObject({ count: 0, averageMs: null, dropOffMs: null, withinInterval: null });
  });
});
