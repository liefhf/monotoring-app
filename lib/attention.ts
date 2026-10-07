import type { Flag } from "@/lib/monitoring";

/*
 * Zusammenfassung "Aufmerksamkeit" fuer das Coach-Dashboard.
 * Ein Eintrag je Athlet: zuerst Trainingsfaehigkeit/Einschraenkung/
 * Freigabe (Gesundheit), danach ergaenzende Angaben (Schmerz, Befinden ...).
 * Es wird nichts fachlich verschmolzen - nur pro Athlet gruppiert und
 * nach Dringlichkeit sortiert. Keine Empfehlung, sondern ein direkter Weg.
 */

export type AttentionRow = {
  id: string;
  name: string;
  flags: Flag[];
  hasLogin: boolean;
  checkInToday: boolean;
  acwr: { zone: string };
};

export type AttentionItem = {
  id: string;
  name: string;
  level: "rot" | "gelb";
  headline: string;
  details: string[];
  href: string;
  linkLabel: string;
};

const KIND_ORDER: Flag["kind"][] = ["gesundheit", "schmerz", "befinden", "acwr", "checkin", "anwesenheit"];
const TARGET: Record<Flag["kind"], { tab: string; label: string }> = {
  gesundheit: { tab: "gesundheit", label: "Einschränkung ansehen" },
  schmerz: { tab: "gesundheit", label: "Schmerzmeldung ansehen" },
  befinden: { tab: "befinden", label: "Befinden ansehen" },
  acwr: { tab: "befinden", label: "Belastung ansehen" },
  checkin: { tab: "befinden", label: "Check-ins ansehen" },
  anwesenheit: { tab: "ueberblick", label: "Anwesenheit ansehen" },
};

function sortFlags(flags: Flag[]) {
  return [...flags].sort(
    (a, b) => (a.level === b.level ? 0 : a.level === "rot" ? -1 : 1) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
  );
}

export function attentionItems(rows: AttentionRow[]): AttentionItem[] {
  return rows
    .filter((row) => row.flags.length)
    .map((row) => {
      // Gesundheit steht vor allem anderen, auch vor gleich dringenden Hinweisen
      const flags = sortFlags(row.flags);
      const health = flags.filter((flag) => flag.kind === "gesundheit");
      const first = health[0] ?? flags[0];
      const rest = flags.filter((flag) => flag !== first);
      const level = flags.some((flag) => flag.level === "rot") ? "rot" : "gelb";
      return {
        id: row.id,
        name: row.name,
        level,
        headline: first.text,
        details: rest.map((flag) => flag.text),
        href: `/coach/schwimmer/${row.id}?tab=${TARGET[first.kind].tab}`,
        linkLabel: TARGET[first.kind].label,
      } as AttentionItem;
    })
    .sort((a, b) => (a.level === b.level ? b.details.length - a.details.length || a.name.localeCompare(b.name, "de") : a.level === "rot" ? -1 : 1));
}

/* Fehlende Daten konkret benennen (keine Sammelkategorie "ohne Daten") */
export function dataGaps(rows: AttentionRow[], incomplete: string[]): string[] {
  const gaps = incomplete.map((label) => `${label}: nicht geladen`);
  const noCheckIn = rows.filter((row) => row.hasLogin && !row.checkInToday).length;
  const noLogin = rows.filter((row) => !row.hasLogin).length;
  const noLoadBasis = rows.filter((row) => row.acwr.zone === "zu-wenig-daten").length;
  if (noCheckIn) gaps.push(`${noCheckIn} ohne Check-in heute`);
  if (noLogin) gaps.push(`${noLogin} ohne eigenen Login (kein Check-in möglich)`);
  if (noLoadBasis) gaps.push(`${noLoadBasis} mit zu wenig Daten für einen Belastungsvergleich`);
  return gaps;
}
