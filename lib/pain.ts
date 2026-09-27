/*
 * Schmerzmeldung: Koerpermodell (Muskeln und Gelenke) und Auswahllisten.
 *
 * Die Formen sind fuer die Bildhaelfte des Betrachters LINKS gezeichnet
 * (x < 100 im viewBox 0 0 200 400) und werden fuer die andere Seite
 * gespiegelt. Achtung Seiten: In der Vorderansicht ist die linke
 * Bildhaelfte die RECHTE Koerperseite des Athleten, in der Rueckansicht
 * die LINKE.
 */

export type BodyView = "front" | "back";
export type SpotType = "muscle" | "joint";
export type Side = "left" | "right" | null;

export type SpotShape =
  | { kind: "path"; d: string }
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
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
  mirrored: boolean;
};

type BaseSpot = {
  key: string;
  label: string;
  type: SpotType;
  region: string;
  shape: SpotShape;
  paired: boolean;
};

/*
 * Koerperumriss (linke Bildhaelfte, wird fuer die rechte gespiegelt).
 * Wird unter die Muskeln gelegt, damit eine geschlossene Figur entsteht.
 */
export const SILHOUETTE_HALF =
  "M100 6 C88 6 82 16 82 30 C82 42 88 50 92 54 L92 62 C84 66 72 66 64 70 C54 74 50 84 50 96 " +
  "C48 110 46 124 46 136 C45 142 44 146 43 150 C41 164 40 176 40 186 L40 192 C38 200 38 210 42 216 " +
  "C45 220 50 220 52 214 C54 206 54 198 52 192 L51 186 C52 172 55 160 56 150 C57 144 58 140 59 136 " +
  "C60 124 62 112 66 104 C68 120 70 136 72 150 C73 158 72 166 72 172 C72 184 70 194 70 206 " +
  "C70 226 72 246 76 262 C77 270 77 278 77 284 C74 300 74 318 78 338 C79 348 80 356 80 362 " +
  "C78 372 76 380 80 384 C86 388 94 386 95 380 C95 372 94 364 94 358 C95 340 96 318 95 300 " +
  "C94 290 94 282 94 276 C95 256 97 236 98 220 C99 212 100 210 100 208 Z";

const HEAD = "M100 6 C88 6 82 16 82 30 C82 42 88 50 94 54 L106 54 C112 50 118 42 118 30 C118 16 112 6 100 6 Z";
const DELTOID = "M66 69 Q54 72 51 86 Q50 96 52 104 Q58 100 62 92 Q66 80 74 72 Z";
const UPPER_ARM = "M52 106 Q58 102 63 94 Q66 110 62 128 Q58 136 54 136 Q48 126 49 114 Q50 108 52 106 Z";
const FOREARM = "M45 146 Q50 142 58 144 Q56 164 52 184 Q46 186 42 184 Q41 164 45 146 Z";
const HAND = "M40.5 192 C38.5 200 38.5 210 42 215.5 C45 219 49.5 219 51.5 214 C53.5 206 53.5 198 51.5 192 Z";

const path = (d: string): SpotShape => ({ kind: "path", d });
const joint = (cx: number, cy: number, r: number): SpotShape => ({ kind: "circle", cx, cy, r });

