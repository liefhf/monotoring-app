/*
 * Belastungs-Monitoring und Hinweise fuer den Coach (reine Berechnung, ohne Datenbank).
 *
 * Trainingsbelastung (Session-RPE nach Foster): RPE (1-10) x Dauer in Minuten.
 *   Hat der Athlet kein Feedback gegeben, aber war laut Anwesenheit da,
 *   wird die geplante Belastung des Trainers genommen (als "geschaetzt").
 *
 * Belastungsaenderung: Summe der letzten 7 Tage verglichen mit dem
 *   Wochenschnitt der 3 Wochen DAVOR (Tage 7-27, "entkoppelt").
 *   Bewusst KEINE Verletzungsprognose: Das klassische ACWR (7 zu 28 Tage)
 *   ist mathematisch gekoppelt und als Einzelwert fuer Verletzungsrisiko
 *   nicht belastbar (Impellizzeri et al. 2020/2021, Lolli et al. 2019).
 *   Der Wert beschreibt nur, ob die Woche deutlich vom Gewohnten abweicht -
 *   das ist fuer die Trainingssteuerung relevant, mehr nicht.
 *   Aussagekraeftig erst mit mindestens 3 Wochen Daten.
 */

export type LoadEntry = { date: string; load: number; estimated: boolean };

export type AcwrZone = "zu-wenig-daten" | "niedriger" | "ueblich" | "hoeher" | "deutlich-hoeher";

export type Acwr = {
  acute: number;
  chronicWeekly: number;
  /* Verhaeltnis akut / gewohnt (1 = wie sonst) */
  ratio: number | null;
  /* Abweichung in Prozent (+40 = 40 % mehr als gewohnt) */
  changePercent: number | null;
  zone: AcwrZone;
  daysWithData: number;
};

export const ACWR_ZONES: Record<AcwrZone, { label: string; tone: "good" | "warn" | "bad" | "muted" }> = {
  "zu-wenig-daten": { label: "zu wenig Daten", tone: "muted" },
  niedriger: { label: "deutlich weniger als gewohnt", tone: "muted" },
  ueblich: { label: "im gewohnten Bereich", tone: "good" },
  hoeher: { label: "höher als gewohnt", tone: "warn" },
  "deutlich-hoeher": { label: "deutlich höher als gewohnt", tone: "bad" },
};

const DAY = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);

export function sessionLoad(rpe: number | null, minutes: number | null) {
  if (!rpe || !minutes) return 0;
  return rpe * minutes;
}

/* Name bleibt "acwr", damit bestehende Aufrufer weiter funktionieren. */
export function acwr(entries: LoadEntry[], today: string): Acwr {
  const between = (from: number, to: number) =>
    entries.filter((entry) => {
      const age = daysBetween(entry.date, today);
      return age >= from && age < to;
    });
  const acute = between(0, 7).reduce((sum, entry) => sum + entry.load, 0);
  const chronicWeekly = between(7, 28).reduce((sum, entry) => sum + entry.load, 0) / 3;
  const ages = entries.map((entry) => daysBetween(entry.date, today)).filter((age) => age >= 0);
  const daysWithData = ages.length ? Math.max(...ages) + 1 : 0;

  if (daysWithData < 21 || chronicWeekly <= 0) {
    return { acute, chronicWeekly, ratio: null, changePercent: null, zone: "zu-wenig-daten", daysWithData };
  }
  const ratio = acute / chronicWeekly;
  const zone: AcwrZone = ratio >= 1.5 ? "deutlich-hoeher" : ratio >= 1.3 ? "hoeher" : ratio < 0.6 ? "niedriger" : "ueblich";
  return { acute, chronicWeekly, ratio, changePercent: Math.round((ratio - 1) * 100), zone, daysWithData };
}

/* Befinden: Durchschnitt der fuenf Skalen (1-10, hoeher = besser), wie im Dashboard */
export function wellnessScore(entry: { sleep_quality: number; energy: number; muscle_feeling: number; stress: number; mood: number }) {
  return (entry.sleep_quality + entry.energy + entry.muscle_feeling + entry.stress + entry.mood) / 5;
}

export type FlagLevel = "rot" | "gelb";

/*
 * Ein Hinweis erklaert immer drei Dinge (keine Diagnose, keine Risiko-Prozente):
 *   text   - was wurde erkannt (kurz, fuer Listen)
 *   reason - warum ist das relevant
 *   check  - was sollte der Trainer pruefen
 */
export type Flag = {
  level: FlagLevel;
  kind: "acwr" | "schmerz" | "befinden" | "anwesenheit" | "checkin" | "gesundheit";
  text: string;
  reason: string;
  check: string;
};

