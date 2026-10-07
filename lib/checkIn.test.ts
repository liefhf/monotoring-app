import { describe, expect, it } from "vitest";
import { painAnswerFromEntry, withoutPainAnswer } from "./checkIn";

describe("Schmerzfrage", () => {
  it("nimmt nie automatisch 'nein' an", () => {
    expect(painAnswerFromEntry({ has_pain: false })).toBeNull();
    expect(painAnswerFromEntry({ has_pain: null })).toBeNull();
    expect(painAnswerFromEntry({ has_pain: true })).toBe("ja");
    expect(painAnswerFromEntry({ has_pain: false, pain_answer: "nein" })).toBe("nein");
    expect(painAnswerFromEntry({ has_pain: false, pain_answer: "keine_angabe" })).toBe("keine_angabe");
  });
  it("erkennt fehlende Spalte", () => {
    expect(withoutPainAnswer({ code: "PGRST204", message: "Could not find the 'pain_answer' column" })).toBe(true);
    expect(withoutPainAnswer({ code: "42501", message: "denied" })).toBe(false);
  });
});
