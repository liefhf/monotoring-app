"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { fetchAll } from "@/lib/fetchAll";
import { CalendarEntry, formatEntryWhen, localDateOf, toDateKey } from "@/lib/community";
import { competitionPriority, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import { daysUntilDate, isoWeek, weekDays, weekStart } from "@/lib/dashboardStats";
import { AttendanceStatus } from "@/lib/attendance";
import { Icon, IconName } from "@/components/icons";
import RedFlagsPanel from "@/components/RedFlagsPanel";
import TodoCard from "@/components/TodoCard";
import TeamSwitcher from "@/components/TeamSwitcher";
import MiniCalendar from "@/components/MiniCalendar";

/*
 * Coach-Dashboard im Kachel-Raster ("Bento"): Wettkampf-Countdown als
 * Hauptkarte, Trainingsumfang der Woche, Anwesenheit als Ring,
 * Wochenplan (vor/zurueck blaettern, Tage planen), Athleten-Check, Termine.
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

/* Farben passend zur Palette (Pink/Lila), "fehlt" gedaempft statt Signalrot */
const ATTENDANCE_COLORS: Record<AttendanceStatus, string> = {
  anwesend: "var(--app-accent)",
  entschuldigt: "var(--app-accent-2)",
  krank: "#c4b5fd",
  fehlt: "var(--app-faint)",
};

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = { anwesend: "da", entschuldigt: "entsch.", krank: "krank", fehlt: "fehlt" };

function Tile({ className = "", href, children }: { className?: string; href?: string; children: React.ReactNode }) {
  const classes = `rounded-3xl border border-app-border bg-app-surface p-5 shadow-app ${className}`;
  /* Mit href ist die ganze Karte ein Link zur passenden Seite */
  return href ? (
    <Link href={href} className={`block transition hover:border-app-accent ${classes}`}>
      {children}
    </Link>
  ) : (
    <section className={classes}>{children}</section>
  );
}

export default function CoachPage() {
  const [today] = useState(() => toDateKey(new Date()));
  const [attendance, setAttendance] = useState<{ status: AttendanceStatus }[]>([]);
  const [athleteCount, setAthleteCount] = useState<number | null>(null);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  /* Das Dashboard zeigt eine Mannschaft - die Wahl bleibt im Browser gespeichert */
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  /* angezeigte Woche (Montag) - vor und zurueck blaetterbar */
  const [weekAnchor, setWeekAnchor] = useState(() => weekStart(iso(Date.now())));
  const [weekSessions, setWeekSessions] = useState<Session[]>([]);

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

  /* Einheiten der angezeigten Woche plus Vorwoche (fuer den Vergleich) */
  useEffect(() => {
    if (!teamId) return;
    fetchAll(() =>
      supabase
        .from("training_sessions")
        .select("id, title, session_date, start_time, total_meters, duration_minutes, team_id")
        .gte("session_date", iso(Date.parse(weekAnchor) - 7 * DAY))
        .lte("session_date", iso(Date.parse(weekAnchor) + 6 * DAY))
        .eq("team_id", teamId)
        .order("session_date")
        .order("start_time")
    ).then(({ data }) => setWeekSessions((data ?? []) as Session[]));
  }, [teamId, weekAnchor]);


  /* Mo-So der aktuellen Woche, inkl. geplanter Einheiten */
  const days = useMemo(() => weekDays(weekSessions, today, weekAnchor), [weekSessions, today, weekAnchor]);
  const previousWeekMeters = weekSessions.filter((session) => session.session_date < weekAnchor).reduce((sum, session) => sum + (session.total_meters ?? 0), 0);
  const weekTotal = days.reduce((sum, day) => sum + day.meters, 0);
  const weekDone = days.filter((day) => !day.planned).reduce((sum, day) => sum + day.meters, 0);

  const target = upcoming.find((entry) => competitionPriority(entry) === "A") ?? upcoming[0] ?? null;
  const countdown = target ? daysUntilDate(localDateOf(target.starts_at), today) : null;

  const attendanceData = (Object.keys(ATTENDANCE_COLORS) as AttendanceStatus[])
    .map((status) => ({ status, value: attendance.filter((entry) => entry.status === status).length }))
    .filter((item) => item.value > 0);
  const attendanceRate = attendance.length ? Math.round((attendance.filter((a) => a.status === "anwesend").length / attendance.length) * 100) : null;

  const todayLabel = new Date(`${today}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const volumeChange = previousWeekMeters ? Math.round(((weekTotal - previousWeekMeters) / previousWeekMeters) * 100) : null;
  const currentMonday = weekStart(today);
  const shiftWeek = (count: number) => setWeekAnchor(iso(Date.parse(weekAnchor) + count * 7 * DAY));

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5">
      {/* Kopf */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-app-muted">{todayLabel}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-app-heading">Dashboard</h1>
            <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} />
            {athleteCount !== null && <span className="text-sm text-app-muted">{athleteCount} Athleten</span>}
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
        <section className="relative overflow-hidden rounded-3xl p-6 text-white shadow-app lg:col-span-4"
          style={{ background: "linear-gradient(135deg, var(--app-accent-2), var(--app-accent))" }}>
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 right-10 h-40 w-40 rounded-full bg-white/5" />
          <p className="text-sm font-medium text-white/75">Nächster Höhepunkt</p>
          {target ? (
            <>
              <Link href="/coach/kalender" className="relative mt-1 block text-xl font-bold leading-tight hover:underline">
                {target.title}
              </Link>
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
                <Link href="/coach/meldehilfe" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[color:var(--app-accent-2)]">
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
        <Tile className="lg:col-span-5" href="/coach/training">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-app-muted">
                Trainingsumfang · <b className="text-app-text">KW {isoWeek(weekAnchor)}</b> ({days[0].label.slice(3)}–{days[6].label.slice(3)})
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
                {volumeChange} %
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
        <Tile className="flex flex-col lg:col-span-3" href="/coach/athleten-check">
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

        {/* Wochenplan */}
        <Tile className="lg:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/coach/training" className="text-sm text-app-muted hover:text-app-accent">
              Wochenplan · <b className="text-app-text">KW {isoWeek(weekAnchor)}</b>
            </Link>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => shiftWeek(-1)} className="h-8 w-8 rounded-full border border-app-border text-app-muted hover:text-app-heading" aria-label="Vorige Woche">
                ‹
              </button>
              {weekAnchor !== currentMonday && (
                <button type="button" onClick={() => setWeekAnchor(currentMonday)} className="rounded-full border border-app-border px-3 py-1 text-xs font-semibold text-app-accent">
                  Heute
                </button>
              )}
              <button type="button" onClick={() => shiftWeek(1)} className="h-8 w-8 rounded-full border border-app-border text-app-muted hover:text-app-heading" aria-label="Nächste Woche">
                ›
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {days.map((day) => {
              const list = weekSessions.filter((session) => session.session_date === day.date);
              return (
                <div key={day.date} className={`flex min-h-[120px] flex-col rounded-2xl p-2.5 ${day.today ? "bg-app-accent/12 ring-1 ring-app-accent/50" : "bg-app-bg"}`}>
                  <p className={`text-xs font-semibold ${day.today ? "text-app-accent" : "text-app-muted"}`}>{day.label}</p>
                  <div className="mt-1.5 flex-1 space-y-1.5">
                    {list.map((session) => (
                      <Link
                        key={session.id}
                        href={`/coach/training/session/${session.id}`}
                        className="block rounded-xl bg-app-surface px-2 py-1.5 text-xs shadow-app transition hover:ring-1 hover:ring-app-accent"
                      >
                        <span className="line-clamp-2 font-semibold text-app-heading">{session.title}</span>
                        <span className="text-app-muted">
                          {session.start_time ? session.start_time.slice(0, 5) : ""}
                          {session.total_meters ? ` · ${session.total_meters.toLocaleString("de-DE")} m` : ""}
                        </span>
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`/coach/training/new?day=${day.date}`}
                    className="mt-1.5 rounded-xl border border-dashed border-app-border py-1 text-center text-sm text-app-muted transition hover:border-app-accent hover:text-app-accent"
                    aria-label={`Training am ${day.label} planen`}
                  >
                    +
                  </Link>
                </div>
              );
            })}
          </div>
        </Tile>

        {/* Athleten-Check */}
        <div className="lg:col-span-4">{teamId && <RedFlagsPanel teamId={teamId} variant="summary" />}</div>

        {/* To-do */}
        <div className="lg:col-span-3">
          <TodoCard teamId={teamId} />
        </div>

        {/* Kalender */}
        <div className="lg:col-span-5">
          <MiniCalendar teamId={teamId} today={today} />
        </div>
      </div>
    </div>
  );
}
