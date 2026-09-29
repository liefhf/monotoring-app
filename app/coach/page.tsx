"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { CalendarEntry, formatEntryWhen } from "@/lib/community";
import { competitionPriority, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import { daysUntilDate, isoWeek, weekDays, weeklyVolume } from "@/lib/dashboardStats";
import { AttendanceStatus } from "@/lib/attendance";
import { Icon, IconName } from "@/components/icons";
import RedFlagsPanel from "@/components/RedFlagsPanel";
import { LatestNews, UpcomingEntries } from "@/components/DashboardWidgets";

/*
 * Coach-Dashboard im Kachel-Raster ("Bento"): Wettkampf-Countdown als
 * Hauptkarte, Trainingsumfang je Woche, Anwesenheit als Ring, Kennzahlen,
 * rote Flaggen, Termine, News und das heutige Training.
 */

type Session = { id: string; title: string; session_date: string; start_time: string | null; total_meters: number | null; duration_minutes: number | null; team_id: string };

const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

const QUICK: { href: string; label: string; icon: IconName }[] = [
  { href: "/coach/training/new", label: "Training", icon: "plus" },
  { href: "/coach/schwimmer", label: "Athleten", icon: "athlete" },
  { href: "/coach/kalender", label: "Kalender", icon: "calendar" },
  { href: "/coach/analytics/wettkampf", label: "Auswertung", icon: "trophy" },
  { href: "/coach/meldehilfe", label: "Meldehilfe", icon: "stopwatch" },
  { href: "/coach/tests", label: "Tests", icon: "chart" },
];

const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  anwesend: "var(--app-good)",
  entschuldigt: "var(--app-accent)",
  krank: "var(--app-warn)",
  fehlt: "var(--app-bad)",
};

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = { anwesend: "da", entschuldigt: "entsch.", krank: "krank", fehlt: "fehlt" };

