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
  formatEventShort,
  formatTime,
} from "@/lib/swim";
import { AthleteFocus, FocusRole, parseFocusKey, suggestFocus } from "@/lib/trainingFocus";

/*
 * Wochenfokus fuer die Trainingsplanung (immer fuer alle zusammen):
 * - Phase bis zum naechsten Wettkampf (Aufbau / Vorbereitung / Taper)
 * - Technik-Pflichtpunkte aus Disqualifikationen
 * - Pflichtzeiten in Reichweite, nach Strecke gruppiert
 * - Hauptteil A (jeder in seiner Hauptlage) und B (Nebenlage)
 * - Vorschlaege fuer Bausteine, die in die Einheit uebernommen werden koennen
 */

export type Phase = "aufbau" | "vorbereitung" | "taper" | "offen";

export const PHASES: Record<Phase, { label: string; hint: string }> = {
  aufbau: { label: "Aufbau", hint: "Umfang, Technik, Grundlagenausdauer" },
  vorbereitung: { label: "Wettkampfvorbereitung", hint: "Renntempo, Starts & Wenden, Tempohärte" },
  taper: { label: "Taper", hint: "Umfang runter, kurze scharfe Reize, frisch bleiben" },
  offen: { label: "kein Wettkampf geplant", hint: "Grundlagen und Technik" },
};

export function phaseFor(daysUntil: number | null): Phase {
  if (daysUntil === null) return "offen";
  if (daysUntil < 7) return "taper";
  if (daysUntil <= 21) return "vorbereitung";
  return "aufbau";
}

export type LaneGroup = { stroke: Stroke; label: string; athletes: string[] };

export type SuggestedRow = {
  section: "einschwimmen" | "technik" | "hauptblock" | "ausschwimmen";
  repetitions: number;
  distance: number;
  exercise: string;
  style: string;
  zone: string;
  intervalType: "P" | "@";
  intervalTime: string;
};

export type SuggestedBlock = { id: string; title: string; why: string; rows: SuggestedRow[] };

export type WeekFocus = {
  phase: Phase;
  technique: { title: string; athletes: string[]; reasons: string[] }[];
  targets: { event: SwimEvent; athletes: { name: string; gapMs: number }[] }[];
  mainA: LaneGroup[];
  mainB: LaneGroup[];
  blocks: SuggestedBlock[];
};

const STYLE_BY_STROKE: Record<Stroke, string> = {
  freestyle: "Kraul",
  backstroke: "Rücken",
  breaststroke: "Brust",
  butterfly: "Schmetterling",
  medley: "Lagen",
};

const strokeLabel = (stroke: Stroke) => STROKES.find((item) => item.value === stroke)?.label ?? stroke;
const strokeShort = (stroke: Stroke) => STROKES.find((item) => item.value === stroke)?.short ?? stroke;

