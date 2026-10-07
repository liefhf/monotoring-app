import { Stroke, formatTime } from "@/lib/swim";

/*
 * Fehlerkatalog fuer das Wettkampf-Feedback am Beckenrand:
 * Klick statt Tippen. Jeder Fehler gehoert zu einer Phase, ist optional
 * auf bestimmte Lagen beschraenkt und bringt eine Trainingsuebung mit,
 * die der Wochenfokus spaeter vorschlaegt.
 */

export type FaultPhase = "start" | "unterwasser" | "technik" | "wende" | "tempo" | "anschlag";

export const FAULT_PHASES: { value: FaultPhase; label: string }[] = [
  { value: "start", label: "Start" },
  { value: "unterwasser", label: "Unterwasser" },
  { value: "technik", label: "Lage / Technik" },
  { value: "wende", label: "Wende" },
  { value: "tempo", label: "Renneinteilung" },
  { value: "anschlag", label: "Zielanschlag" },
];

export type Fault = {
  code: string;
  phase: FaultPhase;
  label: string;
  strokes?: Stroke[];
  /* Regelverstoss-Gefahr -> immer hohe Prioritaet */
  rule?: boolean;
  drill: { repetitions: number; distance: number; exercise: string; zone: string; interval: string };
};

export const FAULTS: Fault[] = [
  // Start
  { code: "start_reaktion", phase: "start", label: "Reaktion langsam", drill: { repetitions: 6, distance: 15, exercise: "Startreaktion auf Signal, 15 m max", zone: "BZ8 (S)", interval: "45" } },
  { code: "start_eintauchen", phase: "start", label: "Eintauchen flach / platscht", drill: { repetitions: 6, distance: 15, exercise: "Startsprung: Eintauchen durch ein Loch, Körperspannung", zone: "BZ8 (S)", interval: "45" } },
  { code: "start_rueckenstart", phase: "start", label: "Rückenstart rutscht ab", strokes: ["backstroke", "medley"], drill: { repetitions: 6, distance: 15, exercise: "Rückenstart: Fußposition, Hüfte hoch, Bogen", zone: "BZ8 (S)", interval: "45" } },

  // Unterwasser
  { code: "uw_zu_kurz", phase: "unterwasser", label: "Unterwasserphase zu kurz", drill: { repetitions: 8, distance: 25, exercise: "Delfinbeine unter Wasser bis 10–12 m, dann locker", zone: "BZ4 (GA2)", interval: "30" } },
  { code: "uw_zu_lang", phase: "unterwasser", label: "zu lang / Tempo verloren", drill: { repetitions: 8, distance: 25, exercise: "Unterwasser: Übergang zum ersten Zug bei max. Tempo", zone: "BZ6 (WA)", interval: "30" } },
  { code: "uw_uebergang", phase: "unterwasser", label: "Übergang zum 1. Zug holprig", drill: { repetitions: 8, distance: 15, exercise: "Auftauchen: erster Zug kräftig, nicht atmen im 1. Zug", zone: "BZ6 (WA)", interval: "30" } },

  // Technik
  { code: "tech_wasserlage", phase: "technik", label: "Wasserlage: Hüfte/Beine sinken", drill: { repetitions: 8, distance: 25, exercise: "Wasserlage: Seitlage-Beine, Blick nach unten, Körperspannung", zone: "BZ2 (GA1)", interval: "20" } },
  { code: "tech_kopf", phase: "technik", label: "Kopf zu hoch", drill: { repetitions: 8, distance: 25, exercise: "Kopfposition neutral, Atmung seitlich flach", zone: "BZ2 (GA1)", interval: "20" } },
  { code: "tech_zug_kurz", phase: "technik", label: "Zug zu kurz / rutscht durch", drill: { repetitions: 6, distance: 50, exercise: "Zugzahl reduzieren, Wasser fassen (Paddles)", zone: "BZ3 (GA1)", interval: "20" } },
  { code: "tech_beine", phase: "technik", label: "Beinschlag schwach", drill: { repetitions: 8, distance: 50, exercise: "Beine mit Brett 25 schnell / 25 locker", zone: "BZ4 (GA2)", interval: "20" } },
  { code: "tech_atmung", phase: "technik", label: "Atmung stört Rhythmus", strokes: ["freestyle", "butterfly", "medley"], drill: { repetitions: 8, distance: 25, exercise: "Atemrhythmus 3er / 5er, Atmung ohne Kopfheben", zone: "BZ2 (GA1)", interval: "20" } },
  { code: "tech_brust_timing", phase: "technik", label: "Brust: Timing Arme/Beine", strokes: ["breaststroke", "medley"], drill: { repetitions: 8, distance: 25, exercise: "Brust 2 Beinschläge – 1 Zug, Gleitphase kurz", zone: "BZ2 (GA1)", interval: "20" } },
  { code: "tech_delfin_rhythmus", phase: "technik", label: "Delfin: Rhythmus bricht ein", strokes: ["butterfly", "medley"], drill: { repetitions: 8, distance: 25, exercise: "Delfin 2 Beinschläge pro Zug, Einarm-Delfin", zone: "BZ3 (GA1)", interval: "25" } },
  { code: "regel_brust_beine", phase: "technik", label: "Regel: Wechsel-/Delfinbeinschlag", strokes: ["breaststroke", "medley"], rule: true, drill: { repetitions: 8, distance: 25, exercise: "Brustbeine regelkonform (symmetrisch), Trainer beobachtet", zone: "BZ1 (Rekom)", interval: "20" } },

  // Wende
  { code: "wende_anschwimmen", phase: "wende", label: "Tempo vor der Wende raus", drill: { repetitions: 8, distance: 25, exercise: "Wende: mit Tempo in die Wand, letzte Züge schnell", zone: "BZ6 (WA)", interval: "30" } },
  { code: "wende_abstand", phase: "wende", label: "Abstand zur Wand falsch", drill: { repetitions: 8, distance: 25, exercise: "Wende: Abstand über Bodenkreuz, Zugzahl ab T-Markierung", zone: "BZ2 (GA1)", interval: "20" } },
  { code: "wende_abdruck", phase: "wende", label: "Abdruck schwach", drill: { repetitions: 8, distance: 25, exercise: "Wende: kompakte Rolle, kräftiger Abdruck in Streckung", zone: "BZ4 (GA2)", interval: "25" } },
  { code: "wende_rueckendrehung", phase: "wende", label: "Rückenwende: nicht sofort eingeleitet", strokes: ["backstroke", "medley"], rule: true, drill: { repetitions: 8, distance: 25, exercise: "Rückenwende: Drehen in Bauchlage, letzter Armzug, sofort Rolle – kein Gleiten", zone: "BZ1 (Rekom)", interval: "20" } },
  { code: "wende_beidhand", phase: "wende", label: "Anschlag nicht beidhändig", strokes: ["breaststroke", "butterfly", "medley"], rule: true, drill: { repetitions: 8, distance: 25, exercise: "Wende: beidhändiger, gleichzeitiger Anschlag", zone: "BZ1 (Rekom)", interval: "20" } },

  // Renneinteilung
  { code: "tempo_zu_schnell", phase: "tempo", label: "zu schnell angegangen", drill: { repetitions: 4, distance: 100, exercise: "Renneinteilung: 1. Hälfte kontrolliert, 2. Hälfte schneller (negativ splitten)", zone: "BZ4 (GA2)", interval: "30" } },
  { code: "tempo_einbruch", phase: "tempo", label: "Einbruch hinten raus", drill: { repetitions: 6, distance: 50, exercise: "Tempohärte: Renntempo, kurze Pausen", zone: "BZ6 (WA)", interval: "20" } },
  { code: "tempo_zu_ruhig", phase: "tempo", label: "zu verhalten / Reserven", drill: { repetitions: 6, distance: 50, exercise: "Renntempo treffen: Zielzeiten pro 50 m", zone: "BZ6 (WA)", interval: "45" } },

  // Zielanschlag
  { code: "ziel_gleiten", phase: "anschlag", label: "ausgeglitten statt angeschlagen", drill: { repetitions: 8, distance: 12, exercise: "Zielanschlag: Zugrhythmus anpassen, voll in die Wand", zone: "BZ8 (S)", interval: "30" } },
  { code: "ziel_kopf", phase: "anschlag", label: "Kopf hoch / Atmung am Ende", drill: { repetitions: 8, distance: 15, exercise: "Letzte 5 m ohne Atmung, Kopf unten", zone: "BZ8 (S)", interval: "30" } },
];