const FRONT: BaseSpot[] = [
  { key: "head", label: "Kopf", type: "muscle", region: "head", paired: false, shape: path(HEAD) },
  { key: "neck", label: "Hals", type: "muscle", region: "neck", paired: false, shape: path("M92 54 L108 54 L109 64 Q100 68 91 64 Z") },
  { key: "deltoid", label: "Schultermuskel", type: "muscle", region: "shoulder", paired: true, shape: path(DELTOID) },
  { key: "chest", label: "Brustmuskel", type: "muscle", region: "chest", paired: true, shape: path("M75 71 Q86 66 99 68 L99 100 Q90 104 80 102 Q70 99 66 92 Q67 80 75 71 Z") },
  { key: "biceps", label: "Bizeps / Oberarm", type: "muscle", region: "upper_arm", paired: true, shape: path(UPPER_ARM) },
  { key: "forearm", label: "Unterarm", type: "muscle", region: "forearm", paired: true, shape: path(FOREARM) },
  { key: "hand", label: "Hand", type: "muscle", region: "hand", paired: true, shape: path(HAND) },
  { key: "abs", label: "Bauch", type: "muscle", region: "abdomen", paired: false, shape: path("M89 104 Q100 106 111 104 L112 150 Q112 162 106 170 L94 170 Q88 162 88 150 Z") },
  { key: "oblique", label: "Seitliche Bauchmuskeln", type: "muscle", region: "abdomen", paired: true, shape: path("M71 116 Q78 104 87 106 L87 150 Q87 162 91 170 Q80 168 74 158 Q70 138 71 116 Z") },
  { key: "hipflexor", label: "Hüftbeuger / Leiste", type: "muscle", region: "hip", paired: true, shape: path("M74 172 Q84 172 93 175 L99 196 Q90 197 82 191 Q75 184 74 172 Z") },
  { key: "quadriceps", label: "Oberschenkel vorne", type: "muscle", region: "front_thigh", paired: true, shape: path("M72 192 Q82 197 92 201 Q94 230 90 262 Q84 268 78 264 Q70 236 71 206 Z") },
  { key: "adductor", label: "Adduktoren / Innenseite", type: "muscle", region: "front_thigh", paired: true, shape: path("M94 200 L99 201 L99 214 Q98 232 94 248 Q92 222 94 200 Z") },
  { key: "shin", label: "Schienbein / Unterschenkel", type: "muscle", region: "lower_leg", paired: true, shape: path("M78 290 Q86 286 93 290 Q94 318 90 348 Q85 354 81 350 Q75 320 78 290 Z") },
  { key: "foot", label: "Fuß", type: "muscle", region: "foot", paired: true, shape: path("M80.5 364 C78.5 372 76.5 380 80.5 383.5 C86 387 93.5 385.5 94.5 380 C94.5 372 94 366 93 362 Z") },

  { key: "shoulder-joint", label: "Schultergelenk", type: "joint", region: "shoulder", paired: true, shape: joint(64, 82, 5) },
  { key: "elbow", label: "Ellenbogen", type: "joint", region: "elbow", paired: true, shape: joint(54, 141, 4.5) },
  { key: "wrist", label: "Handgelenk", type: "joint", region: "wrist", paired: true, shape: joint(46, 189, 3.8) },
  { key: "hip-joint", label: "Hüftgelenk", type: "joint", region: "hip", paired: true, shape: joint(78, 184, 5) },
  { key: "knee", label: "Knie", type: "joint", region: "knee", paired: true, shape: joint(85, 277, 7) },
  { key: "ankle", label: "Sprunggelenk", type: "joint", region: "ankle", paired: true, shape: joint(86, 358, 4.5) },
];

