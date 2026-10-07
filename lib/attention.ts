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
  /* eine kurze Zeile, z. B. "Eingeschränkt · Schulter rechts · Schmerz 6/10" */
  short: string;
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
        short: shortLine([shortFlag(first), ...rest.map(shortFlag)]),
        headline: first.text,
        details: rest.map((flag) => flag.text),
        href: `/coach/schwimmer/${row.id}?tab=${TARGET[first.kind].tab}`,
        linkLabel: TARGET[first.kind].label,
      } as AttentionItem;
    })
    .sort((a, b) => (a.level === b.level ? b.details.length - a.details.length || a.name.localeCompare(b.name, "de") : a.level === "rot" ? -1 : 1));
}

/* Kurzform eines Hinweises fuer Uebersichten (Langtext bleibt in der Detailansicht) */
/* Kurzzeile: doppelte Teile nur einmal, hoechstens vier, Rest als Anzahl (nichts verschwindet stillschweigend) */
function shortLine(labels: string[]) {
  const parts = [...new Set(labels.flatMap((label) => label.split(" · ")))];
  return parts.length > 4 ? `${parts.slice(0, 4).join(" · ")} · +${parts.length - 4}` : parts.join(" · ");
}

export function shortFlag(flag: Flag): string {
  const t = flag.text;
  switch (flag.kind) {
    case "gesundheit":
      return t.replace(/ \(seit .*\)$/, "").replace(/ – .*$/, "").replace(": ", " · ");
    case "schmerz": {
      const m = /(\d+)\/10/.exec(t);
      return `Schmerz ${m ? m[1] + "/10" : ""}${/zunehmend/.test(t) ? " ↑" : ""}`.trim();
    }
    case "befinden":
      return /mehreren Tagen/.test(t) ? "Befinden seit Tagen ↓" : "Befinden ↓";
    case "checkin": {
      const m = /(\d+)/.exec(t);
      return m ? `${m[1]} Tage ohne Check-in` : "Check-in fehlt";
    }
    case "acwr": {
      const m = /(\d+) %/.exec(t);
      return m ? `Belastung +${m[1]} %` : "Belastung ↑";
    }
    case "anwesenheit": {
      const m = /(\d+) %/.exec(t);
      return m ? `Anwesenheit ${m[1]} %` : "Anwesenheit niedrig";
    }
  }
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
