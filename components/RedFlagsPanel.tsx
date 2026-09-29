"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ACWR_ZONES, Acwr, Flag, LoadEntry, acwr, buildFlags, readinessScore, sessionLoad, wellnessScore } from "@/lib/monitoring";
import { attendanceStats, AttendanceStatus } from "@/lib/attendance";

/*
 * "Rote Flaggen" fuer den Coach: wer braucht heute Aufmerksamkeit?
 * ACWR aus Session-RPE, Schmerzen, Befinden, Anwesenheit.
 */

type Row = {
  id: string;
  name: string;
  acwr: Acwr;
  flags: Flag[];
  estimated: boolean;
};

const DAY = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function loadRows(today: string, teamId: string | null): Promise<Row[]> {
  const since35 = isoDay(Date.parse(today) - 35 * DAY);
  const since28 = isoDay(Date.parse(today) - 28 * DAY);
  const since3 = new Date(Date.parse(today) - 3 * DAY).toISOString();
  const since21 = isoDay(Date.parse(today) - 21 * DAY);

  /* Optional nur eine Mannschaft: ihre Athleten und ihre Einheiten */
  const memberIds = teamId
    ? new Set((((await supabase.from("team_swimmers").select("swimmer_id").eq("team_id", teamId)).data ?? []) as { swimmer_id: string }[]).map((row) => row.swimmer_id))
    : null;
  const sessionQuery = supabase.from("training_sessions").select("*").gte("session_date", since35).lte("session_date", today);
  const [swimmerRes, sessionRes] = await Promise.all([
    supabase.from("swimmers").select("*"),
    teamId ? sessionQuery.eq("team_id", teamId) : sessionQuery,
  ]);
  const swimmers = ((swimmerRes.data ?? []) as { id: string }[]).filter((swimmer) => !memberIds || memberIds.has(swimmer.id)) as { id: string; first_name: string; last_name: string | null; profile_id?: string | null }[];
  const sessions = (sessionRes.data ?? []) as { id: string; session_date: string; duration_minutes: number | null; planned_rpe?: number | null }[];
  const sessionIds = sessions.map((session) => session.id);
  const profileIds = swimmers.map((swimmer) => swimmer.profile_id).filter(Boolean) as string[];

  const [feedbackRes, attendanceRes, wellnessRes, painRes] = await Promise.all([
    sessionIds.length
      ? supabase.from("training_feedback").select("training_session_id, athlete_id, rpe, completed").in("training_session_id", sessionIds)
      : Promise.resolve({ data: [] }),
    sessionIds.length
      ? supabase.from("training_attendance").select("training_session_id, swimmer_id, status").in("training_session_id", sessionIds)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("befinden_entries").select("athlete_id, entry_date, sleep_quality, energy, muscle_feeling, stress, mood, sleep_hours, has_pain").in("athlete_id", profileIds).gte("entry_date", since21)
      : Promise.resolve({ data: [] }),
    profileIds.length
      ? supabase.from("pain_reports").select("athlete_id, created_at, pain_level, spot_label, body_region").in("athlete_id", profileIds).gte("created_at", since3)
      : Promise.resolve({ data: [] }),
  ]);

  const feedback = (feedbackRes.data ?? []) as { training_session_id: string; athlete_id: string; rpe: number | null; completed: boolean | null }[];
  const attendance = (attendanceRes.data ?? []) as { training_session_id: string; swimmer_id: string; status: AttendanceStatus }[];
  const wellness = (wellnessRes.data ?? []) as { athlete_id: string; entry_date: string; sleep_quality: number; energy: number; muscle_feeling: number; stress: number; mood: number; sleep_hours: number | null; has_pain: boolean | null }[];
  const pain = (painRes.data ?? []) as { athlete_id: string; created_at: string; pain_level: number; spot_label: string | null; body_region: string | null }[];
  const sessionById = new Map(sessions.map((session) => [session.id, session]));

  return swimmers.map((swimmer) => {
    const loads: LoadEntry[] = [];
    for (const session of sessions) {
      const own = feedback.find((item) => item.training_session_id === session.id && item.athlete_id === swimmer.profile_id);
      const present = attendance.find((item) => item.training_session_id === session.id && item.swimmer_id === swimmer.id);
      if (own?.rpe && own.completed !== false) {
        loads.push({ date: session.session_date, load: sessionLoad(own.rpe, session.duration_minutes), estimated: false });
      } else if (present?.status === "anwesend" && session.planned_rpe) {
        loads.push({ date: session.session_date, load: sessionLoad(session.planned_rpe, session.duration_minutes), estimated: true });
      }
    }
    const load = acwr(loads, today);
    const ownAttendance = attendance.filter(
      (item) => item.swimmer_id === swimmer.id && (sessionById.get(item.training_session_id)?.session_date ?? "") >= since28
    );
    const flags = buildFlags({
      acwr: load,
      painReports: pain.filter((item) => item.athlete_id === swimmer.profile_id),
      wellness: (() => {
        const own = wellness.filter((item) => item.athlete_id === swimmer.profile_id).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
        /* eigener Durchschnitt der Vortage als Vergleich */
        const earlier = own.slice(1);
        const baseline = earlier.length >= 3 ? earlier.reduce((sum, item) => sum + wellnessScore(item), 0) / earlier.length : null;
        return own.map((item, index) => ({ entry_date: item.entry_date, score: readinessScore(item, index === 0 ? baseline : null).score }));
      })(),
      attendanceRate: ownAttendance.length >= 3 ? attendanceStats(ownAttendance).rate : null,
      today,
    });
    return {
      id: swimmer.id,
      name: `${swimmer.first_name} ${swimmer.last_name ?? ""}`.trim(),
      acwr: load,
      flags,
      estimated: loads.some((entry) => entry.estimated),
    };
  });
}

