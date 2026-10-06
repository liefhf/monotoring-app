import { describe, expect, it } from "vitest";
import { nutritionPlan } from "@/lib/raceDay";

describe("nutritionPlan", () => {
  it("plant Mahlzeit, Snacks und Regeneration um die Starts", () => {
    const plan = nutritionPlan([
      { time: "11:40", label: "100 R" },
      { time: "09:30", label: "50 F" },
    ]);
    expect(plan[0]).toMatchObject({ time: "06:00", title: "Hauptmahlzeit" });
    expect(plan.find((item) => item.title === "Start: 50 F")?.time).toBe("09:30");
    // 130 Minuten Pause -> Snack
    expect(plan.find((item) => item.title === "Zwischen den Starts")?.kind).toBe("essen");
    expect(plan[plan.length - 1]).toMatchObject({ time: "12:10", title: "Regeneration" });
  });

  it("ohne Startzeit kein Plan", () => {
    expect(nutritionPlan([{ time: "", label: "50 F" }])).toEqual([]);
  });
});
