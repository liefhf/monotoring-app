/*
 * Auswertung von Serienzeiten (Training, NICHT Wettkampf).
 *
 * Definitionen (alle reproduzierbar, siehe setAnalysis.test.ts):
 *   gueltige Zeit   = erfasste Zeit einer geschwommenen Wiederholung.
 *                     "nicht geschwommen" und "nicht erfasst" zaehlen NIE als 0.
 *   Durchschnitt    = arithmetisches Mittel der gueltigen Zeiten.
 *   Streuung        = Standardabweichung (Stichprobe) der gueltigen Zeiten,
 *                     erst ab 3 Zeiten. Gleichmaessigkeit = Streuung in % des Mittels.
 *   Verlauf         = Mittel des letzten Drittels minus Mittel des ersten Drittels
 *                     (nach Reihenfolge der gueltigen Zeiten), erst ab 6 Zeiten.
 *                     Positiv = gegen Ende langsamer.
 *   Auffaellig      = Wiederholung mehr als 3 % langsamer oder schneller als der
 *                     Median, erst ab 4 Zeiten. Ein Einzelwert ist kein Trend.
 *   Sollzeit        = nur eine AUSDRUECKLICH hinterlegte Zielzeit je Wiederholung.
 *                     Der Abgang (@3:00) ist KEINE Sollzeit.
 *   Vergleichbar    = gleiche Strecke, Lage, Beckenlaenge, Anzahl, Abgang/Pause
 *                     und Hilfsmittel. Fehlt eine Angabe, gilt "nicht sicher vergleichbar".
 *
 * Die Schwellen (3 %, 1,5 %) sind pragmatische Setzungen zur Orientierung,
 * keine individuell gesicherten Grenzwerte.
 */

export type SeriesContext = {
  distance: number | null;
  repetitions: number | null;
  stroke: string | null;
  pool_length: number | null;
  interval_seconds: number | null;
  interval_type: string | null;
  materials: string[] | null;
};

export type SeriesEntry = SeriesContext & {
  times_ms: (number | null)[];
  missed_reps: number[] | null;
  target_ms: number | null;
};

export type SeriesStats = {
  planned: number;
  valid: number;
  missed: number;
  notRecorded: number;
  meanMs: number | null;
  bestMs: number | null;
  bestRep: number | null;
  worstMs: number | null;
  worstRep: number | null;
  sdMs: number | null;
  cvPercent: number | null;
  /* letztes Drittel minus erstes Drittel; positiv = langsamer */
  trendMs: number | null;
  targetHits: number | null;
  targetMeanDiffMs: number | null;
  outliers: { rep: number; diffPercent: number }[];
};

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export function seriesStats(entry: Pick<SeriesEntry, "times_ms" | "missed_reps" | "target_ms" | "repetitions">): SeriesStats {
  const planned = Math.max(entry.repetitions ?? 0, entry.times_ms.length);
  const missedSet = new Set(entry.missed_reps ?? []);
  const reps: { rep: number; ms: number }[] = [];
  let notRecorded = 0;
  for (let i = 0; i < planned; i++) {
    const rep = i + 1;
    if (missedSet.has(rep)) continue;
    const ms = entry.times_ms[i];
    if (ms === null || ms === undefined) notRecorded++;
    else reps.push({ rep, ms });
  }
  const values = reps.map((r) => r.ms);
  const n = values.length;
  const meanMs = n ? mean(values) : null;
  const best = n ? reps.reduce((a, b) => (b.ms < a.ms ? b : a)) : null;
  const worst = n ? reps.reduce((a, b) => (b.ms > a.ms ? b : a)) : null;
  const sdMs = n >= 3 && meanMs !== null ? Math.sqrt(values.reduce((s, v) => s + (v - meanMs) ** 2, 0) / (n - 1)) : null;
  const third = Math.floor(n / 3);
  const trendMs = n >= 6 ? mean(values.slice(n - third)) - mean(values.slice(0, third)) : null;
  const med = n >= 4 ? median(values) : null;
  const outliers =
    med === null
      ? []
      : reps
          .map((r) => ({ rep: r.rep, diffPercent: Math.round(((r.ms - med) / med) * 1000) / 10 }))
          .filter((r) => Math.abs(r.diffPercent) > 3);
  const target = entry.target_ms;
  return {
    planned,
    valid: n,
    missed: [...missedSet].filter((rep) => rep >= 1 && rep <= planned).length,
    notRecorded,
    meanMs,
    bestMs: best?.ms ?? null,
    bestRep: best?.rep ?? null,
    worstMs: worst?.ms ?? null,
    worstRep: worst?.rep ?? null,
    sdMs,
    cvPercent: sdMs !== null && meanMs ? Math.round((sdMs / meanMs) * 1000) / 10 : null,
    trendMs,
    targetHits: target && n ? values.filter((v) => v <= target).length : null,
    targetMeanDiffMs: target && meanMs !== null ? meanMs - target : null,
    outliers,
  };
}

