import { describe, expect, it } from "vitest";
import {
  CalendarEntry,
  entryOnDay,
  formatFileSize,
  getMonthGrid,
  isRegistrationOpen,
  isoToLocalParts,
  localToIso,
  toDateKey,
} from "@/lib/community";

const entry = (overrides: Partial<CalendarEntry> = {}): CalendarEntry => ({
  id: "e",
  coach_id: "c",
  team_id: null,
  title: "Termin",
  description: null,
  location: null,
  category: "training",
  visibility: "team",
  starts_at: localToIso("2026-10-05", "17:00"),
  ends_at: localToIso("2026-10-05", "19:00"),
  all_day: false,
  registration_enabled: false,
  registration_deadline: null,
  max_participants: null,
  fee_note: null,
  ...overrides,
});

describe("Monatsraster", () => {
  it("beginnt montags und enthaelt den ganzen Monat", () => {
    const weeks = getMonthGrid(2026, 8); // September 2026
    expect(weeks[0][0].getDay()).toBe(1);
    const days = weeks.flat().filter((day) => day.getMonth() === 8);
    expect(days).toHaveLength(30);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it("laesst eine leere sechste Woche weg", () => {
    expect(getMonthGrid(2026, 1).length).toBeLessThanOrEqual(5); // Februar 2026 beginnt montags
  });
});

describe("Termine", () => {
  it("liegt an allen Tagen eines mehrtaegigen Termins", () => {
    const camp = entry({ starts_at: localToIso("2026-10-05", "00:00"), ends_at: localToIso("2026-10-08", "23:59"), all_day: true });
    expect(entryOnDay(camp, "2026-10-04")).toBe(false);
    expect(entryOnDay(camp, "2026-10-05")).toBe(true);
    expect(entryOnDay(camp, "2026-10-08")).toBe(true);
    expect(entryOnDay(camp, "2026-10-09")).toBe(false);
  });

  it("rechnet Formularwerte hin und zurueck", () => {
    expect(isoToLocalParts(localToIso("2026-10-05", "17:30"))).toEqual(["2026-10-05", "17:30"]);
    expect(isoToLocalParts(null)).toEqual(["", ""]);
    expect(toDateKey(new Date(2026, 0, 9))).toBe("2026-01-09");
  });

  it("prueft ob die Anmeldung offen ist", () => {
    const future = new Date(Date.now() + 7 * 86400000).toISOString();
    const past = new Date(Date.now() - 86400000).toISOString();

    expect(isRegistrationOpen(entry({ starts_at: future }))).toBe(false);
    expect(isRegistrationOpen(entry({ starts_at: future, registration_enabled: true }))).toBe(true);
    expect(isRegistrationOpen(entry({ starts_at: future, registration_enabled: true, registration_deadline: past }))).toBe(false);
    expect(isRegistrationOpen(entry({ starts_at: past, registration_enabled: true }))).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("waehlt eine lesbare Einheit", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2 KB");
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe("5,5 MB");
    expect(formatFileSize(null)).toBe("");
  });
});
