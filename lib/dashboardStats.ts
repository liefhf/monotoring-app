/*
 * Kennzahlen fuer das Coach-Dashboard (reine Berechnung).
 */

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/* Montag der Woche eines Datums */
export function weekStart(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const offset = (d.getUTCDay() + 6) % 7;
  return iso(d.getTime() - offset * DAY);
}

export type WeekBar = { week: string; label: string; meters: number; sessions: number; current: boolean };

/* Umfang (Meter) und Einheiten je Woche, die letzten n Wochen inkl. aktueller */
export function weeklyVolume(sessions: { session_date: string; total_meters: number | null }[], today: string, weeks = 8): WeekBar[] {
  const current = weekStart(today);
  const bars: WeekBar[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const week = iso(Date.parse(current) - i * 7 * DAY);
    const inWeek = sessions.filter((session) => weekStart(session.session_date) === week);
    const d = new Date(`${week}T12:00:00Z`);
    bars.push({
      week,
      label: `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      meters: inWeek.reduce((sum, session) => sum + (session.total_meters ?? 0), 0),
      sessions: inWeek.length,
      current: week === current,
    });
  }
  return bars;
}

export function daysUntilDate(date: string, today: string) {
  return Math.round((Date.parse(date) - Date.parse(today)) / DAY);
}

/* ISO-Kalenderwoche */
export function isoWeek(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

export type DayBar = { date: string; label: string; meters: number; sessions: number; planned: boolean; today: boolean };

/* Montag bis Sonntag der Woche von "anchor" (Standard: heute); Tage nach heute = geplant */
export function weekDays(sessions: { session_date: string; total_meters: number | null }[], today: string, anchor: string = today): DayBar[] {
  const monday = weekStart(anchor);
  const names = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  return names.map((name, index) => {
    const date = iso(Date.parse(monday) + index * DAY);
    const onDay = sessions.filter((session) => session.session_date === date);
    const d = new Date(`${date}T12:00:00Z`);
    return {
      date,
      label: `${name} ${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      meters: onDay.reduce((sum, session) => sum + (session.total_meters ?? 0), 0),
      sessions: onDay.length,
      planned: date > today,
      today: date === today,
    };
  });
}
