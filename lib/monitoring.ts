/*
 * Belastungs-Monitoring und "Rote Flaggen" (reine Berechnung, ohne Datenbank).
 *
 * Trainingsbelastung (Session-RPE): RPE (1-10) x Dauer in Minuten.
 *   Hat der Athlet kein Feedback gegeben, aber war laut Anwesenheit da,
 *   wird die geplante Belastung des Trainers genommen (als "geschaetzt").
 * ACWR: Summe der letzten 7 Tage (akut) geteilt durch den Wochenschnitt
 *   der letzten 28 Tage (chronisch). Aussagekraeftig erst ab 3 Wochen Daten.
 *   < 0,8 Unterbelastung · 0,8-1,3 optimal · 1,3-1,5 erhoeht · > 1,5 Gefahr
 */

export type LoadEntry = { date: string; load: number; estimated: boolean };

export type AcwrZone = "zu-wenig-daten" | "niedrig" | "optimal" | "erhoeht" | "gefahr";

export type Acwr = {
  acute: number;
  chronicWeekly: number;
  ratio: number | null;
  zone: AcwrZone;
  daysWithData: number;
};

export const ACWR_ZONES: Record<AcwrZone, { label: string; tone: "good" | "warn" | "bad" | "muted" }> = {
  "zu-wenig-daten": { label: "zu wenig Daten", tone: "muted" },
  niedrig: { label: "Unterbelastung", tone: "warn" },
  optimal: { label: "optimal", tone: "good" },
  erhoeht: { label: "erhöht", tone: "warn" },
  gefahr: { label: "Gefahrenzone", tone: "bad" },
};

const DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export function sessionLoad(rpe: number | null, minutes: number | null) {
  if (!rpe || !minutes) return 0;
  return rpe * minutes;
}

export function acwr(entries: LoadEntry[], today: string): Acwr {
  const inWindow = (days: number) =>
    entries.filter((entry) => {
      const age = daysBetween(entry.date, today);
      return age >= 0 && age < days;
    });
  const acute = inWindow(7).reduce((sum, entry) => sum + entry.load, 0);
  const chronicTotal = inWindow(28).reduce((sum, entry) => sum + entry.load, 0);
  const chronicWeekly = chronicTotal / 4;
  const oldest = entries.filter((entry) => daysBetween(entry.date, today) >= 0).map((entry) => daysBetween(entry.date, today));
  const daysWithData = oldest.length ? Math.max(...oldest) + 1 : 0;

  if (daysWithData < 21 || chronicWeekly <= 0) {
    return { acute, chronicWeekly, ratio: null, zone: "zu-wenig-daten", daysWithData };
  }
  const ratio = acute / chronicWeekly;
  const zone: AcwrZone = ratio > 1.5 ? "gefahr" : ratio > 1.3 ? "erhoeht" : ratio < 0.8 ? "niedrig" : "optimal";
  return { acute, chronicWeekly, ratio, zone, daysWithData };
}

/* Befinden: Durchschnitt der fuenf Skalen (1-10, hoeher = besser), wie im Dashboard */
export function wellnessScore(entry: { sleep_quality: number; energy: number; muscle_feeling: number; stress: number; mood: number }) {
  return (entry.sleep_quality + entry.energy + entry.muscle_feeling + entry.stress + entry.mood) / 5;
}

export type FlagLevel = "rot" | "gelb";
export type Flag = { level: FlagLevel; kind: "acwr" | "schmerz" | "befinden" | "anwesenheit"; text: string };

