import {
  NonFinish,
  QualifyingStandard,
  QualifyingTime,
  STROKES,
  Stroke,
  SwimEvent,
  Swimmer,
  SwimmerResult,
  findBestForStandard,
  findQualifyingTime,
  formatEvent,
  formatTime,
} from "@/lib/swim";

/*
 * Trainingsfokus: Aus den aktuellen Bestzeiten ableiten, wo sich
 * Training bis zum naechsten Wettkampf am meisten lohnt.
 *
 * Grundlage sind die (World-Aquatics-)Punkte: Sie machen Strecken und
 * Lagen vergleichbar. Eine Lage mit deutlich weniger Punkten als die
 * staerkste ist eine Schwaeche - und bremst auch die Lagenstrecken.
 * Dazu kommen Pflichtzeiten in Reichweite und Distanz-Profil.
 */

export type FocusKind = "dq" | "quali" | "stroke" | "missing" | "distance" | "stagnation";

export type FocusItem = {
  kind: FocusKind;
  title: string;
  detail: string;
  /* hoeher = wichtiger */
  score: number;
};

export type StrokeProfile = {
  stroke: Stroke;
  label: string;
  points: number | null;
  best: SwimmerResult | null;
};

/* Nur Ergebnisse der letzten 12 Monate zaehlen als "aktuell" */
export const RECENT_DAYS = 365;
const QUALI_RANGE = 0.04; // bis 4 % ueber der Pflichtzeit = in Reichweite
const STROKE_GAP = 0.85; // Lage unter 85 % der staerksten Lage = Schwaeche
const DISTANCE_GAP = 0.9;

function daysBetween(a: string, b: string) {
  return (Date.parse(b) - Date.parse(a)) / 86_400_000;
}

/* Konkreter Trainingshinweis zu haeufigen Disqualifikationsgruenden */
function dqHint(dq: NonFinish) {
  const reason = (dq.reason ?? "").toLowerCase();
  if (dq.stroke === "backstroke" && reason.includes("wende")) {
    return "→ Rückenwende üben: nach dem Drehen in die Bauchlage und dem letzten Armzug sofort die Rolle einleiten – kein Gleiten, kein zusätzlicher Beinschlag. Bei jeder Rückenwende im Training darauf achten.";
  }
  if (reason.includes("wende") || reason.includes("anschlag")) {
    return "→ Wende/Anschlag nach Regel gezielt im Training üben und vom Trainer beobachten lassen.";
  }
  if (reason.includes("start") || reason.includes("fehlstart")) {
    return "→ Startablauf üben: ruhig in der Startposition bleiben bis zum Signal.";
  }
  if (reason.includes("beinschlag") || reason.includes("delfin")) {
    return "→ Beinschlag-Technik der Lage regelkonform üben (Technikserien, Video).";
  }
  return "";
}

/* Alle Disqualifikationen + die wichtigsten weiteren Punkte */
export function topFocus(items: FocusItem[], count: number) {
  return [...items.filter((item) => item.kind === "dq"), ...items.filter((item) => item.kind !== "dq").slice(0, count)];
}

export function recentResults(results: SwimmerResult[], today: string) {
  return results.filter((result) => daysBetween(result.result_date, today) <= RECENT_DAYS);
}

function bestPointsFor(results: SwimmerResult[], filter: (result: SwimmerResult) => boolean) {
  let best: SwimmerResult | null = null;
  for (const result of results) {
    if (result.points === null || !filter(result)) continue;
    if (!best || result.points > best.points!) best = result;
  }
  return best;
}

