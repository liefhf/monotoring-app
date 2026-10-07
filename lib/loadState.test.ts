import { describe, expect, it } from "vitest";
import { LatestRequest, checkWrite, classifyError, toLoadResult, writeErrorText } from "./loadState";

describe("classifyError / toLoadResult", () => {
  it("unterscheidet fehlende Tabelle, Fehler und Erfolg", () => {
    expect(classifyError(null)).toBeNull();
    expect(classifyError({ code: "42P01" })).toBe("missing");
    expect(classifyError({ code: "PGRST205" })).toBe("missing");
    expect(classifyError({ code: "42501" })).toBe("error");
    expect(classifyError({})).toBe("error");
  });
  it("ein Ladefehler wird nie zu leeren Daten", () => {
    expect(toLoadResult({ data: null, error: { code: "500" } }, [])).toEqual({ status: "error" });
    expect(toLoadResult({ data: null, error: { code: "42P01" } }, [])).toEqual({ status: "missing" });
    expect(toLoadResult({ data: null, error: null }, [])).toEqual({ status: "ready", data: [] });
    expect(toLoadResult({ data: [1], error: null }, [])).toEqual({ status: "ready", data: [1] });
  });
});

describe("LatestRequest – spaete Antworten", () => {
  it("verwirft die Antwort einer aelteren Anfrage (Athletenwechsel)", async () => {
    const latest = new LatestRequest();
    const shown: string[] = [];
    const ask = (name: string, delay: number) => {
      const token = latest.begin();
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          if (latest.isLatest(token)) shown.push(name);
          resolve();
        }, delay)
      );
    };
    // Athlet A langsam, dann schnell Athlet B
    await Promise.all([ask("A", 30), ask("B", 5)]);
    expect(shown).toEqual(["B"]);
  });
  it("nach einem Fehler setzt ein erfolgreiches Neuladen den Zustand zurueck", () => {
    const first = toLoadResult({ data: null, error: { code: "500" } }, []);
    const second = toLoadResult({ data: [{ id: 1 }], error: null }, []);
    expect(first.status).toBe("error");
    expect(second.status).toBe("ready");
  });
});

describe("checkWrite", () => {
  it("0 betroffene Zeilen ist kein Erfolg (RLS oder veralteter Eintrag)", () => {
    expect(checkWrite({ data: [], error: null })).toEqual({ ok: false, reason: "no-rows" });
    expect(checkWrite({ data: null, error: null })).toEqual({ ok: false, reason: "no-rows" });
    expect(checkWrite({ data: [{ id: "x" }], error: null })).toEqual({ ok: true });
    expect(checkWrite({ data: null, error: { code: "42501" } })).toEqual({ ok: false, reason: "error" });
    expect(checkWrite({ data: null, error: null }, false)).toEqual({ ok: true });
  });
  it("liefert verstaendliche Texte", () => {
    expect(writeErrorText({ ok: false, reason: "no-rows" }, "Ziel")).toContain("nichts geändert");
    expect(writeErrorText({ ok: false, reason: "error" }, "Ziel")).toContain("Eingaben bleiben erhalten");
  });
});
