/*
 * Schmerzmeldung: Koerpermodell (Muskeln und Gelenke) und Auswahllisten.
 *
 * Die Muskelformen stammen aus lib/bodyModelData.ts (viewBox 0 0 100 222).
 * Jede Muskelgruppe hat pro Koerperseite eigene Polygone; ueber die Lage
 * (Mitte x < 50 = linke Bildhaelfte) wird die Seite bestimmt.
 * Achtung Seiten: In der Vorderansicht ist die linke Bildhaelfte die
 * RECHTE Koerperseite des Athleten, in der Rueckansicht die LINKE.
 */
import { BACK_MUSCLES, FRONT_MUSCLES, MusclePolygons } from "@/lib/bodyModelData";

export type BodyView = "front" | "back";
export type SpotType = "muscle" | "joint";
export type Side = "left" | "right" | null;

export type SpotShape =
  | { kind: "polygons"; points: string[] }
  | { kind: "circle"; cx: number; cy: number; r: number };

export type BodySpot = {
  id: string;
  view: BodyView;
  type: SpotType;
  side: Side;
  label: string;
  /* grobe Region wie in alten Meldungen (body_region) */
  region: string;
  shape: SpotShape;
  /* Ankerpunkt fuer das Namensschild */
  anchor: { x: number; y: number };
};

export const BODY_VIEWBOX = { width: 100, height: 222 };

type MuscleInfo = { key: string; label: string; region: string; type?: SpotType; merge?: boolean };

/* Deutsche Namen je Muskelgruppe aus den Modelldaten */
const FRONT_INFO: Record<string, MuscleInfo> = {
  head: { key: "head", label: "Kopf", region: "head", merge: true },
  neck: { key: "neck", label: "Hals / Nacken seitlich", region: "neck" },
  "front-deltoids": { key: "deltoid", label: "Vordere Schulter", region: "shoulder" },
  chest: { key: "chest", label: "Brustmuskel", region: "chest" },
  biceps: { key: "biceps", label: "Bizeps", region: "upper_arm" },
  triceps: { key: "triceps-side", label: "Trizeps (seitlich)", region: "rear_upper_arm" },
  forearm: { key: "forearm", label: "Unterarm", region: "forearm" },
  abs: { key: "abs", label: "Bauch", region: "abdomen", merge: true },
  obliques: { key: "oblique", label: "Seitliche Bauchmuskeln", region: "abdomen" },
  abductors: { key: "adductor", label: "Oberschenkel innen (Adduktoren)", region: "front_thigh" },
  quadriceps: { key: "quadriceps", label: "Oberschenkel vorne", region: "front_thigh" },
  knees: { key: "knee", label: "Knie", region: "knee", type: "joint" },
  calves: { key: "shin", label: "Unterschenkel vorne", region: "lower_leg" },
};

const BACK_INFO: Record<string, MuscleInfo> = {
  head: { key: "head", label: "Hinterkopf", region: "back_head", merge: true },
  trapezius: { key: "trapezius", label: "Nacken / Trapezmuskel", region: "upper_back" },
  "back-deltoids": { key: "rear-deltoid", label: "Hintere Schulter", region: "shoulder" },
  "upper-back": { key: "upper-back", label: "Oberer Rücken", region: "upper_back" },
  triceps: { key: "triceps", label: "Trizeps", region: "rear_upper_arm" },
  forearm: { key: "rear-forearm", label: "Unterarm hinten", region: "rear_forearm" },
  "lower-back": { key: "lower-back", label: "Unterer Rücken", region: "lower_back" },
  gluteal: { key: "glute", label: "Gesäß", region: "rear_hip" },
  adductor: { key: "adductor", label: "Adduktoren", region: "rear_thigh" },
  hamstring: { key: "hamstring", label: "Oberschenkel hinten", region: "rear_thigh" },
  knees: { key: "knee-back", label: "Kniekehle", region: "knee_back", type: "joint" },
  calves: { key: "calf", label: "Wade", region: "calf" },
  "left-soleus": { key: "achilles", label: "Achillessehne / Ferse", region: "calf" },
  "right-soleus": { key: "achilles", label: "Achillessehne / Ferse", region: "calf" },
};

