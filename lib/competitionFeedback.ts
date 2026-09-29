/*
 * Wettkampf-Feedback: Typen und Auswertung.
 * Reine Rechenfunktionen ohne Datenbankzugriff, damit
 * sie sich leicht pruefen lassen.
 */
import type {
  PoolLength,
  QualifyingTime,
  Stroke,
  Swimmer,
  SwimmerResult,
} from "@/lib/swim";
import { findQualifyingTime } from "@/lib/swim";

export type StartStatus = "ok" | "dsq" | "dns" | "dnf";

export type CompetitionStart = {
  id: string;
  /* Technikfehler per Klick (Spalte faults, supabase/wettkampf_fehler.sql) */
  faults?: { code: string; segment: string }[] | null;
  competition_id: string;
  swimmer_id: string;
  event_id: string | null;
  start_date: string;
  pool_length: PoolLength;
  distance: number;
  stroke: Stroke;
  round: string | null;
  entry_time_ms: number | null;
  goal_time_ms: number | null;
  time_ms: number | null;
  split_times_ms: number[];
  status: StartStatus;
  placement: number | null;
  points: number | null;
  rating_start: number | null;
  rating_turns: number | null;
  rating_underwater: number | null;
  rating_technique: number | null;
  rating_pacing: number | null;
  rating_finish: number | null;
  went_well: string | null;
  to_improve: string | null;
  coach_note: string | null;
  shared_with_athlete: boolean;
  athlete_feeling: number | null;
  athlete_effort: number | null;
  athlete_nervousness: number | null;
  athlete_note: string | null;
  athlete_updated_at: string | null;
  result_id: string | null;
};

export const START_COLUMNS =
  "id, competition_id, swimmer_id, event_id, start_date, pool_length, distance, stroke, round, entry_time_ms, goal_time_ms, time_ms, split_times_ms, status, placement, points, rating_start, rating_turns, rating_underwater, rating_technique, rating_pacing, rating_finish, went_well, to_improve, coach_note, shared_with_athlete, athlete_feeling, athlete_effort, athlete_nervousness, athlete_note, athlete_updated_at, result_id";

export const STATUS_LABELS: Record<StartStatus, string> = {
  ok: "gewertet",
  dsq: "disqualifiziert",
  dns: "nicht angetreten",
  dnf: "aufgegeben",
};

export type RatingKey =
  | "rating_start"
  | "rating_turns"
  | "rating_underwater"
  | "rating_technique"
  | "rating_pacing"
  | "rating_finish";

/* Bewertete Teilbereiche mit Trainingsidee, falls sie schwach sind */
export const RATING_CATEGORIES: { key: RatingKey; label: string; drill: string }[] = [
  { key: "rating_start", label: "Start", drill: "Startsprünge mit Reaktionstraining und Blockstarts auf Kommando" },
  { key: "rating_turns", label: "Wenden", drill: "Wendenserien: Anschwimmen mit Tempo, enge Rolle, kräftiger Abstoß" },
  { key: "rating_underwater", label: "Unterwasser", drill: "Delfinbeine in Rückenlage/Bauchlage, Gleitphase nach Start und Wende" },
  { key: "rating_technique", label: "Technik", drill: "Technikübungen der Lage, Videoanalyse, langsame Technikserien" },
  { key: "rating_pacing", label: "Tempoeinteilung", drill: "Pace-Serien mit Zielzeiten pro 50 m, negative Splits üben" },
  { key: "rating_finish", label: "Anschlag", drill: "Zielanschläge aus vollem Tempo, letzte 5 m ohne Atmung" },
];

export const RATING_LABELS = ["", "schwach", "ausbaufähig", "okay", "gut", "sehr gut"];

/* "Freistil", "200m Brust Finale" ... -> Stroke */
export function strokeFromText(text: string): Stroke | null {
  const value = text.toLowerCase();

  if (/lagen|medley/.test(value)) return "medley";
  if (/rück|rueck|back/.test(value)) return "backstroke";
  if (/brust|breast/.test(value)) return "breaststroke";
  if (/schmett|delf|delph|butter/.test(value)) return "butterfly";
  if (/frei|kraul|free/.test(value)) return "freestyle";

  return null;
}

export function roundFromType(roundType: string | null | undefined) {
  if (roundType === "heat") return "Vorlauf";
  if (roundType === "final" || roundType === "junior_final") return "Finale";

  return null;
}

