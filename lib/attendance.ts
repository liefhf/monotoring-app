import { supabase } from "@/lib/supabase";
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
  const { data } = await supabase.from("team_swimmers").select("swimmer_id").eq("team_id", teamId);
  const ids = ((data ?? []) as { swimmer_id: string }[]).map((row) => row.swimmer_id);
  if (ids.length === 0) return [];
  const { data: swimmers } = await supabase
    .from("swimmers")
    .select("id, first_name, last_name, birth_year, gender")
    .in("id", ids);
  return ((swimmers ?? []) as Swimmer[]).sort(
    (a, b) => (a.last_name ?? "").localeCompare(b.last_name ?? "", "de") || a.first_name.localeCompare(b.first_name, "de")
  );
}

export async function loadAttendance(sessionId: string) {
  const { data, error } = await supabase
    .from("training_attendance")
    .select("training_session_id, swimmer_id, status, note")
    .eq("training_session_id", sessionId);
  return { rows: (data ?? []) as AttendanceEntry[], missingTable: Boolean(error) };
}

export async function saveAttendance(sessionId: string, swimmerId: string, status: AttendanceStatus | null) {
  if (status === null) {
    const { error } = await supabase
      .from("training_attendance")
      .delete()
      .eq("training_session_id", sessionId)
      .eq("swimmer_id", swimmerId);
    return error?.message ?? null;
  }
  const { error } = await supabase
    .from("training_attendance")
    .upsert(
      { training_session_id: sessionId, swimmer_id: swimmerId, status, updated_at: new Date().toISOString() },
      { onConflict: "training_session_id,swimmer_id" }
    );
  return error?.message ?? null;
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
  return { rows, missingTable: Boolean(error) };
}
