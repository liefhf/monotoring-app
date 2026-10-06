/*
 * Formkurve nach dem Fitness-Fatigue-Modell (Banister; Studienheft
 * Leistungssteuerung 2, Kap. 1.2.2):
 *   Fitness  = langsam gleitender Schnitt der Tagesbelastung (Zeitkonstante 42 Tage)
 *   Ermuedung = schnell gleitender Schnitt (7 Tage)
 *   Form     = Fitness - Ermuedung (des Vortages)
 * Positiv = frisch, negativ = muede. Fuer den Wettkampf ideal: Form deutlich
 * positiv, Fitness dabei um hoechstens ~10 % gesunken (Tapering).
 *
 * Belastung = Session-RPE (RPE x Minuten). Zukuenftige Einheiten gehen mit
 * der geplanten Belastung ein, damit man sieht, wie der Plan wirkt.
 */

const DAY = 86_400_000;
const FITNESS_DAYS = 42;
const FATIGUE_DAYS = 7;

export type DailyLoad = { date: string; load: number; planned: boolean };
export type FormPoint = { date: string; load: number; fitness: number; fatigue: number; form: number; planned: boolean };

const addDays = (date: string, days: number) => new Date(Date.parse(date) + days * DAY).toISOString().slice(0, 10);

export function formCurve(loads: DailyLoad[], from: string, to: string): FormPoint[] {
  const byDay = new Map<string, { load: number; planned: boolean }>();
  for (const entry of loads) {
    const current = byDay.get(entry.date) ?? { load: 0, planned: true };
    byDay.set(entry.date, { load: current.load + entry.load, planned: current.planned && entry.planned });
  }
  const kFit = 1 - Math.exp(-1 / FITNESS_DAYS);
  const kFat = 1 - Math.exp(-1 / FATIGUE_DAYS);
  const points: FormPoint[] = [];
  const lastActual = loads.filter((entry) => !entry.planned).reduce((max, entry) => (entry.date > max ? entry.date : max), "");
  let fitness = 0;
  let fatigue = 0;
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const day = byDay.get(date);
    const load = day?.load ?? 0;
    const form = fitness - fatigue;
    fitness += (load - fitness) * kFit;
    fatigue += (load - fatigue) * kFat;
    points.push({ date, load, fitness, fatigue, form, planned: day?.planned ?? date > lastActual });
  }
  return points;
}

export type TaperAdvice = {
  formOnTarget: number;
  fitnessDropPct: number;
  status: "zu-muede" | "gut" | "zu-frisch" | "keine-daten";
  text: string;
  /* Vorschlag: Umfang der letzten Tage auf x % reduzieren */
  reduceTo: number | null;
  taperStart: string | null;
};

/*
 * Tapering-Hilfe fuer den Zieltag: Wie steht die Form bei Umsetzung des Plans,
 * und wie viel sollte in den letzten 10 Tagen reduziert werden?
 */
export function taperAdvice(points: FormPoint[], today: string, target: string): TaperAdvice {
  const onTarget = points.find((point) => point.date === target);
  const now = points.find((point) => point.date === today);
  if (!onTarget || !now || now.fitness < 1) {
    return { formOnTarget: 0, fitnessDropPct: 0, status: "keine-daten", text: "Zu wenig Belastungsdaten (RPE-Feedback oder geplante Belastung fehlen).", reduceTo: null, taperStart: null };
  }
  const fitnessDropPct = ((now.fitness - onTarget.fitness) / now.fitness) * 100;
  const relativeForm = onTarget.form / Math.max(onTarget.fitness, 1);
  const taperStart = addDays(target, -10);

  if (relativeForm < 0.05) {
    return {
      formOnTarget: onTarget.form,
      fitnessDropPct,
      status: "zu-muede",
      text: "Mit dem aktuellen Plan kommt der Athlet noch müde zum Wettkampf. Umfang in den letzten 10 Tagen deutlich reduzieren, Intensität (Renntempo, Sprints) beibehalten.",
      reduceTo: 50,
      taperStart,
    };
  }
  if (fitnessDropPct > 15) {
    return {
      formOnTarget: onTarget.form,
      fitnessDropPct,
      status: "zu-frisch",
      text: "Frisch, aber die Fitness sinkt bis zum Wettkampf stark. Tapering später beginnen oder kürzer halten, sonst geht Grundlage verloren.",
      reduceTo: 70,
      taperStart: addDays(target, -7),
    };
  }
  return {
    formOnTarget: onTarget.form,
    fitnessDropPct,
    status: "gut",
    text: "Der Plan passt: Der Athlet kommt ausgeruht zum Wettkampf und behält seine Fitness.",
    reduceTo: null,
    taperStart,
  };
}
