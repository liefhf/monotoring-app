/*
 * Ergebnisprotokolle (Text aus PDF oder kopiert) auswerten.
 *
 * Ausgelegt auf die verbreiteten DSV-Protokolle (u. a. EasyWK):
 *
 *   Wettkampf 3 - 100m Freistil weiblich
 *   1. Mustermann, Lena        2010  SV Musterstadt      1:02,45   512
 *      50m: 30,12   100m: 1:02,45
 *   Mustermann, Anna           2011  SG Beispiel        disq.
 *
 * Protokolle sehen je nach Software unterschiedlich aus. Der Parser
 * ist deshalb bewusst tolerant und die Oberflaeche zeigt vor dem
 * Speichern eine Vorschau zum Pruefen.
 */
import type { Stroke, Swimmer } from "@/lib/swim";
import { parseSwimTimeToMs } from "@/lib/swim";
import { strokeFromText } from "@/lib/competitionFeedback";

export type ProtocolEvent = {
  eventNumber: number | null;
  distance: number;
  stroke: Stroke;
  gender: "female" | "male" | "mixed" | null;
  round: string | null;
  isRelay: boolean;
};

export type ProtocolResult = {
  event: ProtocolEvent;
  placement: number | null;
  lastName: string;
  firstName: string;
  birthYear: number | null;
  club: string;
  timeMs: number | null;
  points: number | null;
  status: "ok" | "dsq" | "dns" | "dnf";
  splitsMs: number[];
  line: string;
};

const TIME = String.raw`(?:\d{1,2}:)?\d{1,2}[,.]\d{2}`;

/* "Wettkampf 3 - 100m Freistil weiblich", "WK 12: 4x50m Lagen mixed Finale" */
const EVENT_RE = new RegExp(
  String.raw`^\s*(?:Wettkampf|WK|Wettk\.)\s*(\d{1,4})?\s*[-–:.]?\s*(?:(\d+)\s*[xX×]\s*)?(\d{2,4})\s*m\b\s*(.*)$`,
  "i"
);

/* Ergebniszeile mit Platz, Name, Jahrgang, Verein, Zeit, Punkte */
const RESULT_RE = new RegExp(
  String.raw`^\s*(?:(\d{1,3})\s*[.)]\s*)?` + // Platz
    String.raw`([A-Za-zÀ-ÖØ-öø-ÿ'’\- ]+?),\s*([A-Za-zÀ-ÖØ-öø-ÿ'’\- ]+?)\s+` + // Nachname, Vorname
    String.raw`(\d{4}|\d{2})\s+` + // Jahrgang
    String.raw`(.+?)\s+` + // Verein
    String.raw`(${TIME}|disq\.?|dsq|disqualifiziert|n\.?\s?a\.?|nicht angetreten|dns|aufg\.?|aufgegeben|dnf)` + // Zeit/Status
    String.raw`(?:\s+(\d{1,4}))?` + // Punkte
    String.raw`\b.*$`,
  "i"
);

function detectGender(text: string): ProtocolEvent["gender"] {
  if (/\b(weiblich|damen|frauen|w)\b/i.test(text)) return "female";
  if (/\b(männlich|maennlich|herren|männer|m)\b/i.test(text)) return "male";
  if (/\b(mixed|gemischt|mix)\b/i.test(text)) return "mixed";

  return null;
}

function detectRound(text: string) {
  if (/vorlauf|vorläufe/i.test(text)) return "Vorlauf";
  if (/zwischenlauf|halbfinale/i.test(text)) return "Zwischenlauf";
  if (/finale|endlauf/i.test(text)) return "Finale";

  return null;
}

function statusFrom(value: string): ProtocolResult["status"] {
  const lower = value.toLowerCase().replace(/\s/g, "");

  if (lower.startsWith("disq") || lower === "dsq" || lower.startsWith("disqualifiziert")) return "dsq";
  if (lower.startsWith("n.a") || lower.startsWith("na") || lower.startsWith("nicht") || lower === "dns") return "dns";
  if (lower.startsWith("aufg") || lower === "dnf") return "dnf";

  return "ok";
}

