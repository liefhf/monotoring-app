import { describe, expect, it } from "vitest";
import type { SwimmerResult } from "@/lib/swim";
import {
  CompetitionStart,
  averageRating,
  evaluateStart,
  formatPercent,
  lapTimes,
  pacingAnalysis,
  previousBest,
  roundFromType,
  strokeFromText,
  suggestTimes,
  seasonStartYear,
  formatSeason,
  buildSeasonMatrix,
  ratingTrend,
  summarize,
} from "@/lib/competitionFeedback";

const start = (overrides: Partial<CompetitionStart> = {}): CompetitionStart => ({
  id: "s1",
  competition_id: "c",
  swimmer_id: "w",
  event_id: null,
  start_date: "2026-06-10",
  pool_length: 50,
  distance: 100,
  stroke: "freestyle",
  round: null,
  entry_time_ms: 64000,
  goal_time_ms: 62500,
  time_ms: 62900,
  split_times_ms: [30100],
  status: "ok",
  placement: null,
  points: null,
  rating_start: 4,
  rating_turns: 2,
  rating_underwater: null,
  rating_technique: 3,
  rating_pacing: 5,
  rating_finish: 4,
  went_well: null,
  to_improve: null,
  coach_note: null,
  shared_with_athlete: true,
  athlete_feeling: null,
  athlete_effort: null,
  athlete_nervousness: null,
  athlete_note: null,
  athlete_updated_at: null,
  result_id: "own",
  ...overrides,
});

const result = (id: string, date: string, ms: number, pool: 25 | 50 = 50): SwimmerResult => ({
  id,
  swimmer_id: "w",
  result_date: date,
  location: null,
  pool_length: pool,
  distance: 100,
  stroke: "freestyle",
  time_ms: ms,
  points: null,
  round: null,
  is_split: false,
});

const results = [
  result("a", "2026-05-01", 63190),
  result("b", "2026-03-01", 65300),
  result("c", "2026-06-01", 60000, 25),
  result("own", "2026-06-10", 62900),
  result("later", "2026-07-01", 61000),
];

describe("previousBest", () => {
  it("nimmt nur Zeiten vor dem Wettkampf, gleiche Bahn, ohne das eigene Ergebnis", () => {
    expect(previousBest(results, start())?.id).toBe("a");
  });
});

describe("Zwischenzeiten", () => {
  it("berechnet Teilzeiten aus Durchgangszeiten und Endzeit", () => {
    expect(lapTimes(start()).map((lap) => lap.ms)).toEqual([30100, 32800]);
  });

  it("braucht mindestens zwei Abschnitte", () => {
    expect(lapTimes(start({ split_times_ms: [] }))).toEqual([]);
    expect(pacingAnalysis(start({ split_times_ms: [] }))).toBeNull();
  });

  it("erkennt Tempoabfall und laesst den Startabschnitt aus", () => {
    const analysis = pacingAnalysis(
      start({ distance: 400, time_ms: 309000, split_times_ms: [35000, 73000, 111500, 150000, 189000, 228500, 268500] })
    )!;
    expect(analysis.laps).toHaveLength(8);
    expect(analysis.drop).toBeGreaterThan(3);
    expect(analysis.drop).toBeLessThan(7);
  });

  it("erkennt einen negativen Split", () => {
    const analysis = pacingAnalysis(start({ distance: 200, time_ms: 140000, split_times_ms: [33000, 69000, 105000] }))!;
    expect(analysis.drop).toBeLessThanOrEqual(0);
  });
});

describe("evaluateStart", () => {
  it("bewertet Bestzeit, Abstaende, Ziel und Pflichtzeit", () => {
    const evaluation = evaluateStart(start(), results, { id: "w", first_name: "D", last_name: null, birth_year: 2010, gender: "male" }, [
      { id: "q", standard_id: "x", gender: "male", birth_year_from: 2010, birth_year_to: 2010, distance: 100, stroke: "freestyle", time_ms: 63000 },
    ]);

    expect(evaluation.isPersonalBest).toBe(true);
    expect(evaluation.diffToPreviousMs).toBe(-290);
    expect(evaluation.diffToEntryMs).toBe(-1100);
    expect(evaluation.goalReached).toBe(false);
    expect(evaluation.qualified).toBe(true);
    expect(evaluation.average).toBeCloseTo(3.6);
  });

  it("wertet disqualifizierte Starts nicht", () => {
    const evaluation = evaluateStart(start({ status: "dsq", time_ms: null }), results, undefined, null);
    expect(evaluation.isPersonalBest).toBe(false);
    expect(evaluation.goalReached).toBeNull();
  });

  it("zaehlt erstmals geschwommene Strecken als Bestzeit", () => {
    const evaluation = evaluateStart(start({ distance: 200 }), results, undefined, null);
    expect(evaluation.previous).toBeNull();
    expect(evaluation.isPersonalBest).toBe(true);
  });
});

