import { SwimEvent, SwimmerResult } from "@/lib/swim";

/*
 * Zeit-Prognose zum Saisonhoehepunkt.
 *
 * Methode (bewusst vorsichtig):
 * - Pro Monat zaehlt nur die schnellste Zeit (ein schlechter Tag verzerrt nicht).
 * - Daraus eine Trendlinie auf log(Zeit) ueber die letzten 12 Monate.
 * - Die Verbesserung wird begrenzt: hoechstens 1 % pro Monat, und eine
 *   Verschlechterung wird nicht fortgeschrieben (Prognose <= Bestzeit).
 * - Die Streuung der Monatsbestzeiten um die Linie ergibt die Spanne und
 *   daraus die Chance, eine Pflichtzeit zu erreichen.
 * Mindestens 3 Monate mit Zeiten, sonst keine Prognose.
 */

const DAY = 86_400_000;
const MAX_MONTHLY_GAIN = 0.01;

export type Forecast = {
  event: SwimEvent;
  pool: number;
  best: SwimmerResult;
  points: number;
  /* Veraenderung pro Monat in Prozent (negativ = schneller) */
  monthlyChangePct: number;
  predictedMs: number;
  lowMs: number;
  highMs: number;
};

function normalCdf(z: number) {
  /* Abramowitz-Stegun-Naeherung */
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp((-z * z) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}

export function forecastEvent(results: SwimmerResult[], event: SwimEvent, pool: number, today: string, target: string): Forecast | null {
  const since = new Date(Date.parse(today) - 365 * DAY).toISOString().slice(0, 10);
  const own = results.filter(
    (result) => result.distance === event.distance && result.stroke === event.stroke && result.pool_length === pool && result.result_date >= since && result.result_date <= today
  );
  if (own.length === 0) return null;

  const monthly = new Map<string, SwimmerResult>();
  for (const result of own) {
    const key = result.result_date.slice(0, 7);
    const current = monthly.get(key);
    if (!current || result.time_ms < current.time_ms) monthly.set(key, result);
  }
  const points = [...monthly.values()].sort((a, b) => a.result_date.localeCompare(b.result_date));
  const best = own.reduce((top, result) => (result.time_ms < top.time_ms ? result : top));
  if (points.length < 3) return null;

  const xs = points.map((point) => (Date.parse(point.result_date) - Date.parse(today)) / DAY);
  const ys = points.map((point) => Math.log(point.time_ms));
  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const mx = mean(xs);
  const my = mean(ys);
  const sxx = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  let slope = sxx > 0 ? xs.reduce((sum, x, index) => sum + (x - mx) * (ys[index] - my), 0) / sxx : 0;

  /* Begrenzen: max. 1,5 % Verbesserung pro Monat, keine Verschlechterung fortschreiben */
  const maxSlope = Math.log(1 - MAX_MONTHLY_GAIN) / 30;
  slope = Math.min(0, Math.max(slope, maxSlope));

  const intercept = my - slope * mx;
  const residuals = ys.map((y, index) => y - (intercept + slope * xs[index]));
  const sigma = Math.max(0.005, Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / Math.max(1, residuals.length - 2)));

  const days = Math.max(0, (Date.parse(target) - Date.parse(today)) / DAY);
  /* Ausgangspunkt: aktuelle Bestzeit, nicht die Linie - die Linie gibt nur die Richtung */
  const predictedMs = Math.min(best.time_ms, Math.round(best.time_ms * Math.exp(slope * days)));

  return {
    event,
    pool,
    best,
    points: points.length,
    monthlyChangePct: (Math.exp(slope * 30) - 1) * 100,
    predictedMs,
    lowMs: Math.round(predictedMs * Math.exp(-sigma)),
    highMs: Math.min(Math.round(predictedMs * Math.exp(sigma)), Math.round(best.time_ms * Math.exp(sigma))),
  };
}

/* Chance (0-100 %), die Pflichtzeit zum Zieltermin zu schaffen */
export function reachChance(forecast: Forecast, requiredMs: number) {
  if (forecast.best.time_ms <= requiredMs) return 100;
  const sigma = Math.log(forecast.highMs / forecast.predictedMs) || 0.005;
  const z = (Math.log(requiredMs) - Math.log(forecast.predictedMs)) / sigma;
  return Math.round(normalCdf(z) * 100);
}
