import {
  NonFinish,
  QualifyingStandard,
  QualifyingTime,
  STROKES,
  SwimEvent,
  Swimmer,
  SwimmerResult,
  findBestForStandard,
  findBestResult,
  findQualifyingTime,
} from "@/lib/swim";
import { AthleteFocus, FocusRole, parseFocusKey } from "@/lib/trainingFocus";

/*
 * "Bis zum naechsten Wettkampf" je Athlet - kompakt, ohne Punkte:
 * Fokus-Strecken mit aktueller 25m- und 50m-Bestzeit (Monat/Jahr),
 * Pflichtzeit und Abstand, dazu Disqualifikationen.
 */

export type SheetRow = {
  event: SwimEvent;
  role: FocusRole | null;
  best25: SwimmerResult | null;
  best50: SwimmerResult | null;
  requiredMs: number | null;
  /* Abstand der fuer die Pflichtzeit zaehlenden Bestzeit (negativ = erfuellt) */
  gapMs: number | null;
};

export type AthleteSheet = {
  swimmer: Swimmer;
  rows: SheetRow[];
  disqualifications: NonFinish[];
};

const STROKE_ORDER = STROKES.map((stroke) => stroke.value);

export function buildAthleteSheet({
  swimmer,
  results,
  focus,
  fallbackEvents,
  standard,
  standardTimes,
  nonFinishes,
  today,
}: {
  swimmer: Swimmer;
  results: SwimmerResult[];
  focus: AthleteFocus | null;
  /* ohne Fokus: z. B. die Strecken, die beim Wettkampf geschwommen wurden */
  fallbackEvents: SwimEvent[];
  standard: QualifyingStandard | null;
  standardTimes: QualifyingTime[];
  nonFinishes: NonFinish[];
  today: string;
}): AthleteSheet {
  const own = results.filter((result) => result.swimmer_id === swimmer.id);
  const entries: { event: SwimEvent; role: FocusRole | null }[] = focus?.events?.length
    ? focus.events.map(parseFocusKey)
    : fallbackEvents.map((event) => ({ event, role: null }));

  const rows = entries
    .map(({ event, role }) => {
      const required = standard ? findQualifyingTime(standardTimes, swimmer, event) : null;
      const counting = standard && required ? findBestForStandard(own, event, standard) : null;
      return {
        event,
        role,
        best25: findBestResult(own, event, 25),
        best50: findBestResult(own, event, 50),
        requiredMs: required?.time_ms ?? null,
        gapMs: required && counting ? counting.time_ms - required.time_ms : null,
      };
    })
    .sort(
      (a, b) =>
        (a.role === "neben" ? 1 : 0) - (b.role === "neben" ? 1 : 0) ||
        STROKE_ORDER.indexOf(a.event.stroke) - STROKE_ORDER.indexOf(b.event.stroke) ||
        a.event.distance - b.event.distance
    );

  const yearAgo = new Date(Date.parse(today) - 365 * 86_400_000).toISOString().slice(0, 10);
  const disqualifications = nonFinishes.filter(
    (entry) => entry.swimmer_id === swimmer.id && entry.status === "DS" && entry.result_date >= yearAgo
  );

  return { swimmer, rows, disqualifications };
}

/* "2026-09-01" -> "09/26" */
export function monthYearShort(date: string) {
  return `${date.slice(5, 7)}/${date.slice(2, 4)}`;
}