describe("summarize", () => {
  it("fasst Starts zusammen und findet Staerken/Schwaechen", () => {
    const summary = summarize([
      evaluateStart(start(), results, undefined, null),
      evaluateStart(start({ id: "s2", status: "dsq", time_ms: null }), results, undefined, null),
    ]);

    expect(summary.starts).toBe(2);
    expect(summary.valid).toBe(1);
    expect(summary.personalBests).toBe(1);
    expect(summary.invalid).toBe(1);
    expect(summary.weakest.map((c) => c.label)).toEqual(["Wenden", "Technik"]);
    expect(summary.strongest.map((c) => c.label)).toEqual(["Tempoeinteilung", "Anschlag"]);
  });

  it("kommt ohne Starts aus", () => {
    const summary = summarize([]);
    expect(summary.starts).toBe(0);
    expect(summary.averageImprovement).toBeNull();
    expect(summary.weakest).toEqual([]);
  });
});

describe("suggestTimes", () => {
  it("schlaegt Bestzeit als Meldezeit und 1 % schneller als Ziel vor", () => {
    const suggestion = suggestTimes(results, start());
    expect(suggestion?.entryMs).toBe(63190);
    expect(suggestion?.goalMs).toBe(62560); // 63190 * 0,99 = 62558,1 -> 62,56
  });

  it("nimmt einen anderen Prozentwert", () => {
    expect(suggestTimes(results, start(), 2)?.goalMs).toBe(61930);
  });

  it("gibt null ohne fruehere Zeit", () => {
    expect(suggestTimes(results, start({ distance: 800 }))).toBeNull();
  });
});

describe("kleine Helfer", () => {
  it("erkennt Lagen im Text der Wettkampffolge", () => {
    expect(strokeFromText("200m Brust Finale")).toBe("breaststroke");
    expect(strokeFromText("Rücken")).toBe("backstroke");
    expect(strokeFromText("Schmetterling")).toBe("butterfly");
    expect(strokeFromText("Lagen")).toBe("medley");
    expect(strokeFromText("Freistil")).toBe("freestyle");
    expect(strokeFromText("Kraul")).toBe("freestyle");
    expect(strokeFromText("Staffel")).toBeNull();
  });

  it("uebersetzt Laufarten", () => {
    expect(roundFromType("heat")).toBe("Vorlauf");
    expect(roundFromType("junior_final")).toBe("Finale");
    expect(roundFromType("standard")).toBeNull();
  });

  it("formatiert Prozent und Durchschnitt", () => {
    expect(formatPercent(-0.46)).toBe("−0,5 %");
    expect(formatPercent(2)).toBe("+2,0 %");
    expect(averageRating(start({ rating_start: null, rating_turns: null, rating_technique: null, rating_pacing: null, rating_finish: null }))).toBeNull();
  });
});

describe("Saison-Auswertung", () => {
  it("ordnet Daten der Saison ab August zu", () => {
    expect(seasonStartYear("2026-07-31")).toBe(2025);
    expect(seasonStartYear("2026-08-01")).toBe(2026);
    expect(formatSeason(2026)).toBe("2026/27");
  });

  it("stellt Wettkaempfe nebeneinander und nimmt pro Wettkampf die schnellste Zeit", () => {
    const starts = [
      start({ id: "1", competition_id: "b", start_date: "2026-05-02", time_ms: 63000 }),
      start({ id: "2", competition_id: "a", start_date: "2026-03-01", time_ms: 65000 }),
      start({ id: "3", competition_id: "b", start_date: "2026-05-03", time_ms: 62500, round: "Finale" }),
      start({ id: "4", competition_id: "b", distance: 50, time_ms: 29000 }),
      start({ id: "5", competition_id: "a", status: "dsq", time_ms: null, distance: 200 }),
    ];
    const matrix = buildSeasonMatrix(starts, { a: "Frühjahr", b: "Bezirk" });

    expect(matrix.columns.map((c) => c.name)).toEqual(["Frühjahr", "Bezirk"]);
    expect(matrix.rows).toHaveLength(2);
    const row100 = matrix.rows.find((row) => row.distance === 100)!;
    expect(row100.cells.b.id).toBe("3");
    expect(row100.cells.a.id).toBe("2");
  });

  it("berechnet den Notenverlauf je Wettkampf", () => {
    const starts = [
      start({ id: "1", competition_id: "a", rating_turns: 2 }),
      start({ id: "2", competition_id: "a", rating_turns: 3 }),
      start({ id: "3", competition_id: "b", rating_turns: 4 }),
    ];
    const trend = ratingTrend(starts, [
      { id: "a", name: "A", date: "2026-03-01" },
      { id: "b", name: "B", date: "2026-05-01" },
    ]);

    expect(trend.map((row) => row.rating_turns)).toEqual([2.5, 4]);
    expect(trend[0].rating_underwater).toBeNull();
  });
});