const TONE: Record<string, string> = {
  good: "text-app-good",
  warn: "text-app-warn",
  bad: "text-app-bad",
  muted: "text-app-faint",
};

export default function RedFlagsPanel({ teamId = null }: { teamId?: string | null }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [today] = useState(() => isoDay(Date.now()));

  useEffect(() => {
    loadRows(today, teamId).then(setRows);
  }, [today, teamId]);

  if (rows === null) return null;
  const flagged = rows
    .filter((row) => row.flags.length)
    .sort((a, b) => b.flags.filter((f) => f.level === "rot").length - a.flags.filter((f) => f.level === "rot").length);

  return (
    <section className="h-full overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-app">
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <p className="text-sm text-app-muted">Athleten-Check</p>
        <button type="button" onClick={() => setShowAll(!showAll)} className="text-xs font-semibold text-app-accent">
          {showAll ? "weniger" : "Belastung"}
        </button>
      </div>

      {flagged.length === 0 ? (
        <div className="flex items-center gap-4 px-5 pb-5 pt-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-app-good/12 text-xl font-bold text-app-good">✓</span>
          <span>
            <span className="block text-lg font-bold text-app-heading">Alle im grünen Bereich</span>
            <span className="text-sm text-app-muted">keine Auffälligkeiten</span>
          </span>
        </div>
      ) : (
        <ul className="space-y-2 px-3 pb-3 pt-3">
          {flagged.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 rounded-2xl bg-app-bg px-3 py-2.5">
              <Link href={`/coach/schwimmer/${row.id}`} className="w-40 shrink-0 text-sm font-semibold text-app-heading hover:text-app-accent">
                {row.flags.some((flag) => flag.level === "rot") ? "🔴" : "🟡"} {row.name}
              </Link>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {row.flags.map((flag) => (
                  <span
                    key={flag.text}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      flag.level === "rot" ? "bg-app-bad/10 text-app-bad" : "bg-app-warn/15 text-app-warn"
                    }`}
                  >
                    {flag.text}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showAll && (
        <div className="overflow-x-auto border-t border-app-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-app-muted">
                <th className="px-4 py-2 font-medium">Athlet</th>
                <th className="px-3 py-2 text-right font-medium">akut (7 T.)</th>
                <th className="px-3 py-2 text-right font-medium">chronisch (Ø Woche)</th>
                <th className="px-3 py-2 text-right font-medium">ACWR</th>
                <th className="px-4 py-2 font-medium">Bereich</th>
              </tr>
            </thead>
            <tbody>
              {[...rows]
                .sort((a, b) => (b.acwr.ratio ?? -1) - (a.acwr.ratio ?? -1))
                .map((row) => (
                  <tr key={row.id} className="border-t border-app-border">
                    <td className="px-4 py-1.5">
                      {row.name}
                      {row.estimated && <span className="ml-1 text-xs text-app-faint" title="teilweise aus geplanter Belastung (kein Feedback)">*</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right">{Math.round(row.acwr.acute)}</td>
                    <td className="px-3 py-1.5 text-right">{Math.round(row.acwr.chronicWeekly)}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{row.acwr.ratio === null ? "–" : row.acwr.ratio.toFixed(2).replace(".", ",")}</td>
                    <td className={`px-4 py-1.5 text-xs font-semibold ${TONE[ACWR_ZONES[row.acwr.zone].tone]}`}>{ACWR_ZONES[row.acwr.zone].label}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-app-faint">
            Belastung = RPE × Minuten aus dem Athleten-Feedback; * = teilweise aus der geplanten Belastung (anwesend, aber kein Feedback). ACWR erst ab 3 Wochen Daten. Optimal 0,8–1,3 · erhöht bis 1,5 · darüber Gefahrenzone.
          </p>
        </div>
      )}
    </section>
  );
}
