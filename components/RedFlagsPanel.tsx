"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Acwr, Flag, LoadEntry, acwr, buildFlags, readinessScore, sessionLoad, wellnessScore } from "@/lib/monitoring";
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
  /* Werte fuer die Tabelle */
  readiness: number | null;
  painMax: number | null;
  attendanceRate: number | null;
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
    const ownPain = pain.filter((item) => item.athlete_id === swimmer.profile_id);
    const readinessList = (() => {
      const own = wellness.filter((item) => item.athlete_id === swimmer.profile_id).sort((a, b) => b.entry_date.localeCompare(a.entry_date));
      /* eigener Durchschnitt der Vortage als Vergleich */
      const earlier = own.slice(1);
      const baseline = earlier.length >= 3 ? earlier.reduce((sum, item) => sum + wellnessScore(item), 0) / earlier.length : null;
      return own.map((item, index) => ({ entry_date: item.entry_date, score: readinessScore(item, index === 0 ? baseline : null).score }));
    })();
    const attendanceRate = ownAttendance.length >= 3 ? attendanceStats(ownAttendance).rate : null;
    const flags = buildFlags({ acwr: load, painReports: ownPain, wellness: readinessList, attendanceRate, today });
    const latestReadiness = readinessList.find((item) => (Date.parse(today) - Date.parse(item.entry_date)) / DAY <= 2);
    return {
      id: swimmer.id,
      name: `${swimmer.first_name} ${swimmer.last_name ?? ""}`.trim(),
      acwr: load,
      flags,
      estimated: loads.some((entry) => entry.estimated),
      readiness: latestReadiness?.score ?? null,
      painMax: ownPain.length ? Math.max(...ownPain.map((item) => item.pain_level)) : null,
      attendanceRate,
    };
  });
}

export default function RedFlagsPanel({ teamId = null }: { teamId?: string | null }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [today] = useState(() => isoDay(Date.now()));

  useEffect(() => {
    loadRows(today, teamId).then(setRows);
  }, [today, teamId]);

  if (rows === null) return null;

  const sorted = [...rows].sort(
    (x, y) =>
      y.flags.filter((flag) => flag.level === "rot").length - x.flags.filter((flag) => flag.level === "rot").length ||
      y.flags.length - x.flags.length ||
      x.name.localeCompare(y.name, "de")
  );
  const shown = showAll ? sorted : sorted.slice(0, 5);

  const cell = (row: Row, kind: Flag["kind"]) => {
    const flag = row.flags.find((item) => item.kind === kind);
    const tone = flag ? (flag.level === "rot" ? "text-app-bad font-semibold" : "text-app-warn font-semibold") : "text-app-muted";
    const value =
      kind === "acwr"
        ? row.acwr.ratio === null ? "–" : row.acwr.ratio.toFixed(2).replace(".", ",")
        : kind === "schmerz"
          ? row.painMax === null ? "–" : `${row.painMax}/10`
          : kind === "befinden"
            ? row.readiness === null ? "–" : String(row.readiness)
            : row.attendanceRate === null ? "–" : `${row.attendanceRate} %`;
    return (
      <td key={kind} className={`px-3 py-3 ${tone}`} title={flag?.text}>
        {value}
      </td>
    );
  };

  const flaggedCount = rows.filter((row) => row.flags.length).length;

  return (
    <section className="h-full overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-app">
      <div className="flex items-center justify-between gap-2 px-5 pt-5">
        <p className="text-sm text-app-muted">
          Athleten-Check <span className={flaggedCount ? "text-app-bad" : "text-app-good"}>· {flaggedCount ? `${flaggedCount} auffällig` : "alle im grünen Bereich"}</span>
        </p>
        {rows.length > 5 && (
          <button type="button" onClick={() => setShowAll(!showAll)} className="text-xs font-semibold text-app-accent">
            {showAll ? "weniger" : `alle ${rows.length}`}
          </button>
        )}
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app-border text-left text-xs text-app-muted">
              <th className="px-5 py-2.5 font-medium">Athlet</th>
              <th className="px-3 py-2.5 font-medium" title="ACWR: Belastung 7 zu 28 Tage">Belastung</th>
              <th className="px-3 py-2.5 font-medium">Schmerz</th>
              <th className="px-3 py-2.5 font-medium">Readiness</th>
              <th className="px-3 py-2.5 font-medium">Anwesenheit</th>
              <th className="px-5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id} className="border-b border-app-border last:border-b-0">
                <td className="whitespace-nowrap px-5 py-3 font-semibold text-app-heading">
                  {row.flags.length > 0 && (
                    <span className={`mr-2 inline-block h-2 w-2 rounded-full ${row.flags.some((flag) => flag.level === "rot") ? "bg-app-bad" : "bg-app-warn"}`} />
                  )}
                  {row.name}
                </td>
                {(["acwr", "schmerz", "befinden", "anwesenheit"] as Flag["kind"][]).map((kind) => cell(row, kind))}
                <td className="px-5 py-3 text-right">
                  <Link href={`/coach/schwimmer/${row.id}`} className="text-sm font-semibold text-app-accent">
                    Öffnen
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