const BACK: BaseSpot[] = [
  { key: "head", label: "Hinterkopf", type: "muscle", region: "back_head", paired: false, shape: path(HEAD) },
  { key: "trapezius", label: "Nacken / Trapezmuskel", type: "muscle", region: "upper_back", paired: false, shape: path("M92 54 L108 54 L112 62 Q124 66 134 70 Q118 76 110 92 L100 100 L90 92 Q82 76 66 70 Q76 66 88 62 Z") },
  { key: "rear-deltoid", label: "Hintere Schulter", type: "muscle", region: "shoulder", paired: true, shape: path(DELTOID) },
  { key: "shoulderblade", label: "Schulterblatt", type: "muscle", region: "upper_back", paired: true, shape: path("M75 77 Q86 80 90 95 L88 108 Q78 108 72 98 Q71 86 75 77 Z") },
  { key: "lat", label: "Breiter Rückenmuskel", type: "muscle", region: "upper_back", paired: true, shape: path("M67 106 Q74 113 88 111 L99 104 L99 142 Q86 146 76 138 Q70 124 67 106 Z") },
  { key: "lower-back", label: "Unterer Rücken", type: "muscle", region: "lower_back", paired: false, shape: path("M84 142 Q100 148 116 142 L118 170 L82 170 Z") },
  { key: "triceps", label: "Trizeps / Oberarm hinten", type: "muscle", region: "rear_upper_arm", paired: true, shape: path(UPPER_ARM) },
  { key: "rear-forearm", label: "Unterarm hinten", type: "muscle", region: "rear_forearm", paired: true, shape: path(FOREARM) },
  { key: "hand", label: "Handrücken", type: "muscle", region: "hand", paired: true, shape: path(HAND) },
  { key: "glute", label: "Gesäß", type: "muscle", region: "rear_hip", paired: true, shape: path("M73 172 L99 172 L99 206 Q88 214 76 208 Q70 190 73 172 Z") },
  { key: "hamstring", label: "Oberschenkel hinten", type: "muscle", region: "rear_thigh", paired: true, shape: path("M72 212 Q86 218 98 212 Q97 240 92 264 Q84 268 78 264 Q70 238 72 212 Z") },
  { key: "calf", label: "Wade", type: "muscle", region: "calf", paired: true, shape: path("M77 290 Q86 282 94 290 Q97 314 91 338 Q85 344 80 338 Q72 314 77 290 Z") },
  { key: "achilles", label: "Achillessehne / Ferse", type: "muscle", region: "calf", paired: true, shape: path("M82 342 L90 342 L91 362 Q86 368 81 362 Z") },

  { key: "cervical", label: "Halswirbelsäule", type: "joint", region: "neck", paired: false, shape: joint(100, 58, 4) },
  { key: "thoracic", label: "Brustwirbelsäule", type: "joint", region: "upper_back", paired: false, shape: joint(100, 114, 4.5) },
  { key: "lumbar", label: "Lendenwirbelsäule", type: "joint", region: "lower_back", paired: false, shape: joint(100, 156, 5) },
  { key: "shoulder-joint", label: "Schultergelenk", type: "joint", region: "shoulder", paired: true, shape: joint(64, 82, 5) },
  { key: "elbow", label: "Ellenbogen", type: "joint", region: "elbow", paired: true, shape: joint(54, 141, 4.5) },
  { key: "wrist", label: "Handgelenk", type: "joint", region: "wrist", paired: true, shape: joint(46, 189, 3.8) },
  { key: "si-joint", label: "Iliosakralgelenk (ISG)", type: "joint", region: "rear_hip", paired: true, shape: joint(92, 179, 3.5) },
  { key: "knee-back", label: "Kniekehle", type: "joint", region: "knee_back", paired: true, shape: joint(85, 277, 7) },
  { key: "ankle", label: "Sprunggelenk", type: "joint", region: "ankle", paired: true, shape: joint(86, 356, 4.5) },
];


function sideLabel(side: Side) {
  return side === "left" ? "links" : side === "right" ? "rechts" : "";
}

function build(view: BodyView, base: BaseSpot[]): BodySpot[] {
  /* Bildhaelfte links: vorne = rechte Koerperseite, hinten = linke */
  const leftHalf: Side = view === "front" ? "right" : "left";
  const rightHalf: Side = view === "front" ? "left" : "right";

  return base.flatMap((spot): BodySpot[] => {
    if (!spot.paired) {
      return [{ id: `${view}-${spot.key}`, view, type: spot.type, side: null, label: spot.label, region: spot.region, shape: spot.shape, mirrored: false }];
    }

    return [
      { side: leftHalf, mirrored: false },
      { side: rightHalf, mirrored: true },
    ].map(({ side, mirrored }) => ({
      id: `${view}-${spot.key}-${side}`,
      view,
      type: spot.type,
      side,
      label: `${spot.label} ${sideLabel(side)}`,
      region: spot.region,
      shape: spot.shape,
      mirrored,
    }));
  });
}

export const BODY_SPOTS: BodySpot[] = [...build("front", FRONT), ...build("back", BACK)];

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