export const faultByCode = new Map(FAULTS.map((fault) => [fault.code, fault]));

export function faultsForStroke(stroke: Stroke) {
  return FAULTS.filter((fault) => !fault.strokes || fault.strokes.includes(stroke) || stroke === "medley");
}

export type StartFault = { code: string; segment: string };

/* Streckenabschnitte eines Rennens: Start, Bahnen, Wenden, Ziel */
export function raceSegments(distance: number, poolLength: number) {
  const lanes = Math.max(1, Math.round(distance / poolLength));
  const segments: { value: string; label: string }[] = [{ value: "start", label: "Start" }];
  for (let lane = 1; lane <= lanes; lane++) {
    segments.push({ value: `lap-${lane}`, label: `${(lane - 1) * poolLength}–${lane * poolLength}` });
    if (lane < lanes) segments.push({ value: `wende-${lane}`, label: `Wende ${lane * poolLength} m` });
  }
  segments.push({ value: "finish", label: "Ziel" }, { value: "gesamt", label: "gesamt" });
  return segments;
}

export function segmentLabel(segment: string, poolLength: number) {
  if (segment === "start") return "Start";
  if (segment === "finish") return "Zielanschlag";
  if (segment === "gesamt") return "gesamt";
  const [kind, number] = segment.split("-");
  const n = Number(number);
  return kind === "wende" ? `Wende bei ${n * poolLength} m` : `${(n - 1) * poolLength}–${n * poolLength} m`;
}