/* Beste Zeit VOR diesem Wettkampf (gleiche Strecke, gleiche Bahn) */
export function previousBest(results: SwimmerResult[], start: CompetitionStart) {
  let best: SwimmerResult | null = null;

  for (const result of results) {
    if (
      result.swimmer_id !== start.swimmer_id ||
      result.distance !== start.distance ||
      result.stroke !== start.stroke ||
      result.pool_length !== start.pool_length ||
      result.id === start.result_id ||
      result.result_date >= start.start_date
    ) {
      continue;
    }

    if (!best || result.time_ms < best.time_ms) {
      best = result;
    }
  }

  return best;
}

/*
 * Vorschlag fuer Melde- und Zielzeit: Meldezeit = bisherige
 * Bestzeit (vor dem Wettkampf, gleiche Bahn), Zielzeit =
 * Bestzeit minus x % (Standard 1 %), auf Hundertstel gerundet.
 */
export function suggestTimes(
  results: SwimmerResult[],
  start: Pick<CompetitionStart, "swimmer_id" | "distance" | "stroke" | "pool_length" | "start_date">,
  improvementPercent = 1
) {
  const best = previousBest(results, { ...start, result_id: null } as CompetitionStart);

  if (!best) return null;

  const goal = Math.round((best.time_ms * (1 - improvementPercent / 100)) / 10) * 10;

  return { best, entryMs: best.time_ms, goalMs: goal };
}

/* Abstand in Prozent: negativ = schneller */
export function percentDiff(timeMs: number, referenceMs: number) {
  return ((timeMs - referenceMs) / referenceMs) * 100;
}

export function formatPercent(value: number) {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";

  return `${sign}${Math.abs(value).toFixed(1).replace(".", ",")} %`;
}

export function averageRating(start: CompetitionStart) {
  const values = RATING_CATEGORIES.map((category) => start[category.key]).filter(
    (value): value is number => typeof value === "number"
  );

  if (values.length === 0) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/*
 * Zwischenzeiten (kumuliert, z. B. 50/100/150 m) -> Teilzeiten je Abschnitt.
 * Die Endzeit schliesst den letzten Abschnitt ab, falls sie fehlt.
 */
export function lapTimes(start: CompetitionStart) {
  const cumulative = [...start.split_times_ms].filter((value) => value > 0).sort((a, b) => a - b);

  if (start.time_ms && (cumulative.length === 0 || cumulative[cumulative.length - 1] < start.time_ms)) {
    cumulative.push(start.time_ms);
  }

  if (cumulative.length < 2) return [];

  const lapLength = start.distance / cumulative.length;

  return cumulative.map((value, index) => ({
    label: `${Math.round(lapLength * index)}–${Math.round(lapLength * (index + 1))} m`,
    ms: value - (index === 0 ? 0 : cumulative[index - 1]),
  }));
}

/*
 * Tempoverlauf: Vergleich zweite Haelfte zu erster Haelfte.
 * Der erste Abschnitt enthaelt den Startsprung und ist darum
 * immer schneller - er wird fuer den Vergleich ausgelassen,
 * sobald es mindestens 4 Abschnitte gibt.
 */
export function pacingAnalysis(start: CompetitionStart) {
  const laps = lapTimes(start);

  if (laps.length < 2) return null;

  const comparable = laps.length >= 4 ? laps.slice(1) : laps;
  const half = Math.floor(comparable.length / 2);
  const first = comparable.slice(0, half);
  const second = comparable.slice(comparable.length - half);
  const avg = (items: { ms: number }[]) => items.reduce((sum, item) => sum + item.ms, 0) / items.length;
  const drop = percentDiff(avg(second), avg(first));

  let verdict: string;

  if (drop <= 0) verdict = "Negativer Split – hinten gleich schnell oder schneller. Stark eingeteilt!";
  else if (drop <= 3) verdict = "Gleichmäßig eingeteilt.";
  else if (drop <= 7) verdict = "Leichter Tempoabfall in der zweiten Hälfte.";
  else verdict = "Deutlicher Tempoabfall – vermutlich zu schnell angegangen.";

  return { laps, drop, verdict };
}

export type StartEvaluation = {
  start: CompetitionStart;
  previous: SwimmerResult | null;
  isPersonalBest: boolean;
  diffToPreviousMs: number | null;
  diffToEntryMs: number | null;
  diffToGoalMs: number | null;
  goalReached: boolean | null;
  qualifying: QualifyingTime | null;
  qualified: boolean | null;
  average: number | null;
};

export function evaluateStart(
  start: CompetitionStart,
  results: SwimmerResult[],
  swimmer: Swimmer | undefined,
  qualifyingTimes: QualifyingTime[] | null
): StartEvaluation {
  const previous = previousBest(results, start);
  const time = start.status === "ok" ? start.time_ms : null;
  const qualifying =
    swimmer && qualifyingTimes ? findQualifyingTime(qualifyingTimes, swimmer, start) : null;

  return {
    start,
    previous,
    isPersonalBest: Boolean(time && (!previous || time < previous.time_ms)),
    diffToPreviousMs: time && previous ? time - previous.time_ms : null,
    diffToEntryMs: time && start.entry_time_ms ? time - start.entry_time_ms : null,
    diffToGoalMs: time && start.goal_time_ms ? time - start.goal_time_ms : null,
    goalReached: time && start.goal_time_ms ? time <= start.goal_time_ms : null,
    qualifying,
    qualified: time && qualifying ? time <= qualifying.time_ms : null,
    average: averageRating(start),
  };
}

/* Zusammenfassung ueber alle Starts eines Wettkampfs */
export function summarize(evaluations: StartEvaluation[]) {
  const valid = evaluations.filter((item) => item.start.status === "ok" && item.start.time_ms);
  const withPrevious = valid.filter((item) => item.previous);
  const improvements = withPrevious.map((item) => percentDiff(item.start.time_ms!, item.previous!.time_ms));
  const withGoal = valid.filter((item) => item.goalReached !== null);

  const categories = RATING_CATEGORIES.map((category) => {
    const values = evaluations
      .map((item) => item.start[category.key])
      .filter((value): value is number => typeof value === "number");

    return {
      ...category,
      count: values.length,
      average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    };
  });

  const rated = categories.filter((category) => category.average !== null);
  const sortedByAverage = [...rated].sort((a, b) => a.average! - b.average!);

  return {
    starts: evaluations.length,
    valid: valid.length,
    personalBests: valid.filter((item) => item.isPersonalBest).length,
    firstTimes: valid.filter((item) => !item.previous).length,
    averageImprovement: improvements.length
      ? improvements.reduce((sum, value) => sum + value, 0) / improvements.length
      : null,
    goalsReached: withGoal.filter((item) => item.goalReached).length,
    goalsSet: withGoal.length,
    invalid: evaluations.filter((item) => item.start.status !== "ok").length,
    categories,
    weakest: sortedByAverage.slice(0, 2).filter((category) => category.average! < 3.5),
    strongest: sortedByAverage.slice(-2).reverse().filter((category) => category.average! >= 3.5),
  };
}

/* ------------------------------------------------------------------ */
/* Saison-Auswertung                                                   */
/* ------------------------------------------------------------------ */

/* Saison beginnt im August: 2026-09-01 -> 2026 ("2026/27") */
export function seasonStartYear(date: string) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));

  return month >= 8 ? year : year - 1;
}

