"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { toDateKey } from "@/lib/community";
import { isoWeek, weekStart } from "@/lib/dashboardStats";
import { RESULT_COLUMNS, SwimmerResult, formatEventShort, formatTime, formatTimeDifference } from "@/lib/swim";
import { attendanceSummary, checkInSummary, newPersonalBests, ReportAttendance, ReportFeedback, ReportSession, trainingSummary } from "@/lib/weeklyReport";
import { loadRows, Row } from "@/components/RedFlagsPanel";
import TeamSwitcher from "@/components/TeamSwitcher";
import Loader from "@/components/Loader";
import { PageHeader, Stat, buttonSecondary } from "@/components/ui";

/*
 * Wochenbericht je Mannschaft: was ist passiert, wo muss ich naechste
 * Woche hinschauen? Training (Umfang, RPE geplant vs. gemeldet),
 * Anwesenheit, Check-in-Beteiligung, aktuelle Hinweise, neue Bestzeiten.
 * Druckbar (z. B. fuer Trainerteam oder Elterngespraech).
 */

type Swimmer = { id: string; first_name: string; last_name: string | null; profile_id: string | null };

const DAY = 86_400_000;
const shiftDays = (date: string, days: number) => toDateKey(new Date(Date.parse(`${date}T12:00:00`) + days * DAY));
const fmt = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });

function Report() {
  const params = useSearchParams();
  const [today] = useState(() => toDateKey(new Date()));
  /* Standard: die zuletzt abgeschlossene Woche */
  const [week, setWeek] = useState(() => weekStart(params.get("week") ?? shiftDays(toDateKey(new Date()), -7)));
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [data, setData] = useState<{
    swimmers: Swimmer[];
    sessions: ReportSession[];
    attendance: ReportAttendance[];
    feedback: ReportFeedback[];
    checkIns: { athlete_id: string; entry_date: string }[];
    results: SwimmerResult[];
    flags: Row[];
  } | null>(null);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id, name")
      .order("name")
      .then(({ data: list }) => {
        const all = (list ?? []) as { id: string; name: string }[];
        setTeams(all);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("dashboard-team");
        } catch {
          /* ohne Browser-Speicher */
        }
        setTeamId(all.find((team) => team.id === saved)?.id ?? all[0]?.id ?? null);
      });
  }, []);

  useEffect(() => {
    if (!teamId) return;
    const sunday = shiftDays(week, 6);
    async function load() {
      setData(null);
      const memberIds = (((await supabase.from("team_swimmers").select("swimmer_id").eq("team_id", teamId!)).data ?? []) as { swimmer_id: string }[]).map((row) => row.swimmer_id);
      const [swimmerRes, sessionRes] = await Promise.all([
        memberIds.length ? supabase.from("swimmers").select("id, first_name, last_name, profile_id").in("id", memberIds) : Promise.resolve({ data: [] }),
        supabase.from("training_sessions").select("*").eq("team_id", teamId!).gte("session_date", week).lte("session_date", sunday),
      ]);
      const swimmers = (swimmerRes.data ?? []) as Swimmer[];
      const sessions = (sessionRes.data ?? []) as ReportSession[];
      const sessionIds = sessions.map((session) => session.id);
      const profileIds = swimmers.map((swimmer) => swimmer.profile_id).filter(Boolean) as string[];
      const [attendanceRes, feedbackRes, checkInRes, resultRes, flags] = await Promise.all([
        sessionIds.length ? supabase.from("training_attendance").select("training_session_id, swimmer_id, status").in("training_session_id", sessionIds) : Promise.resolve({ data: [] }),
        sessionIds.length ? supabase.from("training_feedback").select("training_session_id, athlete_id, rpe").in("training_session_id", sessionIds) : Promise.resolve({ data: [] }),
        profileIds.length
          ? supabase.from("befinden_entries").select("athlete_id, entry_date").in("athlete_id", profileIds).gte("entry_date", week).lte("entry_date", sunday)
          : Promise.resolve({ data: [] }),
        swimmers.length
          ? fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS).in("swimmer_id", swimmers.map((swimmer) => swimmer.id)).eq("kind", "einzel").lte("result_date", sunday))
          : Promise.resolve({ data: [] }),
        loadRows(today, teamId),
      ]);
      setData({
        swimmers,
        sessions,
        attendance: (attendanceRes.data ?? []) as ReportAttendance[],
        feedback: (feedbackRes.data ?? []) as ReportFeedback[],
        checkIns: (checkInRes.data ?? []) as { athlete_id: string; entry_date: string }[],
        results: (resultRes.data ?? []) as SwimmerResult[],
        flags: flags.filter((row) => row.flags.length),
      });
    }
    load();
  }, [teamId, week, today]);

  function chooseTeam(id: string) {
    setTeamId(id);
    try {
      localStorage.setItem("dashboard-team", id);
    } catch {
      /* ohne Browser-Speicher */
    }
  }

  const sunday = shiftDays(week, 6);
  const nameOf = (id: string, key: "id" | "profile_id" = "id") => {
    const swimmer = data?.swimmers.find((item) => item[key] === id);
    return swimmer ? `${swimmer.first_name} ${swimmer.last_name ?? ""}`.trim() : "Athlet";
  };

  const training = data ? trainingSummary(data.sessions, data.feedback) : null;
  const attendance = data ? attendanceSummary(data.attendance, data.swimmers.map((swimmer) => swimmer.id)) : null;
  const checkIns = data ? checkInSummary(data.checkIns, data.swimmers.map((swimmer) => swimmer.profile_id).filter(Boolean) as string[]) : null;
  const bests = data ? newPersonalBests(data.results, week, sunday) : [];
  const teamName = teams.find((team) => team.id === teamId)?.name ?? "";

  return (
    <main className="mx-auto max-w-5xl space-y-4 sm:space-y-5">
      <PageHeader
        eyebrow={`Wochenbericht${teamName ? ` · ${teamName}` : ""}`}
        title={`KW ${isoWeek(week)} · ${fmt(week)}–${fmt(sunday)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {teams.length > 1 && teamId && <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} />}
            <button type="button" onClick={() => setWeek(shiftDays(week, -7))} className={buttonSecondary} aria-label="Vorige Woche">
              ‹
            </button>
            <button type="button" onClick={() => setWeek(shiftDays(week, 7))} className={buttonSecondary} aria-label="Nächste Woche">
              ›
            </button>
            <button type="button" onClick={() => window.print()} className={buttonSecondary}>
              Drucken
            </button>
          </div>
        }
      />

      {!data || !training || !attendance || !checkIns ? (
        <Loader />
      ) : (
        <>
          <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
            <h2 className="text-[15px] font-bold text-app-heading">Training</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Einheiten" value={training.sessions} trend={training.landSessions ? <span className="text-app-muted">davon {training.landSessions} Land</span> : undefined} />
              <Stat label="Wasser" value={(training.waterMeters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} unit="km" />
              <Stat label="Trainingszeit" value={`${Math.floor(training.minutes / 60)}:${String(training.minutes % 60).padStart(2, "0")}`} unit="h" />
              <Stat
                label="RPE geplant / gemeldet"
                value={`${training.avgPlannedRpe?.toLocaleString("de-DE", { maximumFractionDigits: 1 }) ?? "–"} / ${training.avgReportedRpe?.toLocaleString("de-DE", { maximumFractionDigits: 1 }) ?? "–"}`}
                trend={<span className="text-app-muted">{training.feedbackCount} Rückmeldungen</span>}
              />
            </div>
            {training.avgPlannedRpe !== null && training.avgReportedRpe !== null && training.avgReportedRpe - training.avgPlannedRpe >= 1.5 && (
              <p className="mt-3 text-sm text-app-warn">Die Athleten empfanden die Woche deutlich anstrengender als geplant – Planung für die nächste Woche prüfen.</p>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
              <h2 className="text-[15px] font-bold text-app-heading">Anwesenheit</h2>
              <p className="num mt-2 text-[32px] font-semibold leading-tight text-app-heading">{attendance.rate === null ? "–" : `${attendance.rate} %`}</p>
              {attendance.low.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {attendance.low.map((item) => (
                    <li key={item.swimmerId} className="flex justify-between gap-3">
                      <Link href={`/coach/schwimmer/${item.swimmerId}`} className="text-app-heading hover:text-app-accent-soft">
                        {nameOf(item.swimmerId)}
                      </Link>
                      <span className="num text-app-warn">
                        {item.present}/{item.total}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-app-muted">{attendance.rate === null ? "Keine Anwesenheit erfasst." : "Niemand unter 70 %."}</p>
              )}
            </section>

            <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
              <h2 className="text-[15px] font-bold text-app-heading">Check-ins</h2>
              <p className="num mt-2 text-[32px] font-semibold leading-tight text-app-heading">
                {checkIns.regular}/{checkIns.withLogin}
              </p>
              <p className="text-[13px] text-app-muted">Athleten mit Login, die an mind. 4 Tagen eingecheckt haben</p>
              {checkIns.missing.length > 0 && <p className="mt-2 text-sm text-app-warn">Kein Check-in: {checkIns.missing.map((id) => nameOf(id, "profile_id")).join(", ")}</p>}
            </section>
          </div>

          <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
            <h2 className="text-[15px] font-bold text-app-heading">Aktuelle Hinweise</h2>
            {data.flags.length === 0 ? (
              <p className="mt-2 text-sm text-app-muted">Keine Auffälligkeiten.</p>
            ) : (
              <ul className="mt-2 divide-y divide-app-border/60">
                {data.flags.map((row) => (
                  <li key={row.id} className="py-2.5">
                    <Link href={`/coach/schwimmer/${row.id}`} className="font-bold text-app-heading hover:text-app-accent-soft">
                      {row.name}
                    </Link>
                    <ul className="mt-1 space-y-0.5 text-sm">
                      {row.flags.map((flag) => (
                        <li key={flag.kind + flag.text} className={flag.level === "rot" ? "text-app-bad" : "text-app-warn"}>
                          {flag.text} <span className="text-app-muted">→ {flag.check}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
            <h2 className="text-[15px] font-bold text-app-heading">Neue Bestzeiten</h2>
            {bests.length === 0 ? (
              <p className="mt-2 text-sm text-app-muted">Keine neuen Bestzeiten in dieser Woche.</p>
            ) : (
              <ul className="mt-2 divide-y divide-app-border/60">
                {bests.map(({ result, previous }) => (
                  <li key={result.id} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
                    <span className="min-w-0 flex-1 font-semibold text-app-heading">{nameOf(result.swimmer_id)}</span>
                    <span className="w-24 text-app-muted">
                      {formatEventShort(result)} · {result.pool_length} m
                    </span>
                    <span className="num w-20 text-right font-semibold text-app-heading">{formatTime(result.time_ms)}</span>
                    <span className="num w-20 text-right text-app-good">{formatTimeDifference(result.time_ms - previous)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default function WeeklyReportPage() {
  return (
    <Suspense fallback={<Loader />}>
      <Report />
    </Suspense>
  );
}
