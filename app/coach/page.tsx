"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";
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
 * Coach-Dashboard nach dem Gesamtdesign: Leiste "Heute" mit
 * Schnellaktionen, Team heute (Athleten-Check), Wettkampf-Ticket,
 * Anwesenheit, Wochenumfang, Wochenplan, To-dos und Termine.
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
  anwesend: "var(--app-good)",
  entschuldigt: "var(--app-accent-soft)",
  krank: "var(--app-info)",
  fehlt: "var(--app-faint)",
};

const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = { anwesend: "da", entschuldigt: "entsch.", krank: "krank", fehlt: "fehlt" };

function Tile({ className = "", href, children }: { className?: string; href?: string; children: React.ReactNode }) {
  const classes = `rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px] ${className}`;
  /* Mit href ist die ganze Karte ein Link zur passenden Seite */
  return href ? (
    <Link href={href} className={`block transition hover:border-app-accent/40 hover:bg-app-elevated/40 ${classes}`}>
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

  /* Heutige Einheit(en) fuer die Leiste "Heute" */
  const todaySessions = weekSessions.filter((session) => session.session_date === today);
  const nextToday = todaySessions[0] ?? null;
  const priority = target ? competitionPriority(target) : null;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-3 sm:space-y-5">
      {/* Kopf */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-app-muted">{todayLabel}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">Dashboard</h1>
            <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} />
            {athleteCount !== null && <span className="num text-[13px] text-app-muted">{athleteCount} Athleten</span>}
          </div>
        </div>
        <nav aria-label="Schnellzugriff" className="-mx-4 flex w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 sm:mx-0 sm:w-auto sm:flex-wrap sm:px-0">
          {QUICK.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-app-elevated px-3.5 text-[13px] font-bold text-app-heading transition hover:bg-app-border/70"
            >
              <Icon name={item.icon} className="h-4 w-4 text-app-accent-soft" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Heute: naechste Einheit + Schnellaktionen (Design: Dashboard oben) */}
      <section
        aria-label="Heute"
        className="flex flex-col gap-3 rounded-[20px] border border-app-border/60 bg-app-surface p-3.5 shadow-app sm:flex-row sm:items-center sm:rounded-full sm:py-2.5 sm:pl-6 sm:pr-3"
      >
        {nextToday ? (
          <Link href={`/coach/training/session/${nextToday.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full bg-app-good ring-4 ring-app-good/20" aria-hidden="true" />
            <span className="label-caps hidden !text-app-accent-soft sm:inline">Heute</span>
            {nextToday.start_time && <span className="num text-[15px] font-semibold text-app-heading">{nextToday.start_time.slice(0, 5)}</span>}
            <span className="truncate text-[15px] font-bold text-app-heading">{nextToday.title}</span>
            {nextToday.total_meters ? (
              <span className="num ml-auto shrink-0 text-[13px] text-app-muted sm:ml-0">
                {(nextToday.total_meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km
              </span>
            ) : null}
            {todaySessions.length > 1 && <span className="hidden text-[13px] text-app-muted sm:inline">+{todaySessions.length - 1} weitere</span>}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="h-3 w-3 shrink-0 rounded-full bg-app-faint" aria-hidden="true" />
            <span className="label-caps hidden sm:inline">Heute</span>
            <span className="truncate text-[15px] font-bold text-app-heading">Kein Training geplant</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Link
            href="/coach/anwesenheit"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-app-accent px-[18px] text-sm font-bold text-app-accent-ink transition hover:brightness-110 sm:flex-none"
          >
            <Icon name="check" className="h-[18px] w-[18px]" />
            Anwesenheit
          </Link>
          {nextToday ? (
            <Link
              href={`/coach/training/session/${nextToday.id}`}
              aria-label="Einheit öffnen"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-app-elevated text-app-heading transition hover:bg-app-border/70"
            >
              <Icon name="training" className="h-[18px] w-[18px]" />
            </Link>
          ) : (
            <Link
              href={`/coach/training/new?day=${today}`}
              className="flex h-11 items-center justify-center gap-1.5 rounded-full bg-app-elevated px-4 text-sm font-bold text-app-heading transition hover:bg-app-border/70"
            >
              <Icon name="plus" className="h-4 w-4" />
              Einheit
            </Link>
          )}
          <Link
            href="/coach/athleten-check"
            aria-label="Athleten-Check"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-app-elevated text-app-heading transition hover:bg-app-border/70"
          >
            <Icon name="heart" className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Team heute (Athleten-Check) */}
        <div className="lg:col-span-5">{teamId && <RedFlagsPanel teamId={teamId} variant="summary" />}</div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-5 lg:col-span-7">
          {/* Naechster Wettkampf: das eine Highlight der Seite */}
          <section aria-label="Nächster Wettkampf" className="overflow-hidden rounded-[20px] border border-app-border/60 bg-app-surface shadow-app">
            <div className="bg-highlight flex items-center gap-4 p-5 text-white sm:px-6">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/85">Nächster Höhepunkt</p>
                {target ? (
                  <>
                    <Link href="/coach/kalender" className="mt-1 block truncate text-lg font-extrabold leading-tight hover:underline sm:text-xl">
                      {target.title}
                    </Link>
                    <p className="truncate text-[13px] text-white/90">
                      {formatEntryWhen(target)}
                      {target.location ? ` · ${target.location}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-[15px] font-bold">Kein Wettkampf im Kalender.</p>
                )}
              </div>
              {target && countdown !== null && (
                <div className="text-center">
                  <div className="num text-[44px] font-semibold leading-none sm:text-[56px]">{countdown}</div>
                  <div className="text-[11px] font-extrabold uppercase">{countdown === 1 ? "Tag" : "Tage"}</div>
                </div>
              )}
            </div>
            {target && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 sm:px-6">
                {priority && <span className="rounded-full bg-app-soon/15 px-2.5 py-1 text-xs font-extrabold text-app-soon">Priorität {priority}</span>}
                <Link href="/coach/meldehilfe" className="ml-auto inline-flex min-h-9 items-center gap-1.5 text-[13px] font-bold text-app-accent-soft hover:underline">
                  <Icon name="stopwatch" className="h-4 w-4" />
                  Meldehilfe
                </Link>
                <Link href="/coach/dms" className="inline-flex min-h-9 items-center gap-1.5 text-[13px] font-bold text-app-accent-soft hover:underline">
                  <Icon name="teams" className="h-4 w-4" />
                  Aufstellung
                </Link>
              </div>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-[2fr_3fr] sm:gap-5">
            {/* Anwesenheit */}
            <Tile className="flex flex-col" href="/coach/anwesenheit">
              <p className="text-[15px] font-bold text-app-heading">Anwesenheit</p>
              <p className="text-[13px] text-app-muted">letzte 4 Wochen</p>
              {attendanceRate === null ? (
                <p className="mt-4 text-sm text-app-faint">Noch keine Anwesenheit abgehakt.</p>
              ) : (
                <>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="num text-[32px] font-semibold leading-tight text-app-heading">{attendanceRate}</span>
                    <span className="text-app-muted">%</span>
                  </p>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-app-elevated" aria-hidden="true">
                    {attendanceData.map((item) => (
                      <span key={item.status} style={{ width: `${(item.value / attendance.length) * 100}%`, background: ATTENDANCE_COLORS[item.status] }} />
                    ))}
                  </div>
                  <div className="mt-auto grid grid-cols-4 gap-1 pt-3 text-center">
                    {(Object.keys(ATTENDANCE_COLORS) as AttendanceStatus[]).map((status) => (
                      <div key={status}>
                        <span className="num block text-base font-semibold text-app-heading">{attendance.filter((entry) => entry.status === status).length}</span>
                        <span className="block text-[10px] text-app-muted">{ATTENDANCE_LABELS[status]}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Tile>

            {/* Trainingsumfang der Woche (Mo-So) */}
            <Tile href={`/coach/wochenplan?week=${weekAnchor}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold text-app-heading">Umfang Woche</p>
                  <p className="text-[13px] text-app-muted">KW {isoWeek(weekAnchor)} · {days[0].label.slice(3)}–{days[6].label.slice(3)}</p>
                </div>
                {volumeChange !== null && (
                  <span className={`num rounded-full px-2.5 py-1 text-xs font-bold ${volumeChange >= 0 ? "bg-app-good/15 text-app-good" : "bg-app-warn/15 text-app-warn"}`}>
                    {volumeChange >= 0 ? "+" : ""}
                    {volumeChange} %
                  </span>
                )}
              </div>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="num text-[32px] font-semibold leading-tight text-app-heading">
                  {(weekDone / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })}
                </span>
                <span className="text-xs text-app-muted">
                  {weekTotal > weekDone ? `/ ${(weekTotal / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km` : "km"}
                </span>
              </p>
              <div className="mt-2 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={days}>
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--app-muted)", fontSize: 10 }} tickFormatter={(label: string) => label.slice(0, 2)} />
                    <Tooltip
                      cursor={{ fill: "var(--app-elevated)" }}
                      contentStyle={{ backgroundColor: "var(--app-surface)", border: "1px solid var(--app-border)", borderRadius: 12 }}
                      formatter={(value, _name, item) => [
                        `${Number(value).toLocaleString("de-DE")} m · ${item.payload.sessions} ${item.payload.sessions === 1 ? "Einheit" : "Einheiten"}${item.payload.planned ? " (geplant)" : ""}`,
                        "",
                      ]}
                    />
                    <Bar dataKey="meters" radius={[6, 6, 6, 6]} minPointSize={3}>
                      {days.map((day) => (
                        <Cell key={day.date} fill={day.today ? "var(--app-accent)" : "var(--app-accent-soft)"} fillOpacity={day.planned ? 0.2 : day.today ? 1 : 0.45} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Tile>
          </div>
        </div>

        {/* Wochenplan */}
        <Tile className="lg:col-span-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href={`/coach/wochenplan?week=${weekAnchor}`} className="text-[15px] font-bold text-app-heading hover:text-app-accent-soft">
              Wochenplan <span className="ml-1 text-[13px] font-semibold text-app-muted">KW {isoWeek(weekAnchor)}</span>
            </Link>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => shiftWeek(-1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-elevated text-app-heading hover:bg-app-border/70" aria-label="Vorige Woche">
                ‹
              </button>
              {weekAnchor !== currentMonday && (
                <button type="button" onClick={() => setWeekAnchor(currentMonday)} className="h-11 rounded-xl bg-app-elevated px-4 text-sm font-bold text-app-heading hover:bg-app-border/70">
                  Heute
                </button>
              )}
              <button type="button" onClick={() => shiftWeek(1)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-elevated text-app-heading hover:bg-app-border/70" aria-label="Nächste Woche">
                ›
              </button>
            </div>
          </div>
          <ol className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-1 lg:grid lg:grid-cols-7 lg:overflow-visible">
            {days.map((day) => {
              const list = weekSessions.filter((session) => session.session_date === day.date);
              return (
                <li
                  key={day.date}
                  className={`flex min-h-[120px] w-[140px] shrink-0 snap-start flex-col rounded-[14px] p-2.5 lg:w-auto ${day.today ? "bg-app-accent/10 ring-1 ring-app-accent/50" : "bg-app-bg"}`}
                >
                  <p className={`text-xs font-bold ${day.today ? "text-app-soon" : "text-app-muted"}`}>{day.label}</p>
                  <div className="mt-1.5 flex-1 space-y-1.5">
                    {list.map((session) => (
                      <Link
                        key={session.id}
                        href={`/coach/training/session/${session.id}`}
                        className="block rounded-xl bg-app-elevated px-2 py-1.5 text-xs transition hover:ring-1 hover:ring-app-accent"
                      >
                        {session.start_time && <span className="num block text-[11px] text-app-accent-soft">{session.start_time.slice(0, 5)}</span>}
                        <span className="line-clamp-2 font-bold text-app-heading">{session.title}</span>
                        {session.total_meters ? <span className="num text-app-muted">{session.total_meters.toLocaleString("de-DE")} m</span> : null}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={`/coach/training/new?day=${day.date}`}
                    className="mt-1.5 flex min-h-9 items-center justify-center rounded-xl border border-dashed border-app-border text-sm text-app-muted transition hover:border-app-accent hover:text-app-accent-soft"
                    aria-label={`Training am ${day.label} planen`}
                  >
                    +
                  </Link>
                </li>
              );
            })}
          </ol>
        </Tile>

        {/* To-do */}
        <div className="lg:col-span-5">
          <TodoCard teamId={teamId} />
        </div>

        {/* Kalender */}
        <div className="lg:col-span-7">
          <MiniCalendar teamId={teamId} today={today} />
        </div>
      </div>
    </div>
  );
}
