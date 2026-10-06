/*
 * Stoppuhr-Logik fuer den Beckenrand (ohne React, damit testbar).
 * Zeiten werden als Zeitstempel gespeichert (Date.now), damit sie ein
 * Neuladen oder Sperren des Handys ueberstehen.
 */

export type Lane = {
  id: string;
  swimmerId: string;
  distance: number;
  stroke: string;
  /* Startzeitpunkt (ms seit 1970) - null = nicht gestartet */
  startedAt: number | null;
  /* kumulierte Zwischenzeiten in ms ab Start */
  splits: number[];
  /* Endzeit in ms ab Start - null = laeuft noch */
  finalMs: number | null;
  saved: boolean;
};

/* Handzeit auf Hundertstel runden */
export const toHundredths = (ms: number) => Math.round(ms / 10) * 10;

export function elapsed(lane: Lane, now: number) {
  if (lane.startedAt === null) return 0;
  if (lane.finalMs !== null) return lane.finalMs;
  return now - lane.startedAt;
}

export function startLane(lane: Lane, at: number): Lane {
  if (lane.startedAt !== null) return lane;
  return { ...lane, startedAt: at, splits: [], finalMs: null, saved: false };
}

/*
 * Split antippen. Schutz gegen Doppeltippen mit nassen Fingern:
 * ein zweiter Tipp innerhalb von 3 s nach dem letzten zaehlt nicht.
 */
export const MIN_SPLIT_GAP_MS = 3000;

export function addSplit(lane: Lane, at: number): Lane {
  if (lane.startedAt === null || lane.finalMs !== null) return lane;
  const value = toHundredths(at - lane.startedAt);
  const last = lane.splits[lane.splits.length - 1] ?? 0;
  if (value - last < MIN_SPLIT_GAP_MS) return lane;
  return { ...lane, splits: [...lane.splits, value] };
}

export function finishLane(lane: Lane, at: number): Lane {
  if (lane.startedAt === null || lane.finalMs !== null) return lane;
  const value = toHundredths(at - lane.startedAt);
  const last = lane.splits[lane.splits.length - 1] ?? 0;
  if (value - last < MIN_SPLIT_GAP_MS) {
    /* Letzter Split war eigentlich der Anschlag -> als Endzeit werten */
    return { ...lane, finalMs: last, splits: lane.splits.slice(0, -1) };
  }
  return { ...lane, finalMs: value };
}

/* Letzten Tipp zuruecknehmen: erst Endzeit, dann den letzten Split */
export function undoLane(lane: Lane): Lane {
  if (lane.finalMs !== null) return { ...lane, finalMs: null };
  if (lane.splits.length) return { ...lane, splits: lane.splits.slice(0, -1) };
  return { ...lane, startedAt: null };
}

export function resetLane(lane: Lane): Lane {
  return { ...lane, startedAt: null, splits: [], finalMs: null, saved: false };
}

/* Erwartete Zahl an Durchgangszeiten (je Bahn), z. B. 100 m auf 25 m -> 3 */
export function expectedSplits(distance: number, poolLength: number) {
  return Math.max(0, Math.round(distance / poolLength) - 1);
}

/* Teilzeiten je Abschnitt aus kumulierten Zeiten */
export function laps(splits: number[], finalMs: number | null) {
  const all = finalMs !== null ? [...splits, finalMs] : splits;
  return all.map((value, index) => value - (index === 0 ? 0 : all[index - 1]));
}