const FIELD_LABELS: Record<keyof SeriesContext, string> = {
  distance: "Strecke",
  repetitions: "Anzahl Wiederholungen",
  stroke: "Lage",
  pool_length: "Beckenlänge",
  interval_seconds: "Abgang/Pause",
  interval_type: "Art des Abgangs",
  materials: "Hilfsmittel",
};

/* Vergleichbarkeit zweier Serien. Fehlende Angaben machen den Vergleich unsicher. */
export function comparability(a: SeriesContext, b: SeriesContext): { comparable: boolean; differences: string[]; unknown: string[] } {
  const differences: string[] = [];
  const unknown: string[] = [];
  for (const key of Object.keys(FIELD_LABELS) as (keyof SeriesContext)[]) {
    const x = a[key];
    const y = b[key];
    if (key === "materials") {
      const norm = (v: string[] | null) => [...(v ?? [])].sort().join(",");
      if (norm(x as string[] | null) !== norm(y as string[] | null)) differences.push(FIELD_LABELS[key]);
      continue;
    }
    if (x === null || y === null || x === undefined || y === undefined) {
      unknown.push(FIELD_LABELS[key]);
      continue;
    }
    if (x !== y) differences.push(FIELD_LABELS[key]);
  }
  return { comparable: differences.length === 0 && unknown.length === 0, differences, unknown };
}

export type Finding = { observation: string; context: string; action: string };

const sec = (ms: number) => (Math.abs(ms) / 1000).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/*
 * Rueckschluesse in drei Teilen: Beobachtung, Einordnung, was zu pruefen ist.
 * Keine Ursachen, keine Diagnosen. Wird nur erzeugt, wenn die Datenlage reicht.
 */
