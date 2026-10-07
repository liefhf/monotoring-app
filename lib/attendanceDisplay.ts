/*
 * Darstellungsregel Anwesenheit (ueberall gleich: Dashboard, Profil, Anwesenheitsseite):
 * Grundlage = erfasste Eintraege vergangener Einheiten im Zeitraum. Nicht erfasste
 * Einheiten zaehlen weder als anwesend noch als abwesend.
 * Unter MIN_ATTENDANCE_BASIS Eintraegen wird KEINE Prozentzahl gross gezeigt,
 * sondern "x von y anwesend · noch wenig Daten".
 */
export const MIN_ATTENDANCE_BASIS = 8;

export function attendanceDisplay(present: number, recorded: number) {
  if (recorded === 0) return { main: "–", sub: "noch nichts erfasst", enough: false };
  if (recorded < MIN_ATTENDANCE_BASIS) return { main: `${present} von ${recorded}`, sub: "anwesend · noch wenig Daten", enough: false };
  return { main: `${Math.round((present / recorded) * 100)} %`, sub: `${present} von ${recorded} erfassten Einträgen anwesend`, enough: true };
}
