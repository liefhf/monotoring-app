import { describe, expect, it } from "vitest";
import { parseRepTime } from "./setTimeInput";

const ms = (raw: string, distance: number | null = null) => {
  const r = parseRepTime(raw, distance);
  return r.kind === "time" ? r.ms : r.kind;
};

describe("parseRepTime", () => {
  it("schwimmuebliche Formate", () => {
    expect(ms("1:12,40")).toBe(72400);
    expect(ms("1:12.40")).toBe(72400);
    expect(ms("1:12,4")).toBe(72400);
    expect(ms("32,85")).toBe(32850);
    expect(ms("32.85")).toBe(32850);
    expect(ms("32")).toBe(32000);
  });
  it("leer = nicht erfasst, x/- = nicht geschwommen", () => {
    expect(ms("")).toBe("empty");
    expect(ms("x")).toBe("missed");
    expect(ms("-")).toBe("missed");
  });
  it("Kurzschreibweise nur 5-6 Ziffern und mit sichtbarer Deutung", () => {
    const r = parseRepTime("11240");
    expect(r).toMatchObject({ kind: "time", ms: 72400, shorthand: true, display: "1:12,40" });
    expect(ms("021530")).toBe(135300);
  });
  it("mehrdeutige Eingaben werden nicht umgedeutet", () => {
    expect(ms("112,4")).toBe("ambiguous");
    expect(ms("152")).toBe("ambiguous");
    expect(ms("3285")).toBe("ambiguous");
  });
  it("ungueltige Eingaben", () => {
    expect(ms("1:75")).toBe("invalid");
    expect(ms("1:5")).toBe("invalid");
    expect(ms("abc")).toBe("invalid");
    expect(ms("17500")).toBe("invalid"); // 1 min 75 s
  });
  it("Plausibilitaet je Strecke als Warnung, nicht als Ablehnung", () => {
    const r = parseRepTime("1:12,40", 200);
    expect(r.kind).toBe("time");
    expect(r.kind === "time" && r.warning).toBeTruthy();
    const ok = parseRepTime("2:35,00", 200);
    expect(ok.kind === "time" && ok.warning).toBe(null);
  });
});