function Tile({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <section className={`rounded-3xl border border-app-border bg-app-surface p-5 shadow-app ${className}`}>{children}</section>;
}

export default function CoachPage() {
  const [today] = useState(() => iso(Date.now()));
  const [sessions, setSessions] = useState<Session[]>([]);
  const [attendance, setAttendance] = useState<{ status: AttendanceStatus }[]>([]);
  const [athleteCount, setAthleteCount] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  /* Das Dashboard zeigt eine Mannschaft - die Wahl bleibt im Browser gespeichert */
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("teams")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        const list = (data ?? []) as { id: string; name: string }[];
        setTeams(list);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("dashboard-team");
        } catch {
          /* ohne Browser-Speicher */
        }
        setTeamId(list.find((team) => team.id === saved)?.id ?? list[0]?.id ?? null);
      });
  }, []);

  function chooseTeam(id: string) {
    setTeamId(id);
    try {
      localStorage.setItem("dashboard-team", id);
    } catch {
      /* ignorieren */
    }
  }

  useEffect(() => {
    if (!teamId) return;
    async function load() {
      const since = iso(Date.parse(today) - 8 * 7 * DAY);
      const until = iso(Date.parse(today) + 7 * DAY);
      const [swimmerRes, sessionRes] = await Promise.all([
        supabase.from("team_swimmers").select("id", { count: "exact", head: true }).eq("team_id", teamId!),
        fetchAll(() =>
          supabase
            .from("training_sessions")
            .select("id, title, session_date, start_time, total_meters, duration_minutes, team_id")
            .gte("session_date", since)
            .lte("session_date", until)
            .eq("team_id", teamId!)
            .order("session_date")
        ),
      ]);
      setAthleteCount(swimmerRes.count ?? 0);
      const loaded = (sessionRes.data ?? []) as Session[];
      setSessions(loaded);

      const recentIds = loaded.filter((session) => session.session_date >= iso(Date.parse(today) - 28 * DAY) && session.session_date <= today).map((s) => s.id);
      if (recentIds.length) {
        const { data } = await supabase.from("training_attendance").select("status").in("training_session_id", recentIds);
        setAttendance((data ?? []) as { status: AttendanceStatus }[]);
      } else {
        setAttendance([]);
      }
      setUpcoming((await loadUpcomingCompetitions()).filter((entry) => !entry.team_id || entry.team_id === teamId));
    }
    load();
  }, [today, teamId]);

  const weeks = useMemo(() => weeklyVolume(sessions.filter((s) => s.session_date <= today), today, 8), [sessions, today]);
  const thisWeek = weeks[weeks.length - 1];
  /* Mo-So der aktuellen Woche, inkl. geplanter Einheiten */
  const days = useMemo(() => weekDays(sessions, today), [sessions, today]);
  const weekTotal = days.reduce((sum, day) => sum + day.meters, 0);
  const weekDone = days.filter((day) => !day.planned).reduce((sum, day) => sum + day.meters, 0);
  const lastWeek = weeks[weeks.length - 2];
  const todaySessions = sessions.filter((session) => session.session_date === today);
  const nextSessions = sessions.filter((session) => session.session_date > today).slice(0, 3);

  const target = upcoming.find((entry) => competitionPriority(entry) === "A") ?? upcoming[0] ?? null;
  const countdown = target ? daysUntilDate(target.starts_at.slice(0, 10), today) : null;

  const attendanceData = (Object.keys(ATTENDANCE_COLORS) as AttendanceStatus[])
    .map((status) => ({ status, value: attendance.filter((entry) => entry.status === status).length }))
    .filter((item) => item.value > 0);
  const attendanceRate = attendance.length ? Math.round((attendance.filter((a) => a.status === "anwesend").length / attendance.length) * 100) : null;

  const todayLabel = new Date(`${today}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const volumeChange = lastWeek?.meters ? Math.round(((thisWeek.meters - lastWeek.meters) / lastWeek.meters) * 100) : null;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      {/* Kopf */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-app-muted">{todayLabel}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-app-heading">Dashboard</h1>
            {teams.length > 1 ? (
              <select value={teamId ?? ""} onChange={(e) => chooseTeam(e.target.value)} className="rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-sm font-semibold">
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            ) : (
              teams[0] && <span className="rounded-full bg-app-elevated px-3 py-1 text-sm font-semibold">{teams[0].name}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-full border border-app-border bg-app-surface px-3.5 py-2 text-sm font-medium text-app-heading shadow-app transition hover:border-app-accent"
            >
              <Icon name={item.icon} className="h-4 w-4 text-app-accent" />
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Hauptkarte: Countdown */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b3a6e] via-[#0b5aa0] to-[#1a8fd6] p-6 text-white shadow-app lg:col-span-4">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-white/5" />
          <p className="text-sm font-medium text-white/75">Nächster Höhepunkt</p>
          {target ? (
            <>
              <p className="mt-1 text-xl font-bold leading-tight">{target.title}</p>
              <p className="text-sm text-white/75">
                {formatEntryWhen(target)}
                {target.location ? ` · ${target.location}` : ""}
              </p>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-6xl font-bold tabular-nums">{countdown}</span>
                <span className="pb-2 text-lg text-white/80">{countdown === 1 ? "Tag" : "Tage"}</span>
                {competitionPriority(target) && (
                  <span className="mb-3 ml-auto rounded-full bg-white/20 px-3 py-1 text-xs font-bold">Priorität {competitionPriority(target)}</span>
                )}
              </div>
              <div className="relative mt-5 flex gap-2">
                <Link href="/coach/meldehilfe" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0b3a6e]">
                  Meldehilfe
                </Link>
                <Link href="/coach/dms" className="rounded-full border border-white/40 px-4 py-2 text-sm font-semibold">
                  Aufstellung
                </Link>
              </div>
            </>
          ) : (
            <p className="mt-2 text-white/80">Kein Wettkampf im Kalender.</p>
          )}
        </section>

        {/* Trainingsumfang der aktuellen Woche (Mo-So) */}
        <Tile className="lg:col-span-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-app-muted">
                Trainingsumfang · <b className="text-app-text">KW {isoWeek(today)}</b> ({days[0].label.slice(3)}–{days[6].label.slice(3)})
              </p>
              <p className="text-2xl font-bold text-app-heading">
                {(weekDone / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km
                {weekTotal > weekDone && (
                  <span className="ml-2 text-sm font-medium text-app-muted">/ {(weekTotal / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km</span>
                )}
              </p>
            </div>
            {volumeChange !== null && (
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${volumeChange >= 0 ? "bg-app-good/10 text-app-good" : "bg-app-warn/15 text-app-warn"}`}>
                {volumeChange >= 0 ? "+" : ""}
                {volumeChange} % zur Vorwoche
              </span>
            )}
          </div>
          <div className="mt-3 h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={days}>
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--app-muted)", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "var(--app-elevated)" }}
                  contentStyle={{ backgroundColor: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 12 }}
                  formatter={(value, _name, item) => [
                    `${Number(value).toLocaleString("de-DE")} m · ${item.payload.sessions} ${item.payload.sessions === 1 ? "Einheit" : "Einheiten"}${item.payload.planned ? " (geplant)" : ""}`,
                    "",
                  ]}
                />
                <Bar dataKey="meters" radius={[8, 8, 8, 8]} minPointSize={3}>
                  {days.map((day) => (
                    <Cell
                      key={day.date}
                      fill={day.today ? "var(--app-accent)" : "var(--chart-25)"}
                      fillOpacity={day.planned ? 0.25 : day.today ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Tile>

        {/* Anwesenheit */}
        <Tile className="flex flex-col lg:col-span-3">
          <p className="text-sm text-app-muted">Anwesenheit · 4 Wochen</p>
          {attendanceRate === null ? (
            <p className="mt-6 text-sm text-app-faint">Noch keine Anwesenheit abgehakt.</p>
          ) : (
            <>
              <div className="relative mx-auto mt-1 h-36 w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={attendanceData}
                      dataKey="value"
                      nameKey="status"
                      innerRadius="78%"
                      outerRadius="100%"
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={2}
                      cornerRadius={6}
                      stroke="none"
                    >
                      {attendanceData.map((item) => (
                        <Cell key={item.status} fill={ATTENDANCE_COLORS[item.status]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-app-heading">{attendanceRate}%</span>
                  <span className="text-[11px] text-app-muted">anwesend</span>
                </div>
              </div>
              <div className="mt-auto grid grid-cols-4 gap-1 pt-3 text-center">
                {(Object.keys(ATTENDANCE_COLORS) as AttendanceStatus[]).map((status) => (
                  <div key={status}>
                    <span className="mx-auto mb-1 block h-1.5 w-6 rounded-full" style={{ background: ATTENDANCE_COLORS[status] }} />
                    <span className="block text-base font-bold text-app-heading">{attendance.filter((entry) => entry.status === status).length}</span>
                    <span className="block text-[10px] text-app-muted">{ATTENDANCE_LABELS[status]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Tile>

        {/* Kennzahlen */}
        {[
          { label: "Athleten", value: athleteCount ?? "–", icon: "athlete" as IconName, href: "/coach/schwimmer" },
          { label: "Einheiten diese Woche", value: thisWeek?.sessions ?? 0, icon: "training" as IconName, href: "/coach/training" },
          { label: "Training heute", value: todaySessions.length, icon: "calendar" as IconName, href: "/coach/training" },
          { label: "Wettkämpfe geplant", value: upcoming.length, icon: "trophy" as IconName, href: "/coach/kalender" },
        ].map((kpi) => (
          <Link key={kpi.label} href={kpi.href} className="group lg:col-span-3">
            <Tile className="flex h-full items-center gap-4 transition group-hover:border-app-accent">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-app-accent/12 text-app-accent">
                <Icon name={kpi.icon} className="h-6 w-6" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-bold text-app-heading">{kpi.value}</span>
                <span className="block text-sm text-app-muted">{kpi.label}</span>
              </span>
            </Tile>
          </Link>
        ))}

        {/* Rote Flaggen */}
        <div className="lg:col-span-7 [&>section]:mt-0 [&>section]:rounded-3xl [&>section]:shadow-app">
          {teamId && <RedFlagsPanel teamId={teamId} />}
        </div>

        {/* Heute & naechste Einheiten */}
        <Tile className="lg:col-span-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-app-heading">Training</p>
            <Link href="/coach/training/new" className="text-sm text-app-accent">
              + planen
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {[...todaySessions, ...nextSessions].length === 0 && <li className="text-sm text-app-faint">Keine Einheiten in den nächsten 7 Tagen.</li>}
            {[...todaySessions, ...nextSessions].map((session) => (
              <li key={session.id}>
                <Link
                  href={`/coach/training/session/${session.id}`}
                  className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-app-elevated ${
                    session.session_date === today ? "bg-app-accent/10" : "bg-app-bg"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-app-heading">{session.title}</span>
                    <span className="text-xs text-app-muted">
                      {session.session_date === today
                        ? "Heute"
                        : new Date(`${session.session_date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
                      {session.start_time ? ` · ${session.start_time.slice(0, 5)}` : ""}
                      {session.duration_minutes ? ` · ${session.duration_minutes} min` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {session.total_meters ? <span className="text-sm font-semibold tabular-nums">{session.total_meters.toLocaleString("de-DE")} m</span> : null}
                    {session.session_date <= today && (
                      <span className="rounded-full bg-app-accent px-2.5 py-1 text-xs font-semibold text-app-accent-ink">Anwesenheit</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Tile>

        {/* Termine und News */}
        <div className="lg:col-span-6">
          <UpcomingEntries href="/coach/kalender" />
        </div>
        <div className="lg:col-span-6">
          <LatestNews href="/coach/news" />
        </div>
      </div>
    </div>
  );
}