/* Passende Phase zu einem Abschnitt vorschlagen (Fehlerliste vorfiltern) */
export function phaseForSegment(segment: string): FaultPhase | null {
  if (segment === "start") return "start";
  if (segment === "finish") return "anschlag";
  if (segment.startsWith("wende")) return "wende";
  if (segment === "gesamt") return "tempo";
  return "technik";
}

/*
 * Plausibilitaet der Zeiten (Tippfehler am Beckenrand abfangen).
 * Liefert Warnungen, blockiert aber nicht.
 */
export function plausibilityWarnings({
  finalMs,
  splits,
  distance,
  bestMs,
}: {
  finalMs: number | null;
  splits: number[];
  distance: number;
  bestMs: number | null;
}) {
  const warnings: string[] = [];
  for (let index = 1; index < splits.length; index++) {
    if (splits[index] <= splits[index - 1]) warnings.push(`Zwischenzeit ${index + 1} ist nicht größer als die vorherige – Reihenfolge prüfen.`);
  }
  if (finalMs && splits.length && splits[splits.length - 1] >= finalMs) warnings.push("Letzte Zwischenzeit ist größer als die Endzeit.");
  if (finalMs) {
    const perHundred = (finalMs / distance) * 100;
    if (perHundred < 45_000) warnings.push(`Endzeit ${formatTime(finalMs)} ist unrealistisch schnell für ${distance} m – Tippfehler?`);
    if (perHundred > 240_000) warnings.push(`Endzeit ${formatTime(finalMs)} ist sehr langsam für ${distance} m – Tippfehler?`);
    if (bestMs && Math.abs(finalMs - bestMs) / bestMs > 0.12) {
      warnings.push(`Endzeit weicht mehr als 12 % von der Bestzeit (${formatTime(bestMs)}) ab – bitte prüfen.`);
    }
  }
  return warnings;
}

/*
 * Automatisches Feedback fuer den Athleten aus Fehlern, Tempo und Noten.
 */