/* Gelenkpunkte (linke Bildhaelfte); paired = gespiegelt auch rechts */
type JointInfo = { key: string; label: string; region: string; cx: number; cy: number; r: number; paired: boolean };

const FRONT_JOINTS: JointInfo[] = [
  { key: "shoulder-joint", label: "Schultergelenk", region: "shoulder", cx: 27.5, cy: 42, r: 2.4, paired: true },
  { key: "elbow", label: "Ellenbogen", region: "elbow", cx: 19.5, cy: 71, r: 2.2, paired: true },
  { key: "wrist", label: "Handgelenk", region: "wrist", cx: 9, cy: 101, r: 2, paired: true },
  { key: "hip-joint", label: "Hüftgelenk / Leiste", region: "hip", cx: 36, cy: 91, r: 2.4, paired: true },
  { key: "ankle", label: "Sprunggelenk", region: "ankle", cx: 26, cy: 198, r: 2.1, paired: true },
];

const BACK_JOINTS: JointInfo[] = [
  { key: "cervical", label: "Halswirbelsäule", region: "neck", cx: 50, cy: 25, r: 2.1, paired: false },
  { key: "thoracic", label: "Brustwirbelsäule", region: "upper_back", cx: 50, cy: 56, r: 2.2, paired: false },
  { key: "lumbar", label: "Lendenwirbelsäule", region: "lower_back", cx: 50, cy: 88, r: 2.4, paired: false },
  { key: "si-joint", label: "Iliosakralgelenk (ISG)", region: "rear_hip", cx: 45, cy: 103, r: 1.8, paired: true },
  { key: "shoulder-joint", label: "Schultergelenk", region: "shoulder", cx: 27, cy: 42, r: 2.4, paired: true },
  { key: "elbow", label: "Ellenbogen", region: "elbow", cx: 17, cy: 79, r: 2.2, paired: true },
  { key: "wrist", label: "Handgelenk", region: "wrist", cx: 8.5, cy: 107.5, r: 2, paired: true },
];

function sideLabel(side: Side) {
  return side === "left" ? "links" : side === "right" ? "rechts" : "";
}

function pointsOf(polygon: string) {
  const numbers = polygon.trim().split(/[\s,]+/).map(Number);
  const points: { x: number; y: number }[] = [];

  for (let index = 0; index < numbers.length; index += 2) {
    points.push({ x: numbers[index], y: numbers[index + 1] });
  }

  return points;
}

