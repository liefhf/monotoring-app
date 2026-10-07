import { supabase } from "@/lib/supabase";
import { checkWrite, classifyError, writeErrorText } from "@/lib/loadState";
import { Swimmer } from "@/lib/swim";

/*
 * Anwesenheit je Trainingseinheit (Tabelle training_attendance,
 * siehe supabase/anwesenheit.sql).
 */

export type AttendanceStatus = "anwesend" | "entschuldigt" | "krank" | "fehlt";

export const ATTENDANCE_STATUS: { value: AttendanceStatus; label: string; short: string; className: string }[] = [
  { value: "anwesend", label: "anwesend", short: "✓", className: "bg-app-accent text-app-accent-ink" },
  { value: "entschuldigt", label: "entschuldigt", short: "E", className: "bg-[color:var(--app-accent-2)] text-white" },
  { value: "krank", label: "krank", short: "K", className: "bg-[#c4b5fd] text-[#1e1a3a]" },
  { value: "fehlt", label: "fehlt (unentschuldigt)", short: "F", className: "bg-app-faint text-white" },
];

export type AttendanceEntry = {
  training_session_id: string;
  swimmer_id: string;
  status: AttendanceStatus;
  note: string | null;
};

/* Athleten des Teams einer Einheit (ueber team_swimmers) */
export async function loadTeamSwimmers(teamId: string) {
  return (await loadTeamSwimmersResult(teamId)).swimmers;
}

/* wie loadTeamSwimmers, meldet aber Ladefehler (failed) statt still "leer" */
export async function loadTeamSwimmersResult(teamId: string): Promise<{ swimmers: Swimmer[]; failed: boolean }> {
  const { data, error } = await supabase.from("team_swimmers").select("swimmer_id").eq("team_id", teamId);
  if (error) return { swimmers: [], failed: true };
  const ids = ((data ?? []) as { swimmer_id: string }[]).map((row) => row.swimmer_id);
  if (ids.length === 0) return { swimmers: [], failed: false };
  const { data: swimmers, error: swimmerError } = await supabase
    .from("swimmers")
    .select("id, first_name, last_name, birth_year, gender")
    .in("id", ids);
  if (swimmerError) return { swimmers: [], failed: true };
  return { swimmers: sortSwimmers((swimmers ?? []) as Swimmer[]), failed: false };
}

function sortSwimmers(list: Swimmer[]) {
  return list.sort(
    (a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? "", "de") || a.first_name.localeCompare(b.first_name, "de")
  );
}

export async function loadAttendance(sessionId: string) {
  const { data, error } = await supabase
    .from("training_attendance")
    .select("training_session_id, swimmer_id, status, note")
    .eq("training_session_id", sessionId);
  const kind = classifyError(error);
  return { rows: (data ?? []) as AttendanceEntry[], missingTable: kind === "missing", failed: kind === "error" };
}

/* Gibt null bei Erfolg zurueck, sonst einen verstaendlichen Fehlertext. 0 betroffene Zeilen = Fehler. */
export async function saveAttendance(sessionId: string, swimmerId: string, status: AttendanceStatus | null) {
  if (status === null) {
    const res = await supabase
      .from("training_attendance")
      .delete()
      .eq("training_session_id", sessionId)
      .eq("swimmer_id", swimmerId)
      .select("swimmer_id");
    // Zuruecksetzen eines Eintrags, der schon weg ist, ist kein Fehler
    const check = checkWrite(res, false);
    return check.ok ? null : writeErrorText(check, "Anwesenheit");
  }
  const res = await supabase
    .from("training_attendance")
    .upsert(
      { training_session_id: sessionId, swimmer_id: swimmerId, status, updated_at: new Date().toISOString() },
      { onConflict: "training_session_id,swimmer_id" }
    )
    .select("swimmer_id");
  const check = checkWrite(res);
  return check.ok ? null : writeErrorText(check, "Anwesenheit");
}

/* Quote: anwesend / (alle erfassten Einheiten); entschuldigt/krank separat ausgewiesen */
export function attendanceStats(entries: { status: AttendanceStatus }[]) {
  const count = (status: AttendanceStatus) => entries.filter((entry) => entry.status === status).length;
  const total = entries.length;
  return {
    total,
    present: count("anwesend"),
    excused: count("entschuldigt"),
    sick: count("krank"),
    missing: count("fehlt"),
    rate: total ? Math.round((count("anwesend") / total) * 100) : null,
  };
}

/* Alle Anwesenheiten eines Athleten mit Datum der Einheit */
export async function loadSwimmerAttendance(swimmerId: string) {
  const { data, error } = await supabase
    .from("training_attendance")
    .select("status, training_sessions(session_date)")
    .eq("swimmer_id", swimmerId);
  const rows = ((data ?? []) as unknown as { status: AttendanceStatus; training_sessions: { session_date: string } | null }[]).map(
    (row) => ({ status: row.status, date: row.training_sessions?.session_date ?? "" })
  );
  const kind = classifyError(error);
  return { rows, missingTable: kind === "missing", failed: kind === "error" };
}

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
