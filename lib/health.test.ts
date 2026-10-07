import { describe, expect, it } from "vitest";
import { currentAvailability, healthStatusLabel, documentStatus, healthFlags, HealthEvent } from "@/lib/health";

const base: HealthEvent = {
  id: "1",
  swimmer_id: "s",
  kind: "verletzung",
  title: "Schulter rechts",
  body_region: "Schulter",
  availability: "eingeschraenkt",
  restriction: "kein Delfin",
  start_date: "2026-10-01",
  end_date: null,
  clearance: "nicht_noetig",
  note: null,
  visible_to_athlete: true,
};

describe("health", () => {
  it("nimmt die staerkste laufende Einschraenkung", () => {
    expect(currentAvailability([base], "2026-10-07")).toBe("eingeschraenkt");
    expect(currentAvailability([base, { ...base, id: "2", availability: "pause" }], "2026-10-07")).toBe("pause");
    expect(currentAvailability([{ ...base, end_date: "2026-10-03" }], "2026-10-07")).toBe("voll");
  });

  it("haelt eine offene Freigabe auch nach Ende als Einschraenkung", () => {
    const ended = { ...base, end_date: "2026-10-03", clearance: "offen" as const };
    expect(currentAvailability([ended], "2026-10-07")).toBe("eingeschraenkt");
    expect(healthFlags([ended], "2026-10-07").map((flag) => flag.text)).toEqual(["Freigabe ausstehend: Schulter rechts"]);
  });

  it("ein heute beendeter Eintrag erzeugt keinen Hinweis mehr", () => {
    const ended = { ...base, availability: "voll" as const, end_date: "2026-10-07" };
    expect(healthFlags([ended], "2026-10-07")).toEqual([]);
    expect(currentAvailability([ended], "2026-10-07")).toBe("voll");
  });

  it("meldet eine Trainingspause rot mit Dauer", () => {
    const flags = healthFlags([{ ...base, availability: "pause" }], "2026-10-07");
    expect(flags[0]).toMatchObject({ level: "rot", text: "Trainingspause: Schulter rechts (seit 7 Tagen)" });
  });

  it("erinnert 30 Tage vor Ablauf eines Dokuments", () => {
    expect(documentStatus({ valid_until: null }, "2026-10-07").status).toBe("unbefristet");
    expect(documentStatus({ valid_until: "2026-10-20" }, "2026-10-07")).toEqual({ status: "laeuft_ab", daysLeft: 13 });
    expect(documentStatus({ valid_until: "2026-10-01" }, "2026-10-07").status).toBe("abgelaufen");
    expect(documentStatus({ valid_until: "2027-03-01" }, "2026-10-07").status).toBe("gueltig");
  });
});

describe("healthStatusLabel", () => {
  it("zeigt bei Ladefehler nie 'voll trainingsfaehig'", () => {
    const label = healthStatusLabel({ status: "error" }, "2026-10-07");
    expect(label.availability).toBeNull();
    expect(label.text).toBe("Gesundheitsstatus konnte nicht geladen werden");
    expect(healthStatusLabel({ status: "missing" }, "2026-10-07").availability).toBeNull();
    expect(healthStatusLabel({ status: "loading" }, "2026-10-07").availability).toBeNull();
  });
  it("leere Liste nach erfolgreichem Laden = voll", () => {
    expect(healthStatusLabel({ status: "ready", data: [] }, "2026-10-07").availability).toBe("voll");
  });
});