export function buildFlags({
  acwr: load,
  painReports,
  wellness,
  attendanceRate,
  lastCheckIn = null,
  today,
}: {
  acwr: Acwr | null;
  /* Schmerzmeldungen der letzten Tage (created_at ISO, pain_level 0-10, spot_label) */
  painReports: { created_at: string; pain_level: number; spot_label: string | null; body_region: string | null }[];
  /* Befinden-Eintraege (neueste zuerst); score = Readiness 0-100, belowBaseline = deutlich unter eigenem Schnitt */
  wellness: { entry_date: string; score: number; belowBaseline?: boolean }[];
  attendanceRate: number | null;
  /* letzter Check-in (YYYY-MM-DD); null = Athlet hat nie eingecheckt oder keinen Login */
  lastCheckIn?: string | null;
  today: string;
}): Flag[] {
  const flags: Flag[] = [];

  if (load?.changePercent != null && (load.zone === "deutlich-hoeher" || load.zone === "hoeher")) {
    flags.push({
      level: load.zone === "deutlich-hoeher" ? "rot" : "gelb",
      kind: "acwr",
      text: `Belastung ${load.changePercent} % über dem Schnitt der Vorwochen`,
      reason: "Sprunghafte Belastungssteigerungen werden schlechter vertragen als schrittweise.",
      check: "Befinden und Schmerzen im Blick behalten; Steigerung ggf. über mehrere Wochen verteilen.",
    });
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
      text: `Schmerzen${where ? ` ${where}` : ""}: ${max}/10${rising ? ", zunehmend" : ""}`,
      reason: rising ? "Zunehmende Schmerzen über mehrere Tage sind ein Warnzeichen für Überlastung." : "Schmerzen beeinflussen Technik und Belastbarkeit.",
      check: max >= 6 || rising ? "Mit dem Athleten sprechen, Belastung anpassen, bei Bedarf ärztlich abklären lassen." : "Nachfragen und beim Training beobachten.",
    });
  }

  /* Befinden: letzter Eintrag der letzten 3 Tage, dazu Verlauf ueber mehrere Tage */
  const recent = wellness.filter((entry) => daysBetween(entry.entry_date, today) <= 2);
  const latest = recent[0];
  if (latest) {
    const lowDays = wellness.slice(0, 3).filter((entry) => daysBetween(entry.entry_date, today) <= 4 && (entry.score < 65 || entry.belowBaseline)).length;
    const persistent = lowDays >= 3;
    if (latest.score < 50 || (persistent && latest.score < 65)) {
      flags.push({
        level: "rot",
        kind: "befinden",
        text: persistent ? "Befinden seit mehreren Tagen deutlich reduziert" : `Befinden heute deutlich reduziert (${latest.score}/100)`,
        reason: "Anhaltend schlechtes Befinden deutet auf unzureichende Erholung hin.",
        check: "Gespräch suchen (Schlaf, Schule, Krankheit?) und Belastung heute reduzieren.",
      });
    } else if (latest.score < 65 || latest.belowBaseline) {
      flags.push({
        level: "gelb",
        kind: "befinden",
        text: latest.belowBaseline ? "Befinden unter dem eigenen Durchschnitt" : `Befinden heute eingeschränkt (${latest.score}/100)`,
        reason: "Einzelne schlechte Tage sind normal, wiederholte sind ein Signal.",
        check: "Kurz nachfragen; morgen erneut ansehen.",
      });
    }
  }

  /* Fehlende Check-ins: ohne Rueckmeldung ist der Athlet fuer das Monitoring unsichtbar */
  if (lastCheckIn) {
    const silent = daysBetween(lastCheckIn, today);
    if (silent >= 4) {
      flags.push({
        level: "gelb",
        kind: "checkin",
        text: `Seit ${silent} Tagen kein Check-in`,
        reason: "Ohne Rückmeldung fehlen Befinden und Schmerzen in der Übersicht.",
        check: "Athleten an den täglichen Check-in erinnern.",
      });
    }
  }

  if (attendanceRate !== null && attendanceRate < 70) {
    flags.push({
      level: attendanceRate < 50 ? "rot" : "gelb",
      kind: "anwesenheit",
      text: `Anwesenheit ${attendanceRate} % (letzte 4 Wochen)`,
      reason: "Unregelmäßiges Training erschwert Belastungssteuerung und Leistungsentwicklung.",
      check: "Gründe klären (Krankheit, Schule, Motivation).",
    });
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
  /* Beschreibend statt vorschreibend: die Entscheidung trifft der Trainer im Gespraech */
  const label = level === "bereit" ? "Gutes Befinden" : level === "vorsicht" ? "Befinden eingeschränkt" : "Befinden deutlich reduziert – sprich mit deinem Trainer";
  return { score, level, label, hints };
}
