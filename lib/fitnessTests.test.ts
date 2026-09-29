import { describe, expect, it } from "vitest";
import { formatTestValue, improvementPct, rateTest, teamRank, testByCode } from "@/lib/fitnessTests";

describe("fitnessTests", () => {
  it("bewertet den Grundkrafttest Rumpf nach Maier", () => {
    const ventral = testByCode.get("rumpf_ventral")!;
    expect(rateTest(ventral, 120, "male", 15)?.label).toBe("genügend");
    expect(rateTest(ventral, 100, "male", 15)?.label).toBe("grenzwertig");
    expect(rateTest(ventral, 90, "female", 15)?.label).toBe("grenzwertig");
    expect(rateTest(ventral, 80, "female", 15)?.label).toBe("ungenügend");
  });

  it("nutzt Altersnormen nur in der Normgruppe", () => {
    const jump = testByCode.get("standweitsprung")!;
    expect(rateTest(jump, 230, "male", 22)?.label).toBe("gut");
    expect(rateTest(jump, 230, "male", 15)).toBeNull();
    expect(rateTest(testByCode.get("klimmzuege")!, 10, "female", 20)).toBeNull();
  });

  it("vergleicht im Team und ueber die Zeit", () => {
    const delfin = testByCode.get("delfin15")!;
    expect(teamRank(delfin, 7.2, [8.1, 7.2, 9.0])).toEqual({ rank: 1, of: 3 });
    expect(improvementPct(delfin, 7.2, 8.0)).toBeCloseTo(10, 1);
    expect(formatTestValue(testByCode.get("t2000")!, 1590)).toBe("26:30,00 min");
  });
});
