import { Gender } from "@/lib/swim";

/*
 * Testbatterie mit Normwerten aus den Studienheften:
 * - Grundkrafttest Rumpf nach Maier et al. (2016) – Richtwerte fuer Sportler:innen
 *   (Spezielle Aspekte des Krafttrainings, Tab. 16)
 * - Standweitsprung nach Boes (1996), Altersgruppe 20–29 (Diagnostik und Testmethoden, Tab. 21)
 * - Klimmzuege junger Maenner nach Miller (2012) (Spezielle Aspekte des Krafttrainings, Tab. 15)
 * Fuer Tests ohne passende Norm (oder Jugendliche ausserhalb der Normgruppe)
 * zaehlen der eigene Verlauf und der Vergleich im Team.
 */

export type Rating = { label: string; tone: "good" | "ok" | "warn" | "bad" };
type Band = { min: number; rating: Rating };

export type FitnessTestDef = {
  code: string;
  label: string;
  unit: string;
  group: "Rumpf" | "Sprungkraft" | "Oberkörper" | "Schwimmen";
  /* true = kleinerer Wert ist besser (Zeiten) */
  lowerIsBetter?: boolean;
  how: string;
  norm?: {
    source: string;
    /* gilt nur fuer diese Alter (Jahre), sonst "keine Altersnorm" */
    minAge?: number;
    maxAge?: number;
    genders?: Gender[];
    bands: Partial<Record<Gender, Band[]>>;
  };
};

const G: Rating = { label: "genügend", tone: "good" };
const GW: Rating = { label: "grenzwertig", tone: "warn" };
const U: Rating = { label: "ungenügend", tone: "bad" };
const maier = (m: [number, number], w: [number, number]) => ({
  source: "Maier et al. 2016",
  bands: {
    male: [{ min: m[0], rating: G }, { min: m[1], rating: GW }, { min: 0, rating: U }],
    female: [{ min: w[0], rating: G }, { min: w[1], rating: GW }, { min: 0, rating: U }],
  },
});

const SG: Rating = { label: "sehr gut", tone: "good" };
const GU: Rating = { label: "gut", tone: "good" };
const MI: Rating = { label: "mittel", tone: "ok" };
const SC: Rating = { label: "schwach", tone: "warn" };
const SS: Rating = { label: "sehr schwach", tone: "bad" };

