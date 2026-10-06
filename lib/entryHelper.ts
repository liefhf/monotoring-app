import {
  QualifyingStandard,
  QualifyingTime,
  SwimEvent,
  Swimmer,
  SwimmerResult,
  findBestForStandard,
  findQualifyingTime,
} from "@/lib/swim";
import { AthleteFocus, FocusRole, focusRole } from "@/lib/trainingFocus";

/*
 * Meldehilfe: Welche Strecken sollte ein Athlet fuer einen Wettkampf melden?
 * Grundlage ist eine Pflichtzeiten-Liste (Qualifikationszeitraum, 25m/50m).
 *   erfuellt  -> melden (Meldezeit = Bestzeit im Zeitraum)
 *   knapp     -> bis 3 % ueber der Pflichtzeit: melden, wenn Fokus-Strecke
 *                (Meldungen ohne Nachweis sind laut Ausschreibung moeglich,
 *                koennen aber ein erhoehtes Meldegeld ausloesen)
 * Reihenfolge: erfuellt vor knapp, Haupt- vor Nebenstrecke, dann Abstand.
 * Die Hoechstzahl an Einzelstarts begrenzt die Vorschlaege.
 */

export type EntryStatus = "erfuellt" | "knapp";

export type EntrySuggestion = {
  event: SwimEvent;
  status: EntryStatus;
  role: FocusRole | null;
  best: SwimmerResult;
  requiredMs: number;
  gapMs: number;
  recommended: boolean;
};

const KNAPP = 0.03;

export function suggestEntries({
  swimmer,
  results,
  focus,
  standard,
  standardTimes,
  events,
  maxStarts,
}: {
  swimmer: Swimmer;
  results: SwimmerResult[];
  focus: AthleteFocus | null;
  standard: QualifyingStandard;
  standardTimes: QualifyingTime[];
  events: SwimEvent[];
  maxStarts: number;
}): EntrySuggestion[] {
  const candidates: EntrySuggestion[] = [];
  for (const event of events) {
    const required = findQualifyingTime(standardTimes, swimmer, event);
    if (!required) continue;
    const best = findBestForStandard(results, event, standard);
    if (!best) continue;
    const gapMs = best.time_ms - required.time_ms;
    const share = gapMs / required.time_ms;
    const role = focusRole(event, focus);
    if (gapMs <= 0) candidates.push({ event, status: "erfuellt", role, best, requiredMs: required.time_ms, gapMs, recommended: false });
    else if (share <= KNAPP) candidates.push({ event, status: "knapp", role, best, requiredMs: required.time_ms, gapMs, recommended: false });
  }

  const roleRank = (role: FocusRole | null) => (role === "haupt" ? 0 : role === "neben" ? 1 : 2);
  candidates.sort(
    (a, b) =>
      Number(a.status === "knapp") - Number(b.status === "knapp") ||
      roleRank(a.role) - roleRank(b.role) ||
      a.gapMs / a.requiredMs - b.gapMs / b.requiredMs
  );

  let count = 0;
  for (const candidate of candidates) {
    const allowed = candidate.status === "erfuellt" || candidate.role !== null;
    if (allowed && count < maxStarts) {
      candidate.recommended = true;
      count += 1;
    }
  }
  return candidates;
}