/* Zwischenzeiten-Zeile: "50m: 30,12  100m: 1:02,45" oder nur mehrere Zeiten */
function parseSplitLine(line: string) {
  if (RESULT_RE.test(line) || EVENT_RE.test(line)) return null;

  const labelled = [...line.matchAll(new RegExp(String.raw`(\d{2,4})\s*m\s*:?\s*(${TIME})`, "gi"))];

  if (labelled.length > 0) {
    return labelled.map((match) => parseSwimTimeToMs(match[2])).filter((ms): ms is number => ms !== null);
  }

  const bare = [...line.matchAll(new RegExp(String.raw`(?:^|\s)(${TIME})(?=\s|$)`, "g"))];

  /* Nur Zeilen, die fast ausschliesslich aus Zeiten bestehen */
  if (bare.length >= 2 && line.replace(new RegExp(TIME, "g"), "").replace(/[\s()|/]/g, "").length <= 4) {
    return bare.map((match) => parseSwimTimeToMs(match[1])).filter((ms): ms is number => ms !== null);
  }

  return null;
}

export function parseResultProtocol(text: string) {
  const lines = text
    .replace(/\r/g, "\n")
    .replace(/ /g, " ")
    .replace(/\t/g, " ")
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trimEnd());

  const results: ProtocolResult[] = [];
  const events: ProtocolEvent[] = [];
  let current: ProtocolEvent | null = null;
  let last: ProtocolResult | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const eventMatch = line.match(EVENT_RE);

    if (eventMatch) {
      const rest = eventMatch[4] ?? "";
      const stroke = strokeFromText(rest);

      if (stroke) {
        current = {
          eventNumber: eventMatch[1] ? Number(eventMatch[1]) : null,
          distance: Number(eventMatch[3]),
          stroke,
          gender: detectGender(rest),
          round: detectRound(rest),
          isRelay: Boolean(eventMatch[2]),
        };
        events.push(current);
        last = null;
        continue;
      }
    }

    /* Lauf-Hinweis in einer eigenen Zeile unter der Ueberschrift */
    if (current && !current.round && /^\s*(vorl[aä]uf|finale|endlauf|zwischenlauf)/i.test(line)) {
      current.round = detectRound(line);
      continue;
    }

    if (!current || current.isRelay) continue;

    const resultMatch = line.match(RESULT_RE);

    if (resultMatch) {
      const status = statusFrom(resultMatch[6]);
      const year = Number(resultMatch[4]);

      last = {
        event: current,
        placement: resultMatch[1] ? Number(resultMatch[1]) : null,
        lastName: resultMatch[2].trim(),
        firstName: resultMatch[3].trim(),
        birthYear: resultMatch[4].length === 2 ? (year > 50 ? 1900 + year : 2000 + year) : year,
        club: resultMatch[5].trim(),
        timeMs: status === "ok" ? parseSwimTimeToMs(resultMatch[6]) : null,
        points: resultMatch[7] ? Number(resultMatch[7]) : null,
        status,
        splitsMs: [],
        line: line.trim(),
      };
      results.push(last);
      continue;
    }

    if (last) {
      const splits = parseSplitLine(line);

      if (splits && splits.length > 0) {
        /* Endzeit selbst nicht als Zwischenzeit speichern */
        last.splitsMs.push(...splits.filter((ms) => ms !== last!.timeMs));
      }
    }
  }

  return { events, results };
}

/* ------------------------------------------------------------------ */
/* Zuordnung zu den eigenen Schwimmern                                 */
/* ------------------------------------------------------------------ */

export function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

export type SwimmerMatch = { swimmer: Swimmer; certainty: "sicher" | "wahrscheinlich" } | null;

/*
 * Vor- und Nachname gleich -> sicher.
 * Nur Vorname bekannt (so legt man Schwimmer oft zuerst an) und
 * Jahrgang passt -> wahrscheinlich. Mehrdeutige Treffer -> keiner.
 */
export function matchSwimmer(result: ProtocolResult, swimmers: Swimmer[]): SwimmerMatch {
  const first = normalizeName(result.firstName);
  const last = normalizeName(result.lastName);

  const exact = swimmers.filter(
    (swimmer) =>
      normalizeName(swimmer.first_name) === first &&
      swimmer.last_name &&
      normalizeName(swimmer.last_name) === last &&
      (!swimmer.birth_year || !result.birthYear || swimmer.birth_year === result.birthYear)
  );

  if (exact.length === 1) return { swimmer: exact[0], certainty: "sicher" };

  const byFirstName = swimmers.filter(
    (swimmer) =>
      normalizeName(swimmer.first_name) === first &&
      !swimmer.last_name &&
      (!swimmer.birth_year || !result.birthYear || swimmer.birth_year === result.birthYear)
  );

  if (byFirstName.length === 1) return { swimmer: byFirstName[0], certainty: "wahrscheinlich" };

  return null;
}