export function formatSeason(startYear: number) {
  return `${startYear}/${String(startYear + 1).slice(2)}`;
}

export type SeasonCompetition = { id: string; name: string; date: string };

/*
 * Wettkaempfe einer Saison in zeitlicher Reihenfolge und je
 * Strecke/Bahn die gewerteten Zeiten pro Wettkampf (bei mehreren
 * Laeufen die schnellste).
 */
export function buildSeasonMatrix(starts: CompetitionStart[], names: Record<string, string>) {
  const competitions = new Map<string, SeasonCompetition>();

  for (const start of starts) {
    const existing = competitions.get(start.competition_id);

    if (!existing || start.start_date < existing.date) {
      competitions.set(start.competition_id, {
        id: start.competition_id,
        name: names[start.competition_id] ?? "Wettkampf",
        date: start.start_date,
      });
    }
  }

  const columns = [...competitions.values()].sort((a, b) => a.date.localeCompare(b.date));
  const rows = new Map<string, { distance: number; stroke: Stroke; pool: PoolLength; cells: Record<string, CompetitionStart> }>();

  for (const start of starts) {
    if (start.status !== "ok" || !start.time_ms) continue;

    const key = `${start.pool_length}-${start.distance}-${start.stroke}`;
    const row = rows.get(key) ?? { distance: start.distance, stroke: start.stroke, pool: start.pool_length, cells: {} };
    const current = row.cells[start.competition_id];

    if (!current || start.time_ms < current.time_ms!) {
      row.cells[start.competition_id] = start;
    }

    rows.set(key, row);
  }

  return { columns, rows: [...rows.values()] };
}

/* Durchschnittsnote je Bereich und Wettkampf (fuer den Verlauf) */
export function ratingTrend(starts: CompetitionStart[], columns: SeasonCompetition[]) {
  return columns.map((column) => {
    const own = starts.filter((start) => start.competition_id === column.id);
    const row: Record<string, number | string | null> = { competition: column.name, date: column.date };

    for (const category of RATING_CATEGORIES) {
      const values = own.map((start) => start[category.key]).filter((value): value is number => typeof value === "number");
      row[category.key] = values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
    }

    return row;
  });
}
