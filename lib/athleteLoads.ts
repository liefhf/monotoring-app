import { supabase } from "@/lib/supabase";
import { DailyLoad } from "@/lib/formCurve";
import { sessionLoad } from "@/lib/monitoring";

/*
 * Tagesbelastungen eines Athleten fuer die Formkurve.
 * Vergangene Einheiten: RPE aus seinem Feedback, sonst (laut Anwesenheit da)
 * die geplante Belastung. Zukuenftige Einheiten seines Teams: geplante Belastung.
 */
export async function loadAthleteDailyLoads(swimmerId: string, from: string, to: string, today: string): Promise<DailyLoad[]> {
  const [{ data: swimmer }, { data: teamRows }] = await Promise.all([
    supabase.from("swimmers").select("*").eq("id", swimmerId).maybeSingle(),
    supabase.from("team_swimmers").select("team_id").eq("swimmer_id", swimmerId),
  ]);
  const teamIds = ((teamRows ?? []) as { team_id: string }[]).map((row) => row.team_id);
  if (teamIds.length === 0) return [];
  const profileId = (swimmer as { profile_id?: string | null } | null)?.profile_id ?? null;

  const { data: sessionRows } = await supabase
    .from("training_sessions")
    .select("*")
    .in("team_id", teamIds)
    .gte("session_date", from)
    .lte("session_date", to);
  const sessions = (sessionRows ?? []) as { id: string; session_date: string; duration_minutes: number | null; planned_rpe?: number | null }[];
  if (sessions.length === 0) return [];
  const ids = sessions.map((session) => session.id);

  const [feedbackRes, attendanceRes] = await Promise.all([
    profileId
      ? supabase.from("training_feedback").select("training_session_id, rpe, completed").eq("athlete_id", profileId).in("training_session_id", ids)
      : Promise.resolve({ data: [] }),
    supabase.from("training_attendance").select("training_session_id, status").eq("swimmer_id", swimmerId).in("training_session_id", ids),
  ]);
  const feedback = new Map(
    ((feedbackRes.data ?? []) as { training_session_id: string; rpe: number | null; completed: boolean | null }[]).map((row) => [row.training_session_id, row])
  );
  const attendance = new Map(((attendanceRes.data ?? []) as { training_session_id: string; status: string }[]).map((row) => [row.training_session_id, row.status]));

  const loads: DailyLoad[] = [];
  for (const session of sessions) {
    if (session.session_date > today) {
      if (session.planned_rpe) loads.push({ date: session.session_date, load: sessionLoad(session.planned_rpe, session.duration_minutes), planned: true });
      continue;
    }
    const own = feedback.get(session.id);
    if (own?.rpe && own.completed !== false) {
      loads.push({ date: session.session_date, load: sessionLoad(own.rpe, session.duration_minutes), planned: false });
    } else if (attendance.get(session.id) === "anwesend" && session.planned_rpe) {
      loads.push({ date: session.session_date, load: sessionLoad(session.planned_rpe, session.duration_minutes), planned: false });
    }
  }
  return loads;
}
