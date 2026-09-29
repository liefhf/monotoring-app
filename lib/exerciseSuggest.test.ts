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

describe("Bahnlaenge und Einschwimmen", () => {
  it("Einschwimmen 600 GA1 + 200 Beine Brett GA2", () => {
    const s = suggestExercises("Lagen Technik", week);
    const warm = s.rows.filter((r) => r.section === "einschwimmen");
    expect(warm.map((r) => r.distance)).toEqual([600, 200]);
    expect(s.rows.filter((r) => r.section === "technik").length).toBeGreaterThan(4);
  });

  it("50m-Bahn: keine 25er ausser Wenden ab Bahnmitte", () => {
    const s = suggestExercises("Kraul Technik Sprint", week, 50);
    for (const r of s.rows.filter((r) => r.distance === 25)) expect(r.exercise).toMatch(/^ab Bahnmitte/);
    expect(s.rows.some((r) => r.exercise.startsWith("ab Bahnmitte: Rückenwende"))).toBe(true);
  });
});