export const FITNESS_TESTS: FitnessTestDef[] = [
  { code: "rumpf_ventral", label: "Rumpf ventral (Unterarmstütz)", unit: "s", group: "Rumpf", how: "Unterarmstütz, Füße abwechselnd 2–5 cm anheben, 1 Bewegung/s (Metronom), Zeit bis Abbruch.", norm: maier([118, 99], [106, 87]) },
  { code: "rumpf_lateral_links", label: "Rumpf lateral links (Seitstütz)", unit: "s", group: "Rumpf", how: "Ellbogenstütz Seitlage, Becken heben/senken 1×/s, Zeit bis Abbruch.", norm: maier([66, 54], [59, 47]) },
  { code: "rumpf_lateral_rechts", label: "Rumpf lateral rechts (Seitstütz)", unit: "s", group: "Rumpf", how: "Wie links, andere Seite.", norm: maier([66, 54], [59, 47]) },
  { code: "rumpf_dorsal", label: "Rumpf dorsal (Rückenstrecker)", unit: "s", group: "Rumpf", how: "Füße fixiert, Rumpf 30° senken und zur Horizontalen, 1×/s, Zeit bis Abbruch.", norm: maier([92, 73], [100, 81]) },
  {
    code: "standweitsprung",
    label: "Standweitsprung",
    unit: "cm",
    group: "Sprungkraft",
    how: "Beidbeinig aus dem Stand, Armschwung erlaubt, bester von 2–3 Versuchen, auf Matte.",
    norm: {
      source: "Bös 1996 (20–29 J.)",
      minAge: 20,
      maxAge: 29,
      bands: {
        male: [{ min: 239, rating: SG }, { min: 223, rating: GU }, { min: 211, rating: MI }, { min: 196, rating: SC }, { min: 0, rating: SS }],
        female: [{ min: 166, rating: SG }, { min: 150, rating: GU }, { min: 138, rating: MI }, { min: 123, rating: SC }, { min: 0, rating: SS }],
      },
    },
  },
  { code: "cmj", label: "Counter Movement Jump", unit: "cm", group: "Sprungkraft", how: "Sprunghöhe mit Ausholbewegung, Hände an der Hüfte, bester von 3 Versuchen." },
  {
    code: "klimmzuege",
    label: "Klimmzüge",
    unit: "Wdh.",
    group: "Oberkörper",
    how: "Obergriff, aus dem Hang bis Kinn über Stange, ohne Schwung, keine Pausen.",
    norm: {
      source: "Miller 2012 (junge Männer)",
      minAge: 18,
      genders: ["male"],
      bands: {
        male: [
          { min: 15, rating: { label: "exzellent", tone: "good" } },
          { min: 12, rating: { label: "überdurchschnittlich", tone: "good" } },
          { min: 8, rating: { label: "durchschnittlich", tone: "ok" } },
          { min: 5, rating: { label: "unterdurchschnittlich", tone: "warn" } },
          { min: 0, rating: { label: "schwach", tone: "bad" } },
        ],
      },
    },
  },
  { code: "liegestuetze", label: "Liegestütze", unit: "Wdh.", group: "Oberkörper", how: "Saubere Ausführung bis Abbruch, Brust bis Faustbreite über dem Boden." },
  { code: "delfin15", label: "15 m Delfinbeine (Abstoß)", unit: "s", group: "Schwimmen", lowerIsBetter: true, how: "Abstoß von der Wand, 15 m Delfinbeine unter Wasser, Zeit bis Kopf bei 15 m." },
  { code: "t2000", label: "2000 m Kraul", unit: "s", group: "Schwimmen", lowerIsBetter: true, how: "Gleichmäßig durchschwimmen, Zeit als m:ss eintragen (z. B. 26:30)." },
];

export const testByCode = new Map(FITNESS_TESTS.map((test) => [test.code, test]));

export function rateTest(def: FitnessTestDef, value: number, gender: Gender | null, age: number | null): Rating | null {
  const norm = def.norm;
  if (!norm || !gender) return null;
  if (norm.genders && !norm.genders.includes(gender)) return null;
  if ((norm.minAge && (age === null || age < norm.minAge)) || (norm.maxAge && (age === null || age > norm.maxAge))) return null;
  const bands = norm.bands[gender];
  if (!bands) return null;
  return bands.find((band) => value >= band.min)?.rating ?? null;
}

/* Rang im Team (1 = bester) */
export function teamRank(def: FitnessTestDef, value: number, teamValues: number[]) {
  const sorted = [...teamValues].sort((a, b) => (def.lowerIsBetter ? a - b : b - a));
  return { rank: sorted.indexOf(value) + 1, of: sorted.length };
}

/* Veraenderung zum vorherigen Test in Prozent, positiv = besser */
export function improvementPct(def: FitnessTestDef, current: number, previous: number) {
  if (!previous) return null;
  const change = ((current - previous) / previous) * 100;
  return def.lowerIsBetter ? -change : change;
}

export function formatTestValue(def: FitnessTestDef, value: number) {
  if (def.unit === "s" && value >= 60) {
    const minutes = Math.floor(value / 60);
    const seconds = value - minutes * 60;
    return `${minutes}:${seconds.toFixed(def.lowerIsBetter ? 2 : 0).padStart(def.lowerIsBetter ? 5 : 2, "0").replace(".", ",")} min`;
  }
  return `${String(Number(value.toFixed(2))).replace(".", ",")} ${def.unit}`;
}