export function buildAthleteFeedback({
  faults,
  poolLength,
  laps,
  goalMs,
  finalMs,
  bestMs,
}: {
  faults: StartFault[];
  poolLength: number;
  laps: { label: string; ms: number }[];
  goalMs: number | null;
  finalMs: number | null;
  bestMs: number | null;
}) {
  const good: string[] = [];
  const improve: string[] = [];

  if (finalMs && bestMs && finalMs < bestMs) good.push(`Neue Bestzeit: ${formatTime(finalMs)} (${formatTime(bestMs - finalMs)} schneller).`);
  if (finalMs && goalMs) {
    if (finalMs <= goalMs) good.push(`Zielzeit ${formatTime(goalMs)} erreicht.`);
    else improve.push(`Zielzeit ${formatTime(goalMs)} um ${formatTime(finalMs - goalMs)} verpasst.`);
  }

  /* Tempo: langsamster Abschnitt ohne Startbahn */
  if (laps.length >= 3) {
    const rest = laps.slice(1);
    const avg = rest.reduce((sum, lap) => sum + lap.ms, 0) / rest.length;
    const slowest = rest.reduce((a, b) => (b.ms > a.ms ? b : a));
    if (slowest.ms > avg * 1.04) improve.push(`Tempo: ${slowest.label} deutlich langsamer (${formatTime(slowest.ms)}) – Tempohärte.`);
  }

  const phases = new Map<string, string[]>();
  for (const item of faults) {
    const fault = faultByCode.get(item.code);
    if (!fault) continue;
    const text = `${fault.label} (${segmentLabel(item.segment, poolLength)})`;
    phases.set(fault.phase, [...(phases.get(fault.phase) ?? []), text]);
  }
  for (const phase of FAULT_PHASES) {
    const list = phases.get(phase.value);
    if (list) improve.push(`${phase.label}: ${list.join(", ")}.`);
  }

  const rules = faults.map((item) => faultByCode.get(item.code)).filter((fault) => fault?.rule);
  if (rules.length) improve.unshift("⚠ Regelrelevant – vor dem nächsten Start unbedingt üben.");

  return { wentWell: good.join("\n"), toImprove: improve.join("\n") };
}

/*
 * Fehler-Trend ueber die Saison: Wie oft taucht ein Fehler bei wie vielen
 * Wettkaempfen auf? "Rückenwende: 3× in 4 Wettkämpfen".
 */
export type FaultTrend = {
  code: string;
  label: string;
  rule: boolean;
  /* Wettkaempfe mit diesem Fehler / Wettkaempfe mit erfassten Starts */
  competitions: number;
  totalCompetitions: number;
  starts: number;
  lastDate: string;
  /* auch beim letzten Wettkampf wieder aufgetreten */
  stillOpen: boolean;
};

export function seasonStart(today: string) {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  return `${month >= 8 ? year : year - 1}-08-01`;
}

export function faultTrends(
  starts: { competition_id: string; start_date: string; faults: StartFault[] | null }[],
  since: string
): FaultTrend[] {
  const inSeason = starts.filter((start) => start.start_date >= since);
  const competitions = [...new Set(inSeason.map((start) => start.competition_id))];
  const lastCompetitionDate = inSeason.reduce((max, start) => (start.start_date > max ? start.start_date : max), "");
  const lastCompetitions = new Set(inSeason.filter((start) => start.start_date === lastCompetitionDate).map((start) => start.competition_id));

  const map = new Map<string, { competitions: Set<string>; starts: number; lastDate: string }>();
  for (const start of inSeason) {
    for (const code of new Set((start.faults ?? []).map((fault) => fault.code))) {
      const entry = map.get(code) ?? { competitions: new Set<string>(), starts: 0, lastDate: "" };
      entry.competitions.add(start.competition_id);
      entry.starts += 1;
      if (start.start_date > entry.lastDate) entry.lastDate = start.start_date;
      map.set(code, entry);
    }
  }

  return [...map.entries()]
    .map(([code, entry]) => {
      const fault = faultByCode.get(code);
      return {
        code,
        label: fault?.label ?? code,
        rule: Boolean(fault?.rule),
        competitions: entry.competitions.size,
        totalCompetitions: competitions.length,
        starts: entry.starts,
        lastDate: entry.lastDate,
        stillOpen: [...entry.competitions].some((id) => lastCompetitions.has(id)),
      };
    })
    .sort((a, b) => Number(b.rule) - Number(a.rule) || b.competitions - a.competitions || b.starts - a.starts);
}

export function trendText(trend: FaultTrend) {
  return `${trend.label}: ${trend.competitions}× in ${trend.totalCompetitions} Wettkämpfen`;
}
