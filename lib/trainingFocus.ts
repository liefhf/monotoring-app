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

export type FocusKind = "dq" | "trend" | "quali" | "stroke" | "missing" | "distance" | "stagnation";

export type FocusItem = {
  kind: FocusKind;
  title: string;
  detail: string;
  /* hoeher = wichtiger */
  score: number;
  /* nur bei Pflichtzeit-Empfehlungen */
  level?: "open" | "done" | "close" | "reach" | "mid" | "far";
  event?: SwimEvent;
  role?: FocusRole | null;
  bestMs?: number | null;
  requiredMs?: number;
};

export type StrokeProfile = {
  stroke: Stroke;
  label: string;
  points: number | null;
  best: SwimmerResult | null;
};

/* Nur Ergebnisse der letzten 12 Monate zaehlen als "aktuell" */
export const RECENT_DAYS = 365;
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

/* Empfehlung je Strecke nach Abstand zur Pflichtzeit */
export function qualiRecommendation(
  event: SwimEvent,
  requiredMs: number,
  best: SwimmerResult | null,
  standardName: string
): FocusItem {
  return { ...qualiRecommendationText(event, requiredMs, best, standardName), event, bestMs: best?.time_ms ?? null, requiredMs };
}

function qualiRecommendationText(
  event: SwimEvent,
  requiredMs: number,
  best: SwimmerResult | null,
  standardName: string
): FocusItem {
  const target = `Pflichtzeit ${formatTime(requiredMs)} (${standardName})`;
  if (!best) {
    return {
      kind: "quali",
      title: `${formatEvent(event)}: noch keine Zeit im Qualifikationszeitraum`,
      detail: `${target}. Einen Start auf dieser Strecke einplanen, damit eine gültige Zeit vorliegt.`,
      score: 45,
      level: "open",
    };
  }
  const gap = best.time_ms - requiredMs;
  const share = gap / requiredMs;
  const pct = `${(Math.abs(share) * 100).toFixed(1).replace(".", ",")} %`;
  const bestText = `Bestzeit ${formatTime(best.time_ms)} (${best.pool_length}m)`;
  if (gap <= 0) {
    return {
      kind: "quali",
      title: `${formatEvent(event)}: Pflichtzeit erfüllt ✓`,
      detail: `${bestText}, ${formatTime(-gap)} unter der ${target}. Empfehlung: Niveau halten und die Meldezeit weiter verbessern.`,
      score: 15,
      level: "done",
    };
  }
  if (share <= 0.02) {
    return {
      kind: "quali",
      title: `${formatEvent(event)}: nur ${formatTime(gap)} bis zur Pflichtzeit`,
      detail: `${bestText} – es fehlen ${pct}. Empfehlung: oberste Priorität, beim nächsten Start realistisch (Start, Wenden, Renneinteilung).`,
      score: 95 - share * 100,
      level: "close",
    };
  }
  if (share <= 0.05) {
    return {
      kind: "quali",
      title: `${formatEvent(event)}: Pflichtzeit in Reichweite (−${formatTime(gap)})`,
      detail: `${bestText} – es fehlen ${pct}. Empfehlung: Schwerpunkt in den nächsten Wochen, in 1–2 Wettkämpfen erreichbar.`,
      score: 80 - share * 100,
      level: "reach",
    };
  }
  if (share <= 0.1) {
    return {
      kind: "quali",
      title: `${formatEvent(event)}: mittelfristiges Ziel (−${formatTime(gap)})`,
      detail: `${bestText} – es fehlen ${pct}. Empfehlung: kontinuierlich aufbauen, eher Ziel für die zweite Saisonhälfte.`,
      score: 50 - share * 100,
      level: "mid",
    };
  }
  return {
    kind: "quali",
    title: `${formatEvent(event)}: langfristiges Ziel (−${formatTime(gap)})`,
    detail: `${bestText} – es fehlen ${pct}. Empfehlung: aktuell kein kurzfristiger Schwerpunkt, Grundlagen weiter entwickeln.`,
    score: 20,
    level: "far",
  };
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

/* Vom Trainer festgelegter Fokus des Athleten (leer = alles auswerten) */
export type DistanceRange = "sprint" | "mittel" | "lang";

export type AthleteFocus = {
  /* einzelne Strecken im Format eventKey ("100-backstroke"); hat Vorrang vor strokes/distances */
  events?: string[] | null;
  strokes: Stroke[] | null;
  distances: DistanceRange[] | null;
  note?: string | null;
};

export const DISTANCE_RANGES: { value: DistanceRange; label: string; hint: string }[] = [
  { value: "sprint", label: "Sprint", hint: "50 m" },
  { value: "mittel", label: "Mittelstrecke", hint: "100 m" },
  { value: "lang", label: "Langstrecke", hint: "200 m und länger" },
];

export function distanceRange(distance: number): DistanceRange {
  return distance <= 50 ? "sprint" : distance < 200 ? "mittel" : "lang";
}

/*
 * Fokus-Strecken: "100-backstroke" = Hauptstrecke, "100-backstroke:neben" = Nebenstrecke.
 */
export type FocusRole = "haupt" | "neben";

export function parseFocusKey(key: string) {
  const [eventPart, rolePart] = key.split(":");
  const [distance, stroke] = eventPart.split("-");
  return {
    event: { distance: Number(distance), stroke: stroke as Stroke },
    role: (rolePart === "neben" ? "neben" : "haupt") as FocusRole,
  };
}

export function focusKey(event: SwimEvent, role: FocusRole) {
  return `${event.distance}-${event.stroke}${role === "neben" ? ":neben" : ""}`;
}

export function focusRole(event: SwimEvent, focus: AthleteFocus | null | undefined): FocusRole | null {
  for (const key of focus?.events ?? []) {
    const parsed = parseFocusKey(key);
    if (parsed.event.distance === event.distance && parsed.event.stroke === event.stroke) return parsed.role;
  }
  return null;
}

/* Liegt die Strecke im Fokus? Lagen braucht alle vier Lagen -> Lagen im Fokus zaehlt fuer jede Lage mit */
export function inFocus(event: SwimEvent, focus: AthleteFocus | null | undefined) {
  if (focus?.events?.length) {
    return focusRole(event, focus) !== null;
  }
  const strokes = focus?.strokes?.length ? focus.strokes : null;
  const distances = focus?.distances?.length ? focus.distances : null;
  const strokeOk = !strokes || strokes.includes(event.stroke) || (strokes.includes("medley") && event.distance <= 100);
  return strokeOk && (!distances || distances.includes(distanceRange(event.distance)));
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
  focus = null,
  faultTrends = [],
}: {
  /* wiederkehrende Wettkampf-Fehler der Saison (lib/faultCatalog.faultTrends) */
  faultTrends?: { label: string; rule: boolean; competitions: number; totalCompetitions: number; stillOpen: boolean }[];
  focus?: AthleteFocus | null;
  nonFinishes?: NonFinish[];
  results: SwimmerResult[];
  swimmer: Swimmer;
  standard: QualifyingStandard | null;
  standardTimes: QualifyingTime[];
  today: string;
}): FocusItem[] {
  const allRecent = recentResults(results, today);
  /* Nur Strecken im Fokus des Athleten auswerten (Disqualifikationen immer) */
  const focused = results.filter((result) => inFocus(result, focus));
  const recent = allRecent.filter((result) => inFocus(result, focus));
  const focusStrokes: Stroke[] | null = focus?.events?.length
    ? [...new Set(focus.events.map((key) => parseFocusKey(key).event.stroke))]
    : focus?.strokes?.length
      ? focus.strokes
      : null;
  const medleyFocus = !focusStrokes || focusStrokes.includes("medley");
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

  /* 0b. Fehler, die bei mindestens 2 Wettkaempfen auftreten: Dauer-Schwerpunkt */
  for (const trend of faultTrends) {
    if (trend.competitions < 2) continue;
    items.push({
      kind: "trend",
      title: `${trend.rule ? "⚠ " : ""}${trend.label}: ${trend.competitions}× in ${trend.totalCompetitions} Wettkämpfen`,
      detail: trend.stillOpen
        ? "Wiederkehrender Fehler, auch beim letzten Wettkampf wieder – fester Bestandteil jeder Trainingswoche, bis er verschwindet."
        : "Trat mehrfach auf, beim letzten Wettkampf aber nicht mehr – weiter beobachten.",
      score: (trend.rule ? 500 : 100) + trend.competitions * 5 + (trend.stillOpen ? 10 : -30),
    });
  }

  /* 1. Empfehlung anhand der Pflichtzeiten fuer jede Fokus-Strecke */
  if (standard) {
    const events: SwimEvent[] = focus?.events?.length
      ? focus.events.map((key) => parseFocusKey(key).event)
      : eventsOf(focused);
    for (const event of events) {
      const required = findQualifyingTime(standardTimes, swimmer, event);
      if (!required) continue;
      const best = findBestForStandard(results, event, standard);
      /* Ohne Zeit im Qualifikationszeitraum gibt es keine Orientierung -> weglassen */
      if (!best) continue;
      const item = qualiRecommendation(event, required.time_ms, best, standard.name);
      const role = focusRole(event, focus);
      /* Nebenstrecken etwas nachrangig */
      items.push({ ...item, role, score: role === "neben" ? item.score - 12 : item.score });
    }
  }

  /* 2. Lagen-Profil: schwache und fehlende Lagen */
  /* Mit Lagen im Fokus zaehlen alle vier Lagen, sonst nur die Fokus-Lagen */
  const distanceOk = (result: SwimmerResult) =>
    focus?.events?.length ? true : inFocus(result, focus && { strokes: null, distances: focus.distances });
  const profile = strokeProfile(medleyFocus ? allRecent.filter(distanceOk) : recent).filter(
    (item) => medleyFocus || focusStrokes!.includes(item.stroke)
  );
  const strongest = profile.reduce<StrokeProfile | null>(
    (top, item) => (item.points !== null && (!top || item.points > top.points!) ? item : top),
    null
  );
  const swimsMedley = medleyFocus && allRecent.some((result) => result.stroke === "medley");

  if (strongest) {
    for (const item of profile) {
      if (item.points === null) {
        items.push({
          kind: "missing",
          title: `${item.label}: keine aktuelle Wettkampfzeit`,
          detail: `In den letzten 12 Monaten keine gewertete ${item.label}-Zeit.${swimsMedley ? " Für die Lagenstrecken fehlt damit die Vergleichsbasis." : ""} Einen Start einplanen, um den Stand zu kennen.`,
          score: swimsMedley ? 28 : 22,
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
          /* nach den Pflichtzeiten: die naechsten Zeiten sind die Orientierung */
          score: 30 + (1 - share) * 20,
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

  const distanceFocus = focus?.distances?.length ? focus.distances : null;
  if (sprint && long && (!distanceFocus || (distanceFocus.includes("sprint") && distanceFocus.includes("lang")))) {
    if (long < sprint * DISTANCE_GAP) {
      items.push({
        kind: "distance",
        title: "Ausdauer: längere Strecken fallen ab",
        detail: `Ø ${Math.round(long)} Punkte auf 200 m und länger gegenüber Ø ${Math.round(sprint)} auf 50 m. Grundlagenausdauer und Tempohärte (z. B. Serien mit kurzen Pausen) bringen hier am meisten.`,
        score: 30 + (1 - long / sprint) * 20,
      });
    } else if (sprint < long * DISTANCE_GAP) {
      items.push({
        kind: "distance",
        title: "Schnelligkeit: Sprints fallen ab",
        detail: `Ø ${Math.round(sprint)} Punkte auf 50 m gegenüber Ø ${Math.round(long)} auf 200 m und länger. Start, Wende, Unterwasserphase und kurze maximale Sprints üben.`,
        score: 30 + (1 - sprint / long) * 20,
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
        score: 35 + Math.min(recentStarts.length, 5),
      });
    }
  }

  return items.sort((a, b) => b.score - a.score);
}

/*
 * Vorschlag fuer Haupt- und Nebenstrecken aus den Ergebnissen der letzten 12 Monate:
 * - Hauptstrecken: die staerksten Strecken (Punkte nahe am eigenen Bestwert)
 *   und Strecken, bei denen die Pflichtzeit erfuellt oder hoechstens 5 % entfernt ist.
 * - Nebenstrecken: solide Strecken (ab 85 % des Bestwerts) oder Pflichtzeit hoechstens 10 % entfernt.
 * Nur Strecken, die tatsaechlich geschwommen wurden. Der Trainer kann alles aendern.
 */
export function suggestFocus({
  results,
  swimmer,
  standard,
  standardTimes,
  today,
}: {
  results: SwimmerResult[];
  swimmer: Swimmer;
  standard: QualifyingStandard | null;
  standardTimes: QualifyingTime[];
  today: string;
}): { events: string[]; reasons: Record<string, string> } {
  const recent = recentResults(results, today);
  const scored = eventsOf(recent)
    .map((event) => {
      const best = bestPointsFor(recent, (r) => r.distance === event.distance && r.stroke === event.stroke);
      const required = standard ? findQualifyingTime(standardTimes, swimmer, event) : null;
      const bestTime = standard && required ? findBestForStandard(results, event, standard) : null;
      const gapShare = required && bestTime ? (bestTime.time_ms - required.time_ms) / required.time_ms : null;
      return { event, points: best?.points ?? 0, starts: recent.filter((r) => r.distance === event.distance && r.stroke === event.stroke).length, gapShare };
    })
    .filter((item) => item.points > 0 || item.gapShare !== null);

  const maxPoints = Math.max(1, ...scored.map((item) => item.points));
  const haupt: string[] = [];
  const neben: string[] = [];
  const reasons: Record<string, string> = {};
  const pct = (share: number) => `${(Math.abs(share) * 100).toFixed(1).replace(".", ",")} %`;

  for (const item of scored.sort((a, b) => b.points - a.points)) {
    const key = `${item.event.distance}-${item.event.stroke}`;
    const share = item.points / maxPoints;
    if (item.gapShare !== null && item.gapShare <= 0.05) {
      haupt.push(key);
      reasons[key] = item.gapShare <= 0 ? "Pflichtzeit erfüllt" : `nur ${pct(item.gapShare)} bis zur Pflichtzeit`;
    } else if (share >= 0.95 && haupt.length < 4) {
      haupt.push(key);
      reasons[key] = `stärkste Strecke (${item.points} Pkt.)`;
    } else if ((item.gapShare !== null && item.gapShare <= 0.1) || (share >= 0.85 && neben.length < 5)) {
      neben.push(key);
      reasons[key] =
        item.gapShare !== null && item.gapShare <= 0.1 ? `${pct(item.gapShare)} bis zur Pflichtzeit` : `solide Strecke (${item.points} Pkt.)`;
    }
  }

  return { events: [...haupt, ...neben.map((key) => `${key}:neben`)], reasons };
}
