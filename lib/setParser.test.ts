import { describe, expect, it } from "vitest";
import { parseSetBlock, parseSetLine, totalMeters } from "@/lib/setParser";

describe("parseSetLine", () => {
  it("liest die typische Tafel-Schreibweise", () => {
    expect(parseSetLine("8x200 Kraul GA2 @3:00")).toEqual({
      repetitions: 8,
      distance: 200,
      style: "Kraul",
      zone: "BZ4 (GA2)",
      intervalType: "@",
      intervalTime: "3:00",
      exercise: "",
    });
  });

  it("versteht ×, Pause in Sekunden, Kurzformen und Freitext", () => {
    expect(parseSetLine("4 × 50 R Beine P20 Abschlag 3-3-3")).toMatchObject({
      repetitions: 4,
      distance: 50,
      style: "Rücken",
      intervalType: "P",
      intervalTime: "0:20",
      exercise: "Beine Abschlag 3-3-3",
    });
    expect(parseSetLine("10x100 Lagen BZ5 @1:40")).toMatchObject({ style: "Lagen", zone: "BZ5 (GA2)", intervalTime: "1:40" });
  });

  it("nimmt eine einzelne Strecke ohne Wiederholung", () => {
    expect(parseSetLine("400 locker ein")).toMatchObject({ repetitions: 1, distance: 400, style: null, exercise: "locker ein" });
  });

  it("ignoriert Zeilen ohne Strecke", () => {
    expect(parseSetLine("Hauptserie")).toBeNull();
    expect(parseSetLine("")).toBeNull();
  });
});

describe("parseSetBlock", () => {
  it("zerlegt mehrere Zeilen und rechnet den Umfang", () => {
    const sets = parseSetBlock("400 ein\n8x50 Kraul Sprint SA P1:00\nHauptserie\n6x200 GA2 @3:10");
    expect(sets).toHaveLength(3);
    expect(sets[1]).toMatchObject({ zone: "BZ7 (SA)", exercise: "Sprint" });
    expect(totalMeters(sets)).toBe(2000);
  });
});