/* Haeufigste Lage unter den Strecken einer Rolle */
function mainStroke(events: { event: SwimEvent; role: FocusRole }[], role: FocusRole, exclude?: Stroke | null) {
  const counts = new Map<Stroke, number>();
  for (const item of events) {
    if (item.role !== role || item.event.stroke === exclude) continue;
    counts.set(item.event.stroke, (counts.get(item.event.stroke) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function groupLanes(entries: { stroke: Stroke | null; name: string }[]): LaneGroup[] {
  const map = new Map<Stroke, string[]>();
  for (const entry of entries) {
    if (!entry.stroke) continue;
    map.set(entry.stroke, [...(map.get(entry.stroke) ?? []), entry.name]);
  }
  return [...map.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([stroke, athletes]) => ({ stroke, label: strokeLabel(stroke), athletes }));
}

const laneText = (groups: LaneGroup[]) =>
  groups.map((group) => `${strokeShort(group.stroke)}: ${group.athletes.join(", ")}`).join(" · ");

export function buildWeekFocus({
  swimmers,
  results,
  focusBySwimmer,
  standard,
  standardTimes,
  nonFinishes,
  daysUntil,
  today,
}: {
  swimmers: Swimmer[];
  results: SwimmerResult[];
  focusBySwimmer: Map<string, AthleteFocus>;
  standard: QualifyingStandard | null;
  standardTimes: QualifyingTime[];
  nonFinishes: NonFinish[];
  daysUntil: number | null;
  today: string;
}): WeekFocus {
  const phase = phaseFor(daysUntil);
  const first = (swimmer: Swimmer) => swimmer.first_name;

  /* Fokus-Strecken je Athlet (gespeichert, sonst Vorschlag aus den Ergebnissen) */
  const focusOf = new Map<string, { event: SwimEvent; role: FocusRole }[]>();
  for (const swimmer of swimmers) {
    const own = results.filter((result) => result.swimmer_id === swimmer.id);
    const saved = focusBySwimmer.get(swimmer.id)?.events;
    const keys = saved?.length ? saved : suggestFocus({ results: own, swimmer, standard, standardTimes, today }).events;
    focusOf.set(swimmer.id, keys.map(parseFocusKey));
  }

  /* Technik aus Disqualifikationen der letzten 8 Wochen */
  const since = new Date(Date.parse(today) - 56 * 86_400_000).toISOString().slice(0, 10);
  const techniqueMap = new Map<string, { title: string; athletes: string[]; reasons: string[] }>();
  for (const dq of nonFinishes) {
    if (dq.status !== "DS" || dq.result_date < since) continue;
    const swimmer = swimmers.find((item) => item.id === dq.swimmer_id);
    if (!swimmer) continue;
    const reason = (dq.reason ?? "").toLowerCase();
    const topic = reason.includes("wende") ? "Wende" : reason.includes("start") ? "Start" : reason.includes("anschlag") ? "Anschlag" : "Technik";
    const title = `${strokeLabel(dq.stroke)}: ${topic}`;
    const entry = techniqueMap.get(title) ?? { title, athletes: [], reasons: [] };
    if (!entry.athletes.includes(first(swimmer))) entry.athletes.push(first(swimmer));
    if (dq.reason) entry.reasons.push(dq.reason);
    techniqueMap.set(title, entry);
  }
  const technique = [...techniqueMap.values()];

  /* Pflichtzeiten in Reichweite (bis 5 %) auf Fokus-Strecken */
  const targetMap = new Map<string, { event: SwimEvent; athletes: { name: string; gapMs: number }[] }>();
  if (standard) {
    for (const swimmer of swimmers) {
      const own = results.filter((result) => result.swimmer_id === swimmer.id);
      for (const { event } of focusOf.get(swimmer.id) ?? []) {
        const required = findQualifyingTime(standardTimes, swimmer, event);
        const best = required ? findBestForStandard(own, event, standard) : null;
        if (!required || !best) continue;
        const gap = best.time_ms - required.time_ms;
        if (gap <= 0 || gap / required.time_ms > 0.05) continue;
        const key = `${event.distance}-${event.stroke}`;
        const entry = targetMap.get(key) ?? { event, athletes: [] };
        entry.athletes.push({ name: first(swimmer), gapMs: gap });
        targetMap.set(key, entry);
      }
    }
  }
  const targets = [...targetMap.values()]
    .map((entry) => ({ ...entry, athletes: entry.athletes.sort((a, b) => a.gapMs - b.gapMs) }))
    .sort((a, b) => b.athletes.length - a.athletes.length || a.event.distance - b.event.distance);

  /* Hauptteil A = Hauptlage, B = Nebenlage */
  const mainA = groupLanes(
    swimmers.map((swimmer) => ({ stroke: mainStroke(focusOf.get(swimmer.id) ?? [], "haupt"), name: first(swimmer) }))
  );
  const mainB = groupLanes(
    swimmers.map((swimmer) => {
      const events = focusOf.get(swimmer.id) ?? [];
      const haupt = mainStroke(events, "haupt");
      return { stroke: mainStroke(events, "neben", haupt) ?? mainStroke(events, "haupt", haupt), name: first(swimmer) };
    })
  );

  /* Bausteine */
  const blocks: SuggestedBlock[] = [];

  for (const item of technique) {
    const stroke = STROKES.find((entry) => item.title.startsWith(entry.label))?.value ?? "freestyle";
    blocks.push({
      id: `technik-${item.title}`,
      title: `Technik ${item.title}`,
      why: `Disqualifikation: ${item.athletes.join(", ")}`,
      rows: [
        {
          section: "technik",
          repetitions: 8,
          distance: 25,
          exercise:
            item.title.includes("Wende") && stroke === "backstroke"
              ? `Rückenwende: Drehen in Bauchlage, letzter Armzug, sofort Rolle – kein Gleiten (${item.athletes.join(", ")})`
              : `${item.title} regelkonform üben (${item.athletes.join(", ")})`,
          style: STYLE_BY_STROKE[stroke],
          zone: "BZ1 (Rekom)",
          intervalType: "P",
          intervalTime: "20",
        },
      ],
    });
  }

  const sprintTargets = targets.filter((target) => target.event.distance <= 50);
  if (sprintTargets.length && phase !== "aufbau") {
    const names = [...new Set(sprintTargets.flatMap((target) => target.athletes.map((athlete) => athlete.name)))];
    blocks.push({
      id: "sprint",
      title: "Start + Sprint für knappe 50er",
      why: sprintTargets.map((target) => `${formatEventShort(target.event)}: ${target.athletes.map((a) => `${a.name} +${formatTime(a.gapMs)}`).join(", ")}`).join(" · "),
      rows: [
        {
          section: "hauptblock",
          repetitions: 6,
          distance: 25,
          exercise: `Start + 15 m max, Rest locker – ${names.join(", ")}`,
          style: "Beliebig",
          zone: "BZ8 (S)",
          intervalType: "P",
          intervalTime: "60",
        },
      ],
    });
  }

  const templates: Record<Phase, { a: Omit<SuggestedRow, "section" | "exercise" | "style">[]; b: Omit<SuggestedRow, "section" | "exercise" | "style"> }> = {
    aufbau: {
      a: [{ repetitions: 8, distance: 100, zone: "BZ3 (GA1)", intervalType: "P", intervalTime: "20" }],
      b: { repetitions: 6, distance: 50, zone: "BZ2 (GA1)", intervalType: "P", intervalTime: "15" },
    },
    vorbereitung: {
      a: [
        { repetitions: 6, distance: 50, zone: "BZ6 (WA)", intervalType: "P", intervalTime: "60" },
        { repetitions: 4, distance: 25, zone: "BZ8 (S)", intervalType: "P", intervalTime: "60" },
      ],
      b: { repetitions: 4, distance: 100, zone: "BZ4 (GA2)", intervalType: "P", intervalTime: "20" },
    },
    taper: {
      a: [
        { repetitions: 4, distance: 25, zone: "BZ8 (S)", intervalType: "P", intervalTime: "60" },
        { repetitions: 2, distance: 50, zone: "BZ6 (WA)", intervalType: "P", intervalTime: "90" },
      ],
      b: { repetitions: 4, distance: 50, zone: "BZ2 (GA1)", intervalType: "P", intervalTime: "20" },
    },
    offen: {
      a: [{ repetitions: 8, distance: 100, zone: "BZ3 (GA1)", intervalType: "P", intervalTime: "20" }],
      b: { repetitions: 6, distance: 50, zone: "BZ2 (GA1)", intervalType: "P", intervalTime: "15" },
    },
  };

  if (mainA.length) {
    blocks.push({
      id: "hauptteil-a",
      title: "Hauptteil A – Hauptlage",
      why: laneText(mainA),
      rows: templates[phase].a.map((row) => ({
        ...row,
        section: "hauptblock",
        style: "Beliebig",
        exercise: `Hauptteil A in Hauptlage (${laneText(mainA)})`,
      })),
    });
  }
  if (mainB.length) {
    blocks.push({
      id: "hauptteil-b",
      title: "Hauptteil B – Nebenlage",
      why: laneText(mainB),
      rows: [
        {
          ...templates[phase].b,
          section: "hauptblock",
          style: "Beliebig",
          exercise: `Hauptteil B in Nebenlage (${laneText(mainB)})`,
        },
      ],
    });
  }

  return { phase, technique, targets, mainA, mainB, blocks };
}