export function seriesFindings(stats: SeriesStats, opts: { previous?: { stats: SeriesStats; date: string; comparable: boolean } | null; rpe?: number | null } = {}): Finding[] {
  const findings: Finding[] = [];
  if (stats.trendMs !== null && stats.meanMs) {
    const pct = (stats.trendMs / stats.meanMs) * 100;
    if (pct > 1.5) {
      findings.push({
        observation: `Das letzte Drittel war im Schnitt ${sec(stats.trendMs)} s langsamer als das erste.`,
        context: `Vergleich innerhalb dieser Serie (${stats.valid} gültige Zeiten).`,
        action: "Prüfe, ob das Tempo absichtlich verändert wurde oder die Serie zu anspruchsvoll war.",
      });
    } else if (pct < -1.5) {
      findings.push({
        observation: `Das letzte Drittel war im Schnitt ${sec(stats.trendMs)} s schneller als das erste.`,
        context: `Vergleich innerhalb dieser Serie (${stats.valid} gültige Zeiten).`,
        action: "Prüfe, ob eine Steigerung vorgesehen war oder der Beginn zu verhalten geschwommen wurde.",
      });
    }
  }
  if (stats.targetHits !== null && stats.targetMeanDiffMs !== null && stats.valid > 0) {
    findings.push({
      observation: `${stats.targetHits} von ${stats.valid} gültigen Wiederholungen innerhalb der Sollzeit (Schnitt ${stats.targetMeanDiffMs > 0 ? "+" : "−"}${sec(stats.targetMeanDiffMs)} s).`,
      context: "Vergleich mit der hinterlegten Sollzeit.",
      action: stats.targetHits < stats.valid / 2 ? "Prüfe, ob die Sollzeit zum aktuellen Leistungsstand passt." : "Sollzeit überwiegend getroffen – Vorgabe beibehalten oder anpassen.",
    });
  }
  for (const outlier of stats.outliers) {
    findings.push({
      observation: `Wiederholung ${outlier.rep} weicht ${outlier.diffPercent > 0 ? "+" : ""}${outlier.diffPercent.toLocaleString("de-DE")} % vom Median ab.`,
      context: "Einzelwert – kein Trend.",
      action: "Prüfe Eingabe oder Besonderheit (Start, Wende, Störung).",
    });
  }
  if (opts.previous) {
    const prev = opts.previous;
    if (!prev.comparable) {
      findings.push({
        observation: `Es gibt eine frühere Serie vom ${prev.date.split("-").reverse().join(".")}, aber sie ist nicht sicher vergleichbar.`,
        context: "Unterschiedliche oder fehlende Bedingungen.",
        action: "Keine Leistungsentwicklung daraus ableiten.",
      });
    } else if (prev.stats.meanMs !== null && stats.meanMs !== null) {
      const diff = stats.meanMs - prev.stats.meanMs;
      findings.push({
        observation: `Schnitt ${diff <= 0 ? sec(diff) + " s schneller" : sec(diff) + " s langsamer"} als bei der vergleichbaren Serie am ${prev.date.split("-").reverse().join(".")}.`,
        context: `Gleiche Strecke, Lage, Becken, Anzahl, Abgang und Hilfsmittel (${prev.stats.valid} vs. ${stats.valid} gültige Zeiten).`,
        action: "Ein Vergleich zweier Tage ist noch kein Trend – Verlauf über mehrere Wochen ansehen.",
      });
    }
  }
  if (opts.rpe != null && stats.trendMs !== null) {
    findings.push({
      observation: `Berichtete Anstrengung der Einheit: ${opts.rpe}/10.`,
      context: "Rückmeldung zur ganzen Einheit, nicht nur zu dieser Serie.",
      action: "Mit dem Zeitverlauf gemeinsam ansehen; ein Zusammenhang ist damit nicht bewiesen.",
    });
  }
  return findings;
}

/* Was fehlt fuer eine belastbare Einschaetzung? */
export function seriesGaps(stats: SeriesStats, ctx: SeriesContext & { target_ms: number | null }, hasPrevious: boolean): string[] {
  const gaps: string[] = [];
  if (stats.notRecorded) gaps.push(`${stats.notRecorded} Wiederholung${stats.notRecorded === 1 ? "" : "en"} nicht erfasst`);
  if (stats.missed) gaps.push(`${stats.missed} nicht geschwommen`);
  if (stats.valid < 3) gaps.push("weniger als 3 Zeiten – keine Aussage zur Gleichmäßigkeit");
  else if (stats.valid < 6) gaps.push("weniger als 6 Zeiten – keine Aussage zum Verlauf");
  if (!ctx.target_ms) gaps.push("keine Sollzeit hinterlegt");
  if (!ctx.pool_length) gaps.push("Beckenlänge unbekannt");
  if (!hasPrevious) gaps.push("keine frühere vergleichbare Serie");
  return gaps;
}

/* Einfache Aussage fuer Athleten (ohne Fachbegriffe, ohne Wertung) */
export function athleteSummary(stats: SeriesStats) {
  if (!stats.valid) return null;
  const parts = [`Deine schnellste Zeit: ${stats.bestMs !== null ? formatShort(stats.bestMs) : "–"}`];
  if (stats.targetHits !== null) parts.push(`${stats.targetHits} von ${stats.valid} in deiner Zielzeit`);
  return parts.join(" · ");
}

function formatShort(ms: number) {
  const total = Math.round(ms / 10);
  const m = Math.floor(total / 6000);
  const s = ((total % 6000) / 100).toFixed(2).replace(".", ",");
  return m ? `${m}:${s.padStart(5, "0")}` : s;
}