export function strokeProfile(results: SwimmerResult[]): StrokeProfile[] {
  return STROKES.filter((stroke) => stroke.value !== "medley").map((stroke) => {
    const best = bestPointsFor(results, (result) => result.stroke === stroke.value);
    return { stroke: stroke.value, label: stroke.label, points: best?.points ?? null, best };
  });
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function eventsOf(results: SwimmerResult[]): SwimEvent[] {
  const map = new Map<string, SwimEvent>();
  for (const result of results) map.set(`${result.stroke}-${result.distance}`, { distance: result.distance, stroke: result.stroke });
  return [...map.values()];
}

export function trainingFocus({
  results,
  swimmer,
  standard,
  standardTimes,
  today,
  nonFinishes = [],
}: {
  nonFinishes?: NonFinish[];
  results: SwimmerResult[];
  swimmer: Swimmer;
  standard: QualifyingStandard | null;
  standardTimes: QualifyingTime[];
  today: string;
}): FocusItem[] {
  const recent = recentResults(results, today);
  const items: FocusItem[] = [];

  /* 0. Disqualifikationen der letzten 12 Monate: Regel/Technik klaeren hat Vorrang */
  for (const dq of nonFinishes) {
    if (dq.status !== "DS" || daysBetween(dq.result_date, today) > RECENT_DAYS) continue;
    items.push({
      kind: "dq",
      title: `${formatEvent(dq)}: Disqualifikation${dq.location ? ` in ${dq.location}` : ""}`,
      detail: dq.reason
        ? `Grund: ${dq.reason}${dqHint(dq) ? ` ${dqHint(dq)}` : ""} Muss vor dem nächsten Start behoben sein – hat Vorrang vor allem anderen.`
        : "Grund noch nicht eingetragen – bitte ergänzen. Muss vor dem nächsten Start behoben sein.",
      /* Disqualifikationen stehen immer ganz oben, unabhaengig von Punkten */
      score: 1000 - daysBetween(dq.result_date, today) / 10,
    });
  }

  /* 1. Pflichtzeiten in Reichweite */
  if (standard) {
    for (const event of eventsOf(results)) {
      const required = findQualifyingTime(standardTimes, swimmer, event);
      if (!required) continue;
      const best = findBestForStandard(results, event, standard);
      if (!best) continue;
      const gap = best.time_ms - required.time_ms;
      const gapShare = gap / required.time_ms;
      if (gap > 0 && gapShare <= QUALI_RANGE) {
        items.push({
          kind: "quali",
          title: `${formatEvent(event)}: Pflichtzeit in Reichweite`,
          detail: `Bestzeit ${formatTime(best.time_ms)} – es fehlen nur ${formatTime(gap)} (${(gapShare * 100).toFixed(1).replace(".", ",")} %) bis ${formatTime(required.time_ms)} (${standard.name}).`,
          score: 100 - gapShare * 1000,
        });
      }
    }
  }

  /* 2. Lagen-Profil: schwache und fehlende Lagen */
  const profile = strokeProfile(recent);
  const strongest = profile.reduce<StrokeProfile | null>(
    (top, item) => (item.points !== null && (!top || item.points > top.points!) ? item : top),
    null
  );
  const swimsMedley = recent.some((result) => result.stroke === "medley");

  if (strongest) {
    for (const item of profile) {
      if (item.points === null) {
        items.push({
          kind: "missing",
          title: `${item.label}: keine aktuelle Wettkampfzeit`,
          detail: `In den letzten 12 Monaten keine gewertete ${item.label}-Zeit.${swimsMedley ? " Für die Lagenstrecken fehlt damit die Vergleichsbasis." : ""} Einen Start einplanen, um den Stand zu kennen.`,
          score: swimsMedley ? 45 : 30,
        });
        continue;
      }
      const share = item.points / strongest.points!;
      if (item !== strongest && share < STROKE_GAP) {
        items.push({
          kind: "stroke",
          title: `${item.label} ist die schwächste Lage`,
          detail: `${item.points} Punkte (${formatEvent(item.best!)} ${formatTime(item.best!.time_ms)}) gegenüber ${strongest.points} in ${strongest.label}. ${
            swimsMedley ? "Jede Verbesserung hier zahlt direkt auf die Lagenstrecken ein." : "Hier ist am meisten Luft nach oben."
          }`,
          score: 60 + (1 - share) * 100,
        });
      }
    }
  }

  /* 3. Distanz-Profil: Sprint vs. Ausdauer */
  const pointsOf = (filter: (result: SwimmerResult) => boolean) =>
    average(
      eventsOf(recent.filter(filter)).map(
        (event) =>
          bestPointsFor(recent, (result) => result.distance === event.distance && result.stroke === event.stroke)?.points ?? 0
      ).filter((points) => points > 0)
    );
  const sprint = pointsOf((result) => result.distance <= 50);
  const long = pointsOf((result) => result.distance >= 200);

  if (sprint && long) {
    if (long < sprint * DISTANCE_GAP) {
      items.push({
        kind: "distance",
        title: "Ausdauer: längere Strecken fallen ab",
        detail: `Ø ${Math.round(long)} Punkte auf 200 m und länger gegenüber Ø ${Math.round(sprint)} auf 50 m. Grundlagenausdauer und Tempohärte (z. B. Serien mit kurzen Pausen) bringen hier am meisten.`,
        score: 50 + (1 - long / sprint) * 100,
      });
    } else if (sprint < long * DISTANCE_GAP) {
      items.push({
        kind: "distance",
        title: "Schnelligkeit: Sprints fallen ab",
        detail: `Ø ${Math.round(sprint)} Punkte auf 50 m gegenüber Ø ${Math.round(long)} auf 200 m und länger. Start, Wende, Unterwasserphase und kurze maximale Sprints üben.`,
        score: 50 + (1 - sprint / long) * 100,
      });
    }
  }

  /* 4. Stagnation: Strecke regelmaessig geschwommen, Bestzeit aber aelter als 6 Monate */
  for (const event of eventsOf(recent)) {
    const all = results.filter((result) => result.distance === event.distance && result.stroke === event.stroke);
    const best = all.reduce((top, result) => (result.time_ms < top.time_ms ? result : top));
    const recentStarts = recent.filter(
      (result) => result.distance === event.distance && result.stroke === event.stroke && result.result_date > best.result_date
    );
    if (daysBetween(best.result_date, today) > 180 && recentStarts.length >= 2) {
      items.push({
        kind: "stagnation",
        title: `${formatEvent(event)}: Bestzeit stagniert`,
        detail: `Bestzeit ${formatTime(best.time_ms)} ist über ein halbes Jahr alt, seitdem ${recentStarts.length} Starts ohne Verbesserung. Technik oder Renneinteilung (Splits) genauer ansehen.`,
        score: 40 + Math.min(recentStarts.length, 5),
      });
    }
  }

  return items.sort((a, b) => b.score - a.score);
}
