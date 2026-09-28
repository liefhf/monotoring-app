import { describe, expect, it } from "vitest";
import { suggestExercises } from "@/lib/exerciseSuggest";
import { WeekFocus } from "@/lib/weekFocus";

const week: WeekFocus = {
  phase: "aufbau",
  technique: [{ title: "Rücken: Wende", athletes: ["Emma", "Mara"], reasons: [] }],
  targets: [],
  mainA: [{ stroke: "freestyle", label: "Freistil", athletes: ["Piet"] }],
  mainB: [{ stroke: "backstroke", label: "Rücken", athletes: ["Mara"] }],
  blocks: [],
};

describe("suggestExercises", () => {
  it("erkennt Lage und Thema und nimmt die Rueckenwende aus dem Wochenfokus mit", () => {
    const s = suggestExercises("Sprint Kraul", week);
    expect(s.strokes).toEqual(["Kraul"]);
    expect(s.topics).toContain("sprint");
    expect(s.rows.some((r) => r.section === "hauptblock" && r.zone === "BZ8 (S)" && r.style === "Kraul")).toBe(true);
    expect(s.rows.some((r) => r.exercise.includes("Rückenwende") && r.exercise.includes("Emma"))).toBe(true);
  });

  it("ohne Stichwort: Hauptteil A/B nach Phase", () => {
    const s = suggestExercises("", week);
    expect(s.rows.some((r) => r.exercise.startsWith("Hauptteil A Hauptlage"))).toBe(true);
    expect(s.rows.some((r) => r.exercise.startsWith("Hauptteil B Nebenlage"))).toBe(true);
  });

  it("passt den Umfang an die Dauer an", () => {
    const short = suggestExercises("Ausdauer Kraul 45 min", week);
    const long = suggestExercises("Ausdauer Kraul 120 min", week);
    const main = (s: typeof short) => s.rows.filter((r) => r.section === "hauptblock").reduce((sum, r) => sum + r.repetitions * r.distance, 0);
    expect(main(long)).toBeGreaterThan(main(short));
  });
});
