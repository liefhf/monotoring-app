/*
 * Laktat-Stufentest: Schwellen und persoenliche Belastungszonen.
 *
 * Grundlage (Studienheft "Spezielle Aspekte des Ausdauertrainings", Kap. 2.7/3.4/3.5):
 * - aerobe Schwelle ~ 2 mmol/l, aerob-anaerobe Schwelle (maxLass) ~ 4 mmol/l
 *   nach Mader et al. (1976) - nur mit festem Stufenprotokoll vergleichbar.
 * - Schwellen werden zwischen den Stufen linear interpoliert (auch die HF).
 * - Fixe Schwellen sind eine Orientierung; zusaetzlich wird der erste deutliche
 *   Anstieg ueber das Laktatbett ausgegeben (individuelle Schwelle, +1 mmol/l).
 *
 * Schwimmen: Geschwindigkeit = Stufenstrecke / Zeit; Tempo wird je 100 m angegeben.
 */

export type LactateStep = { time_ms: number; lactate: number; heart_rate?: number | null };

export type LactateTest = {
  id: string;
  swimmer_id: string;
  test_date: string;
  stroke: string;
  pool_length: number;
  step_distance: number;
  rest_lactate: number | null;
  steps: LactateStep[];
  note: string | null;
};

export type Threshold = { lactate: number; speed: number; pace100Ms: number; heartRate: number | null };

export type LactateAnalysis = {
  points: { speed: number; pace100Ms: number; lactate: number; heartRate: number | null }[];
  v2: Threshold | null;
  v4: Threshold | null;
  individual: Threshold | null;
  maxLactate: number;
  warnings: string[];
  zones: Zone[];
};

export type Zone = { code: string; label: string; lactate: string; fromPace: number | null; toPace: number | null };

const paceOf = (speed: number) => Math.round(100_000 / speed);

function interpolate(points: LactateAnalysis["points"], target: number): Threshold | null {
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1];
    const b = points[index];
    if (a.lactate <= target && b.lactate >= target && b.lactate > a.lactate) {
      const t = (target - a.lactate) / (b.lactate - a.lactate);
      const speed = a.speed + t * (b.speed - a.speed);
      const heartRate = a.heartRate != null && b.heartRate != null ? Math.round(a.heartRate + t * (b.heartRate - a.heartRate)) : null;
      return { lactate: target, speed, pace100Ms: paceOf(speed), heartRate };
    }
  }
  return null;
}

export function analyzeLactateTest(test: Pick<LactateTest, "steps" | "step_distance">): LactateAnalysis {
  const warnings: string[] = [];
  const points = test.steps
    .filter((step) => step.time_ms > 0 && step.lactate >= 0)
    .map((step) => {
      const speed = test.step_distance / (step.time_ms / 1000);
      return { speed, pace100Ms: paceOf(speed), lactate: step.lactate, heartRate: step.heart_rate ?? null };
    })
    .sort((a, b) => a.speed - b.speed);

  if (points.length < 3) warnings.push("Mindestens 3 Stufen nötig, damit Schwellen berechnet werden können.");
  const maxLactate = points.reduce((max, point) => Math.max(max, point.lactate), 0);
  if (points.length >= 3 && maxLactate < 4) warnings.push("4 mmol/l wurden nicht erreicht – Athlet nicht ausbelastet, anaerobe Schwelle nicht bestimmbar.");
  const minLactate = points.reduce((min, point) => Math.min(min, point.lactate), Infinity);
  if (points.length >= 3 && minLactate > 2) warnings.push("Schon die erste Stufe liegt über 2 mmol/l – Eingangstempo beim nächsten Test langsamer wählen.");

  const v2 = points.length >= 2 ? interpolate(points, 2) : null;
  const v4 = points.length >= 2 ? interpolate(points, 4) : null;
  /* Individuelle Schwelle: Laktatbett (niedrigster Wert) + 1 mmol/l */
  const individual = points.length >= 3 && Number.isFinite(minLactate) ? interpolate(points, Math.round((minLactate + 1) * 10) / 10) : null;

  return { points, v2, v4, individual, maxLactate, warnings, zones: zonesFrom(v2, v4) };
}

/*
 * Persoenliche Zonen (Tempo je 100 m), passend zu den Zonen der Trainingsplanung.
 * Grenzen ueber die Schwellengeschwindigkeiten:
 * BZ1 Rekom: langsamer als 90 % v2 · BZ2 GA1: 90-100 % v2 · BZ3 GA1: v2 bis Mitte v2/v4
 * BZ4 GA2: Mitte bis v4 · BZ5 GA2/Schwelle: v4 bis 103 % v4 · BZ6-8: nach Wettkampftempo
 */
export function zonesFrom(v2: Threshold | null, v4: Threshold | null): Zone[] {
  if (!v2 || !v4) return [];
  const mid = (v2.speed + v4.speed) / 2;
  const pace = (speed: number) => paceOf(speed);
  return [
    { code: "BZ1 (Rekom)", label: "Regeneration", lactate: "< 1,5", fromPace: null, toPace: pace(v2.speed * 0.9) },
    { code: "BZ2 (GA1)", label: "Grundlage extensiv", lactate: "1,5–2", fromPace: pace(v2.speed * 0.9), toPace: pace(v2.speed) },
    { code: "BZ3 (GA1)", label: "Grundlage", lactate: "2–3", fromPace: pace(v2.speed), toPace: pace(mid) },
    { code: "BZ4 (GA2)", label: "Grundlage intensiv", lactate: "3–4", fromPace: pace(mid), toPace: pace(v4.speed) },
    { code: "BZ5 (GA2)", label: "Schwelle", lactate: "≈ 4", fromPace: pace(v4.speed), toPace: pace(v4.speed * 1.03) },
    { code: "BZ6 (WA)", label: "Wettkampfausdauer", lactate: "> 4", fromPace: pace(v4.speed * 1.03), toPace: null },
  ];
}

/* Veraenderung der Schwellen zum vorherigen Test (positiv = schneller) */
export function thresholdChange(current: Threshold | null, previous: Threshold | null) {
  if (!current || !previous) return null;
  return ((current.speed - previous.speed) / previous.speed) * 100;
}

/* "1:22,5" je 100 m */
export function formatPace(ms: number) {
  const tenths = Math.round(ms / 100);
  const minutes = Math.floor(tenths / 600);
  const seconds = ((tenths % 600) / 10).toFixed(1).padStart(4, "0").replace(".", ",");
  return `${minutes}:${seconds}`;
}
