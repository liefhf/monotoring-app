import { SwimmerResult } from "@/lib/swim";
import { sessionLoad } from "@/lib/monitoring";

/*
 * Wochenbericht (reine Berechnung): was ist in einer Trainingswoche
 * passiert? Nur Kennzahlen mit Handlungswert:
 *   - Umfang und Einheiten (Wasser/Land), Session-RPE geplant vs. gemeldet
 *   - Anwesenheit und wer weniger als 70 % da war
 *   - Check-in-Beteiligung (ohne Check-ins kein Monitoring)
 *   - neue persoenliche Bestzeiten
 */

export type ReportSession = {
  id: string;
  session_date: string;
  training_type: string | null;
  total_meters: number | null;
  duration_minutes: number | null;
  planned_rpe?: number | null;
};

export type ReportAttendance = { training_session_id: string; swimmer_id: string; status: string };
export type ReportFeedback = { training_session_id: string; athlete_id: string; rpe: number | null };

export function trainingSummary(sessions: ReportSession[], feedback: ReportFeedback[]) {
  const water = sessions.filter((session) => session.training_type !== "land");
  const minutes = sessions.reduce((sum, session) => sum + (session.duration_minutes ?? 0), 0);
  const plannedLoad = sessions.reduce((sum, session) => sum + sessionLoad(session.planned_rpe ?? null, session.duration_minutes), 0);
  const byId = new Map(sessions.map((session) => [session.id, session]));
  const rated = feedback.filter((item) => item.rpe && byId.has(item.training_session_id));
  const avgReportedRpe = rated.length ? rated.reduce((sum, item) => sum + (item.rpe ?? 0), 0) / rated.length : null;
  const plannedRpes = sessions.filter((session) => session.planned_rpe);
  const avgPlannedRpe = plannedRpes.length ? plannedRpes.reduce((sum, session) => sum + (session.planned_rpe ?? 0), 0) / plannedRpes.length : null;
  return {
    sessions: sessions.length,
    landSessions: sessions.length - water.length,
    waterMeters: water.reduce((sum, session) => sum + (session.total_meters ?? 0), 0),
    minutes,
    plannedLoad,
    avgPlannedRpe,
    avgReportedRpe,
    feedbackCount: rated.length,
  };
}

export function attendanceSummary(attendance: ReportAttendance[], swimmerIds: string[]) {
  const per = swimmerIds.map((id) => {
    const own = attendance.filter((item) => item.swimmer_id === id);
    const present = own.filter((item) => item.status === "anwesend").length;
    return { swimmerId: id, total: own.length, present, rate: own.length ? Math.round((present / own.length) * 100) : null };
  });
  const total = attendance.length;
  const present = attendance.filter((item) => item.status === "anwesend").length;
  return {
    rate: total ? Math.round((present / total) * 100) : null,
    low: per.filter((item) => item.rate !== null && item.rate < 70).sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0)),
  };
}

/* Check-in-Beteiligung: Anteil der Athleten mit Login, die an mind. 4 von 7 Tagen eingecheckt haben */
export function checkInSummary(entries: { athlete_id: string; entry_date: string }[], profileIds: string[]) {
  const daysPer = new Map<string, Set<string>>();
  for (const entry of entries) {
    if (!daysPer.has(entry.athlete_id)) daysPer.set(entry.athlete_id, new Set());
    daysPer.get(entry.athlete_id)!.add(entry.entry_date);
  }
  const regular = profileIds.filter((id) => (daysPer.get(id)?.size ?? 0) >= 4);
  const missing = profileIds.filter((id) => !daysPer.get(id)?.size);
  return { withLogin: profileIds.length, regular: regular.length, missing };
}

/*
 * Neue persoenliche Bestzeiten in der Woche: Zeit in [from, to] schneller
 * als alles davor auf derselben Strecke und Bahn. Offizielle Zwischenzeiten
 * zaehlen wie im Bestzeiten-Tab mit (findBestResult). Erste Zeit auf einer
 * Strecke ist keine "neue Bestzeit".
 */
export function newPersonalBests(results: SwimmerResult[], from: string, to: string) {
  const key = (result: SwimmerResult) => `${result.swimmer_id}|${result.pool_length}|${result.distance}|${result.stroke}`;
  const valid = results;
  const bests: { result: SwimmerResult; previous: number }[] = [];
  for (const result of valid) {
    if (result.result_date < from || result.result_date > to) continue;
    /* Vergleich mit allem davor; angezeigt wird die Verbesserung gegenueber
       dem Stand vor dem Zeitraum (falls vorhanden), sonst ggue. der Zeit davor */
    const earlier = valid.filter((other) => key(other) === key(result) && other.result_date < result.result_date);
    if (!earlier.length) continue;
    const beforeWindow = earlier.filter((other) => other.result_date < from);
    const previous = Math.min(...(beforeWindow.length ? beforeWindow : earlier).map((other) => other.time_ms));
    if (result.time_ms >= Math.min(...earlier.map((other) => other.time_ms))) continue;
    const fasterInWeek = valid.some(
      (other) => key(other) === key(result) && other.result_date >= from && other.result_date <= to && other.time_ms < result.time_ms
    );
    if (result.time_ms < previous && !fasterInWeek) bests.push({ result, previous });
  }
  return bests.sort((a, b) => a.result.time_ms / a.previous - b.result.time_ms / b.previous);
}
