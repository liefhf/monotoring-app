import { describe, expect, it } from "vitest";
import { attentionItems, dataGaps } from "./attention";
import type { Flag } from "./monitoring";

const flag = (kind: Flag["kind"], level: Flag["level"], text: string): Flag => ({ kind, level, text, reason: "", check: "" });
const row = (id: string, flags: Flag[], extra = {}) => ({ id, name: id, flags, hasLogin: true, checkInToday: true, acwr: { zone: "ueblich" }, ...extra });

describe("attentionItems", () => {
  it("gruppiert je Athlet, Gesundheit zuerst, Schmerz als Ergaenzung", () => {
    const [item] = attentionItems([row("Mia", [flag("schmerz", "rot", "Schmerzen Schulter rechts: 6/10"), flag("gesundheit", "rot", "Trainingspause: Schulter rechts")])]);
    expect(item.headline).toBe("Trainingspause: Schulter rechts");
    expect(item.details).toEqual(["Schmerzen Schulter rechts: 6/10"]);
    expect(item.href).toBe("/coach/schwimmer/Mia?tab=gesundheit");
    expect(item.linkLabel).toBe("Einschränkung ansehen");
  });
  it("sortiert kritisch vor beachten, laesst Unauffaellige weg", () => {
    const items = attentionItems([row("A", [flag("checkin", "gelb", "x")]), row("B", [flag("befinden", "rot", "y")]), row("C", [])]);
    expect(items.map((i) => i.id)).toEqual(["B", "A"]);
  });
});

describe("dataGaps", () => {
  it("nennt fehlende Daten getrennt statt 'ohne Daten'", () => {
    const gaps = dataGaps(
      [row("A", [], { checkInToday: false }), row("B", [], { hasLogin: false, checkInToday: false }), row("C", [], { acwr: { zone: "zu-wenig-daten" } })],
      ["Gesundheit"]
    );
    expect(gaps).toEqual(["Gesundheit: nicht geladen", "1 ohne Check-in heute", "1 ohne eigenen Login (kein Check-in möglich)", "1 mit zu wenig Daten für einen Belastungsvergleich"]);
  });
});
