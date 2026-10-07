import { describe, expect, it } from "vitest";
import { feedbackDue, msUntilMidnight, sessionPhase, weekRange } from "./sessionTiming";

const at = (s: string) => new Date(s); // lokale Zeit
const s = (date: string, time: string | null, dur: number | null = 90, id = "a") => ({ id, session_date: date, start_time: time, duration_minutes: dur });

describe("sessionPhase", () => {
  it("unterscheidet bevorstehend / laeuft / beendet am selben Tag", () => {
    expect(sessionPhase(s("2026-10-07", "17:00:00"), at("2026-10-07T16:59:00"))).toBe("upcoming");
    expect(sessionPhase(s("2026-10-07", "17:00:00"), at("2026-10-07T17:30:00"))).toBe("running");
    expect(sessionPhase(s("2026-10-07", "17:00:00"), at("2026-10-07T18:31:00"))).toBe("finished");
  });
  it("zwei Einheiten am Tag: Morgen beendet, Abend kommt noch", () => {
    const now = at("2026-10-07T12:00:00");
    expect(sessionPhase(s("2026-10-07", "06:30:00", 60), now)).toBe("finished");
    expect(sessionPhase(s("2026-10-07", "17:00:00", 90), now)).toBe("upcoming");
  });
  it("ohne Startzeit: heute laufend, gestern beendet", () => {
    expect(sessionPhase(s("2026-10-07", null), at("2026-10-07T23:59:00"))).toBe("running");
    expect(sessionPhase(s("2026-10-06", null), at("2026-10-07T00:00:30"))).toBe("finished");
  });
  it("Einheit ueber Mitternacht", () => {
    expect(sessionPhase(s("2026-10-07", "23:30:00", 60), at("2026-10-08T00:15:00"))).toBe("running");
  });
});

describe("feedbackDue", () => {
  const opts = { given: new Set<string>(), absent: new Set<string>() };
  it("nicht beim Trainingsstart, erst nach dem Ende", () => {
    expect(feedbackDue(s("2026-10-07", "17:00:00"), at("2026-10-07T17:05:00"), opts)).toBe(false);
    expect(feedbackDue(s("2026-10-07", "17:00:00"), at("2026-10-07T18:45:00"), opts)).toBe(true);
  });
  it("nicht bei Abwesenheit und nicht doppelt", () => {
    const now = at("2026-10-07T20:00:00");
    expect(feedbackDue(s("2026-10-07", "17:00:00"), now, { given: new Set(["a"]), absent: new Set() })).toBe(false);
    expect(feedbackDue(s("2026-10-07", "17:00:00"), now, { given: new Set(), absent: new Set(["a"]) })).toBe(false);
  });
  it("nicht fuer alte Einheiten", () => {
    expect(feedbackDue(s("2026-09-30", "17:00:00"), at("2026-10-07T20:00:00"), opts)).toBe(false);
  });
});

describe("Kalender", () => {
  it("Woche Montag bis Sonntag, auch am Sonntag", () => {
    expect(weekRange(at("2026-10-07T10:00:00"))).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(weekRange(at("2026-10-11T23:00:00"))).toEqual({ from: "2026-10-05", to: "2026-10-11" });
  });
  it("Zeit bis Mitternacht", () => {
    expect(msUntilMidnight(at("2026-10-07T23:59:00"))).toBe(61_000);
  });
});

import { newsLabel } from "./sessionTiming";
describe("newsLabel", () => {
  it("alte angeheftete Nachricht ist nicht 'neu'", () => {
    const now = at("2026-10-07T12:00:00");
    expect(newsLabel({ created_at: "2026-10-05T10:00:00Z", pinned: false }, now)).toBe("Neu vom Trainer");
    expect(newsLabel({ created_at: "2026-08-01T10:00:00Z", pinned: true }, now)).toBe("Wichtige Nachricht");
    expect(newsLabel({ created_at: "2026-08-01T10:00:00Z", pinned: false }, now)).toBeNull();
  });
});
