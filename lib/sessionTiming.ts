import { toDateKey } from "@/lib/community";

/*
 * Zeitlogik fuer Trainingseinheiten (Ortszeit des Geraets).
 * Eine Einheit ist "upcoming" vor dem Start, "running" waehrend der
 * geplanten Dauer und "finished" danach. Ohne Startzeit gilt der ganze
 * Tag als moeglich: erst ab dem Folgetag ist sie sicher vorbei.
 */

export type SessionPhase = "upcoming" | "running" | "finished";

export type TimedSession = { session_date: string; start_time: string | null; duration_minutes: number | null };

const DEFAULT_DURATION = 90;

export function sessionStart(session: TimedSession): Date {
  const [h, m] = (session.start_time ?? "00:00").split(":").map(Number);
  const [y, mo, d] = session.session_date.split("-").map(Number);
  return new Date(y, mo - 1, d, h || 0, m || 0, 0, 0);
}

export function sessionEnd(session: TimedSession): Date {
  if (!session.start_time) {
    const [y, mo, d] = session.session_date.split("-").map(Number);
    return new Date(y, mo - 1, d + 1, 0, 0, 0, 0);
  }
  const start = sessionStart(session);
  return new Date(start.getTime() + (session.duration_minutes || DEFAULT_DURATION) * 60_000);
}

export function sessionPhase(session: TimedSession, now: Date): SessionPhase {
  const today = toDateKey(now);
  if (session.session_date > today) return "upcoming";
  if (!session.start_time) return session.session_date < today ? "finished" : "running";
  if (now < sessionStart(session)) return "upcoming";
  if (now < sessionEnd(session)) return "running";
  return "finished";
}

/*
 * Darf der Athlet eine Rueckmeldung zur Einheit geben?
 * Erst nach dem Ende, nicht bei gemeldeter Abwesenheit, nicht doppelt,
 * und nur fuer die letzten maxAgeDays Tage (danach ist die Erinnerung unzuverlaessig).
 */
export function feedbackDue(
  session: TimedSession & { id: string },
  now: Date,
  opts: { given: Set<string>; absent: Set<string>; maxAgeDays?: number }
) {
  if (opts.given.has(session.id) || opts.absent.has(session.id)) return false;
  if (sessionPhase(session, now) !== "finished") return false;
  const oldest = new Date(now);
  oldest.setDate(oldest.getDate() - (opts.maxAgeDays ?? 3));
  return session.session_date >= toDateKey(oldest);
}

/* Montag..Sonntag der Woche von now als Datums-Schluessel */
export function weekRange(now: Date) {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toDateKey(monday), to: toDateKey(sunday) };
}

/* Millisekunden bis zur naechsten Mitternacht (fuer Tageswechsel bei offener App) */
export function msUntilMidnight(now: Date) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}

/* "Neu" = in den letzten 7 Tagen veroeffentlicht. Aeltere angeheftete Nachrichten heissen "Wichtig". */
export function newsLabel(news: { created_at: string; pinned: boolean | null }, now: Date) {
  const ageDays = (now.getTime() - Date.parse(news.created_at)) / 86_400_000;
  if (ageDays <= 7) return "Neu vom Trainer";
  return news.pinned ? "Wichtige Nachricht" : null;
}