function centerOf(polygons: string[]) {
  const points = polygons.flatMap(pointsOf);
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

function buildView(view: BodyView, muscles: MusclePolygons[], info: Record<string, MuscleInfo>, joints: JointInfo[]): BodySpot[] {
  /* linke Bildhaelfte: vorne = rechte Koerperseite, hinten = linke */
  const sideFor = (x: number): Side => (x < 50 ? (view === "front" ? "right" : "left") : view === "front" ? "left" : "right");
  const groups = new Map<string, { info: MuscleInfo; side: Side; polygons: string[] }>();

  for (const muscle of muscles) {
    const details = info[muscle.muscle];

    if (!details) continue;

    for (const polygon of muscle.polygons) {
      const side = details.merge ? null : sideFor(centerOf([polygon]).x);
      const id = `${view}-${details.key}${side ? `-${side}` : ""}`;
      const group = groups.get(id) ?? { info: details, side, polygons: [] };
      group.polygons.push(polygon);
      groups.set(id, group);
    }
  }

  const muscleSpots: BodySpot[] = [...groups.entries()].map(([id, group]) => ({
    id,
    view,
    type: group.info.type ?? "muscle",
    side: group.side,
    label: group.side ? `${group.info.label} ${sideLabel(group.side)}` : group.info.label,
    region: group.info.region,
    shape: { kind: "polygons", points: group.polygons },
    anchor: centerOf(group.polygons),
  }));

  const jointSpots: BodySpot[] = joints.flatMap((joint) => {
    const positions = joint.paired ? [joint.cx, 100 - joint.cx] : [joint.cx];

    return positions.map((cx): BodySpot => {
      const side = joint.paired ? sideFor(cx) : null;

      return {
        id: `${view}-${joint.key}${side ? `-${side}` : ""}`,
        view,
        type: "joint",
        side,
        label: side ? `${joint.label} ${sideLabel(side)}` : joint.label,
        region: joint.region,
        shape: { kind: "circle", cx, cy: joint.cy, r: joint.r },
        anchor: { x: cx, y: joint.cy },
      };
    });
  });

  return [...muscleSpots, ...jointSpots];
}

export const BODY_SPOTS: BodySpot[] = [
  ...buildView("front", FRONT_MUSCLES, FRONT_INFO, FRONT_JOINTS),
  ...buildView("back", BACK_MUSCLES, BACK_INFO, BACK_JOINTS),
];

export function getSpot(id: string | null | undefined) {
  return BODY_SPOTS.find((spot) => spot.id === id) ?? null;
}

/* ------------------------------------------------------------------ */
/* Auswahllisten                                                       */
/* ------------------------------------------------------------------ */

export const PAIN_QUALITIES = [
  { value: "stechend", label: "stechend" },
  { value: "ziehend", label: "ziehend" },
  { value: "dumpf", label: "dumpf / drückend" },
  { value: "brennend", label: "brennend" },
  { value: "pochend", label: "pochend" },
  { value: "krampf", label: "Krampf" },
  { value: "verspannung", label: "verspannt / Muskelkater" },
  { value: "schwellung", label: "geschwollen" },
  { value: "kribbeln", label: "Kribbeln / taub" },
];

export const PAIN_ONSETS = [
  { value: "heute", label: "seit heute" },
  { value: "tage", label: "seit 2–3 Tagen" },
  { value: "woche", label: "seit ca. einer Woche" },
  { value: "laenger", label: "länger / immer wieder" },
];

export const PAIN_TRIGGERS = [
  { value: "ruhe", label: "in Ruhe" },
  { value: "schwimmen", label: "beim Schwimmen" },
  { value: "start-wende", label: "bei Start / Wende" },
  { value: "kraft", label: "beim Krafttraining" },
  { value: "druck", label: "bei Druck / Berührung" },
  { value: "nachts", label: "nachts" },
  { value: "alltag", label: "im Alltag" },
];

export type TrainingImpact = "normal" | "limited" | "none";

export const TRAINING_IMPACTS: { value: TrainingImpact; label: string }[] = [
  { value: "normal", label: "Ich kann normal trainieren" },
  { value: "limited", label: "Nur eingeschränkt" },
  { value: "none", label: "Ich kann nicht trainieren" },
];

export function labelFor(list: { value: string; label: string }[], value: string | null | undefined) {
  return list.find((item) => item.value === value)?.label ?? value ?? "";
}

/* Farbe nach Staerke 1-10: gruen -> gelb -> rot */
export function painColor(level: number) {
  const clamped = Math.min(10, Math.max(1, level));
  const hue = 120 - ((clamped - 1) / 9) * 120;

  return `hsl(${Math.round(hue)} 80% 50%)`;
}

export function painWord(level: number) {
  if (level <= 3) return "leicht";
  if (level <= 6) return "mittel";
  if (level <= 8) return "stark";

  return "sehr stark";
}

/* Eine Meldung (Zeile in pain_reports) */
export type PainReport = {
  id: string;
  athlete_id: string;
  pain_type: string | null;
  body_region: string | null;
  side: string | null;
  pain_level: number;
  note: string | null;
  spot_id: string | null;
  spot_label: string | null;
  body_view: string | null;
  qualities: string[] | null;
  onset: string | null;
  triggers: string[] | null;
  training_impact: TrainingImpact | null;
  report_group: string | null;
  created_at: string;
};

export const PAIN_COLUMNS =
  "id, athlete_id, pain_type, body_region, side, pain_level, note, spot_id, spot_label, body_view, qualities, onset, triggers, training_impact, report_group, created_at";

/* Staerkster Wert je Stelle (fuer die Faerbung im Koerperbild) */
export function strongestBySpot(reports: Pick<PainReport, "spot_id" | "pain_level">[]) {
  const levels: Record<string, number> = {};

  for (const report of reports) {
    if (!report.spot_id) continue;
    levels[report.spot_id] = Math.max(levels[report.spot_id] ?? 0, report.pain_level);
  }

  return levels;
}