export function buildFlags({
  acwr: load,
  painReports,
  wellness,
  attendanceRate,
  today,
}: {
  acwr: Acwr | null;
  /* Schmerzmeldungen der letzten Tage (created_at ISO, pain_level 0-10, spot_label) */
  painReports: { created_at: string; pain_level: number; spot_label: string | null; body_region: string | null }[];
  /* Befinden-Eintraege (neueste zuerst); score = Readiness 0-100 */
  wellness: { entry_date: string; score: number }[];
  attendanceRate: number | null;
  today: string;
}): Flag[] {
  const flags: Flag[] = [];

  if (load?.ratio != null) {
    const value = load.ratio.toFixed(2).replace(".", ",");
    if (load.zone === "gefahr") flags.push({ level: "rot", kind: "acwr", text: `ACWR ${value} – Belastung stark gestiegen (Verletzungsrisiko)` });
    else if (load.zone === "erhoeht") flags.push({ level: "gelb", kind: "acwr", text: `ACWR ${value} – Belastung erhöht` });
  }

  /* Schmerzen der letzten 3 Tage: stark (ab 6) oder steigend -> rot, sonst gelb */
  const recentPain = painReports
    .filter((report) => daysBetween(report.created_at.slice(0, 10), today) <= 2)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (recentPain.length) {
    const byDay = new Map<string, number>();
    for (const report of recentPain) {
      const day = report.created_at.slice(0, 10);
      byDay.set(day, Math.max(byDay.get(day) ?? 0, report.pain_level));
    }
    const levels = [...byDay.values()];
    const rising = levels.length >= 2 && levels.every((level, index) => index === 0 || level >= levels[index - 1]) && levels[levels.length - 1] > levels[0];
    const max = Math.max(...levels);
    const where = [...new Set(recentPain.map((report) => report.spot_label ?? report.body_region).filter(Boolean))].join(", ");
    flags.push({
      level: max >= 6 || rising ? "rot" : "gelb",
      kind: "schmerz",
      text: `Schmerzen${where ? ` (${where})` : ""}: stärkste ${max}/10${rising ? ", zunehmend" : ""}`,
    });
  }

  /* Befinden: letzter Eintrag der letzten 3 Tage */
  const latest = wellness.find((entry) => daysBetween(entry.entry_date, today) <= 2);
  if (latest) {
    if (latest.score < 50) flags.push({ level: "rot", kind: "befinden", text: `Readiness ${latest.score}/100 – Regeneration empfohlen` });
    else if (latest.score < 65) flags.push({ level: "gelb", kind: "befinden", text: `Readiness ${latest.score}/100 – mit Vorsicht` });
  }

  if (attendanceRate !== null && attendanceRate < 70) {
    flags.push({ level: attendanceRate < 50 ? "rot" : "gelb", kind: "anwesenheit", text: `Anwesenheit ${attendanceRate} % (letzte 4 Wochen)` });
  }

  return flags.sort((a, b) => (a.level === b.level ? 0 : a.level === "rot" ? -1 : 1));
}

/*
 * Daily Readiness (Bereitschaft 0-100) aus dem Morgen-Check-in.
 * Grundwert: Durchschnitt der fuenf Skalen (1-10) x 10.
 * Abzuege: wenig Schlaf (unter 8 h: -4 je fehlender Stunde, max. -16),
 * Schmerzen (-10), deutlich schlechter als der eigene Durchschnitt der
 * letzten 2 Wochen (ab 1,5 Punkte darunter: -10).
 * >= 70 bereit · 50-69 mit Vorsicht · < 50 Regeneration
 */
export type ReadinessInput = {
  sleep_quality: number;
  energy: number;
  muscle_feeling: number;
  stress: number;
  mood: number;
  sleep_hours?: number | null;
  has_pain?: boolean | null;
};

export type Readiness = { score: number; level: "bereit" | "vorsicht" | "regeneration"; label: string; hints: string[] };

export function readinessScore(entry: ReadinessInput, baseline: number | null = null): Readiness {
  const base = wellnessScore(entry);
  let score = base * 10;
  const hints: string[] = [];

  if (entry.sleep_hours != null && entry.sleep_hours < 8) {
    const minus = Math.min(16, Math.round((8 - entry.sleep_hours) * 4));
    score -= minus;
    hints.push(`wenig Schlaf (${String(entry.sleep_hours).replace(".", ",")} h)`);
  }
  if (entry.has_pain) {
    score -= 10;
    hints.push("Schmerzen gemeldet");
  }
  if (baseline !== null && base <= baseline - 1.5) {
    score -= 10;
    hints.push("deutlich unter dem eigenen Durchschnitt");
  }
  const weakest = (
    [
      ["Schlafqualität", entry.sleep_quality],
      ["Energie", entry.energy],
      ["Muskelgefühl", entry.muscle_feeling],
      ["Stress", entry.stress],
      ["Stimmung", entry.mood],
    ] as [string, number][]
  ).filter(([, value]) => value <= 4);
  if (weakest.length) hints.push(`niedrig: ${weakest.map(([label]) => label).join(", ")}`);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level = score >= 70 ? "bereit" : score >= 50 ? "vorsicht" : "regeneration";
  const label = level === "bereit" ? "Bereit für volles Training" : level === "vorsicht" ? "Mit Vorsicht trainieren" : "Regeneration empfohlen";
  return { score, level, label, hints };
}
