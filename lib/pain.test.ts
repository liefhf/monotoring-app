import { describe, expect, it } from "vitest";
import { BODY_SPOTS, getSpot, painColor, painWord, strongestBySpot } from "@/lib/pain";

describe("Koerpermodell", () => {
  it("hat eindeutige Stellen", () => {
    const ids = BODY_SPOTS.map((spot) => spot.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ordnet die Seiten richtig zu", () => {
    // Vorne: linke Bildhaelfte = rechte Koerperseite
    expect(getSpot("front-knee-right")?.mirrored).toBe(false);
    expect(getSpot("front-knee-left")?.mirrored).toBe(true);
    // Hinten: linke Bildhaelfte = linke Koerperseite
    expect(getSpot("back-calf-left")?.mirrored).toBe(false);
    expect(getSpot("back-calf-right")?.mirrored).toBe(true);
  });

  it("beschriftet Stellen mit Seite", () => {
    expect(getSpot("front-knee-right")?.label).toBe("Knie rechts");
    expect(getSpot("back-lumbar")?.label).toBe("Lendenwirbelsäule");
    expect(getSpot("back-lumbar")?.type).toBe("joint");
  });

  it("hat Muskeln und Gelenke vorne und hinten", () => {
    for (const view of ["front", "back"] as const) {
      const spots = BODY_SPOTS.filter((spot) => spot.view === view);
      expect(spots.some((spot) => spot.type === "muscle")).toBe(true);
      expect(spots.some((spot) => spot.type === "joint")).toBe(true);
    }
  });
});

describe("Staerke", () => {
  it("faerbt von gruen nach rot", () => {
    expect(painColor(1)).toBe("hsl(120 80% 50%)");
    expect(painColor(10)).toBe("hsl(0 80% 50%)");
    expect(painColor(99)).toBe(painColor(10));
  });

  it("benennt die Staerke", () => {
    expect(painWord(2)).toBe("leicht");
    expect(painWord(5)).toBe("mittel");
    expect(painWord(8)).toBe("stark");
    expect(painWord(10)).toBe("sehr stark");
  });

  it("nimmt je Stelle den staerksten Wert", () => {
    expect(
      strongestBySpot([
        { spot_id: "a", pain_level: 3 },
        { spot_id: "a", pain_level: 7 },
        { spot_id: "b", pain_level: 2 },
        { spot_id: null, pain_level: 9 },
      ])
    ).toEqual({ a: 7, b: 2 });
  });
});
