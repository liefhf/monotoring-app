"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSelectedTeam } from "@/lib/useSelectedTeam";
import { fetchAll } from "@/lib/fetchAll";
import { CalendarEntry, CALENDAR_COLUMNS, formatEntryWhen, localDateOf, toDateKey } from "@/lib/community";
import { competitionPriority, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import { daysUntilDate } from "@/lib/dashboardStats";
import { RESULT_COLUMNS, SwimmerResult, formatEventShort, formatTime, formatTimeDifference } from "@/lib/swim";
import { newPersonalBests } from "@/lib/weeklyReport";
import { Icon } from "@/components/icons";
import RedFlagsPanel from "@/components/RedFlagsPanel";
import TodoCard from "@/components/TodoCard";
import TeamSwitcher from "@/components/TeamSwitcher";
import DeadlinesCard from "@/components/DeadlinesCard";

/*
 * Coach-Dashboard = Kommandozentrale. Nach Prioritaet geordnet:
 *   1. Aufmerksamkeit heute  - Athleten mit Hinweisen (vorsortiert, erklaert)
 *   2. Heute                 - Einheit(en) heute mit Schnellaktionen, Termine der Woche, naechster Wettkampf
 *   3. Team                  - Check-ins heute, Anwesenheit 4 Wochen
 *   4. Entwicklung           - neue Bestzeiten der letzten 7 Tage
 *   dazu Fristen (Dokumente) und Aufgaben.
 * Bewusst keine Diagramme: der Trainer soll nichts selbst interpretieren
 * muessen. Wochenplan und Belastungsverlauf liegen unter "Training".
 */

type Session = { id: string; title: string; session_date: string; start_time: string | null; total_meters: number | null; training_type: string | null };
type Swimmer = { id: string; first_name: string; last_name: string | null; profile_id: string | null };

const DAY = 86_400_000;
const addDays = (date: string, days: number) => toDateKey(new Date(Date.parse(`${date}T12:00:00`) + days * DAY));

function Section({ title, meta, children }: { title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-[22px]">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="flex-1 text-[15px] font-bold text-app-heading">{title}</h2>
        {meta}
      </div>
      {children}
    </section>
  );
}

export default function CoachDashboard() {
  const [today] = useState(() => toDateKey(new Date()));
  const { teams, teamId, chooseTeam } = useSelectedTeam();
  const [todaySessions, setTodaySessions] = useState<Session[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEntry[]>([]);
  const [competition, setCompetition] = useState<CalendarEntry | null>(null);
  const [swimmers, setSwimmers] = useState<Swimmer[]>([]);
  const [checkedIn, setCheckedIn] = useState<Set<string>>(new Set());
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [bests, setBests] = useState<{ result: SwimmerResult; previous: number }[]>([]);


  useEffect(() => {
    if (!teamId) return;
    async function load() {
      const memberIds = (((await supabase.from("team_swimmers").select("swimmer_id").eq("team_id", teamId!)).data ?? []) as { swimmer_id: string }[]).map((row) => row.swimmer_id);
      const [swimmerRes, sessionRes, recentRes, eventRes, upcoming] = await Promise.all([
        memberIds.length ? supabase.from("swimmers").select("id, first_name, last_name, profile_id").in("id", memberIds) : Promise.resolve({ data: [] }),
        supabase.from("training_sessions").select("id, title, session_date, start_time, total_meters, training_type").eq("team_id", teamId!).eq("session_date", today).order("start_time"),
        supabase.from("training_sessions").select("id").eq("team_id", teamId!).gte("session_date", addDays(today, -28)).lte("session_date", today),
        supabase
          .from("calendar_entries")
          .select(CALENDAR_COLUMNS)
          .gte("starts_at", `${today}T00:00:00`)
          .lte("starts_at", `${addDays(today, 7)}T23:59:59`)
          .order("starts_at"),
        loadUpcomingCompetitions(),
      ]);
      const team = (swimmerRes.data ?? []) as Swimmer[];
      setSwimmers(team);
      setTodaySessions((sessionRes.data ?? []) as Session[]);
      setWeekEvents(((eventRes.data ?? []) as CalendarEntry[]).filter((entry) => !entry.team_id || entry.team_id === teamId));
      const relevant = upcoming.filter((entry) => !entry.team_id || entry.team_id === teamId);
      setCompetition(relevant.find((entry) => competitionPriority(entry) === "A") ?? relevant[0] ?? null);

      const profileIds = team.map((swimmer) => swimmer.profile_id).filter(Boolean) as string[];
      const recentIds = ((recentRes.data ?? []) as { id: string }[]).map((row) => row.id);
      const [checkInRes, attendanceRes, resultRes] = await Promise.all([
        profileIds.length ? supabase.from("befinden_entries").select("athlete_id").in("athlete_id", profileIds).eq("entry_date", today) : Promise.resolve({ data: [] }),
        recentIds.length ? supabase.from("training_attendance").select("status").in("training_session_id", recentIds) : Promise.resolve({ data: [] }),
        team.length
          ? fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS).in("swimmer_id", team.map((swimmer) => swimmer.id)).eq("kind", "einzel"))
          : Promise.resolve({ data: [] }),
      ]);
      setCheckedIn(new Set(((checkInRes.data ?? []) as { athlete_id: string }[]).map((row) => row.athlete_id)));
      const attendance = (attendanceRes.data ?? []) as { status: string }[];
      setAttendanceRate(attendance.length ? Math.round((attendance.filter((row) => row.status === "anwesend").length / attendance.length) * 100) : null);
      setBests(newPersonalBests((resultRes.data ?? []) as SwimmerResult[], addDays(today, -7), today).slice(0, 5));
    }
    load();
  }, [teamId, today]);

  const todayLabel = new Date(`${today}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const withLogin = swimmers.filter((swimmer) => swimmer.profile_id);
  const missingCheckIn = withLogin.filter((swimmer) => !checkedIn.has(swimmer.profile_id!));
  const nameOf = (id: string) => {
    const swimmer = swimmers.find((item) => item.id === id);
    return swimmer ? `${swimmer.first_name} ${swimmer.last_name ?? ""}`.trim() : "Athlet";
  };
  const countdown = competition ? daysUntilDate(localDateOf(competition.starts_at), today) : null;

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] text-app-muted">{todayLabel}</p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">Guten Tag</h1>
            {teams.length > 0 && teamId && <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 [&>*]:min-w-0">
        {/* 1. Aufmerksamkeit heute */}
        <div className="lg:col-span-7">{teamId && <RedFlagsPanel teamId={teamId} variant="summary" />}</div>

        {/* 2. Heute */}
        <div className="space-y-4 sm:space-y-5 lg:col-span-5">
          <Section title="Heute" meta={<Link href="/coach/training" className="text-[13px] font-semibold text-app-accent-soft hover:underline">Trainingswoche →</Link>}>
            {todaySessions.length === 0 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-app-muted">Kein Training geplant.</p>
                <Link href={`/coach/training/new?day=${today}`} className="inline-flex min-h-11 items-center rounded-xl bg-app-elevated px-4 text-sm font-bold text-app-heading hover:bg-app-border/70">
                  + Einheit
                </Link>
              </div>
            ) : (
              <ul className="space-y-2">
                {todaySessions.map((session) => (
                  <li key={session.id} className="rounded-[14px] bg-app-elevated/60 p-3">
                    <Link href={`/coach/training/session/${session.id}`} className="block">
                      <span className="num text-[13px] text-app-accent-soft">{session.start_time?.slice(0, 5) ?? "–"}</span>{" "}
                      <span className="font-bold text-app-heading">{session.title}</span>
                      <span className="block text-[13px] text-app-muted">
                        {session.training_type === "land" ? "Land" : session.total_meters ? `${(session.total_meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km` : "Wasser"}
                      </span>
                    </Link>
                    <div className="mt-2 flex gap-2">
                      <Link
                        href={`/coach/training/session/${session.id}#anwesenheit`}
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-app-accent px-4 text-sm font-bold text-app-accent-ink hover:brightness-110"
                      >
                        <Icon name="check" className="h-4 w-4" /> Anwesenheit
                      </Link>
                      <Link href={`/coach/training/session/${session.id}`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-app-surface px-4 text-sm font-bold text-app-heading">
                        Öffnen
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {weekEvents.length > 0 && (
              <div className="mt-4">
                <p className="label-caps mb-1.5">Nächste 7 Tage</p>
                <ul className="space-y-1.5 text-sm">
                  {weekEvents.slice(0, 4).map((entry) => (
                    <li key={entry.id} className="flex gap-3">
                      <span className="w-24 shrink-0 text-[13px] text-app-muted">{formatEntryWhen(entry)}</span>
                      <span className="min-w-0 flex-1 truncate text-app-heading">{entry.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          {competition && countdown !== null && (
            <Link href="/coach/competitions" className="bg-highlight flex items-center gap-4 rounded-[20px] p-5 text-white">
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-white/85">Nächster Wettkampf</span>
                <span className="block truncate text-lg font-extrabold">{competition.title}</span>
                <span className="block truncate text-[13px] text-white/90">
                  {formatEntryWhen(competition)}
                  {competition.location ? ` · ${competition.location}` : ""}
                </span>
              </span>
              <span className="text-center">
                <span className="num block text-[40px] font-semibold leading-none">{countdown}</span>
                <span className="text-[11px] font-extrabold uppercase">{countdown === 1 ? "Tag" : "Tage"}</span>
              </span>
            </Link>
          )}
        </div>

        {/* 3. Team */}
        <div className="lg:col-span-4">
          <Section title="Team">
            <dl className="grid grid-cols-2 gap-2">
              <div className="rounded-[14px] bg-app-elevated/60 px-3.5 py-3">
                <dt className="label-caps">Check-ins heute</dt>
                <dd className="num mt-1 text-xl font-semibold text-app-heading">
                  {checkedIn.size}/{withLogin.length}
                </dd>
              </div>
              <div className="rounded-[14px] bg-app-elevated/60 px-3.5 py-3">
                <dt className="label-caps">Anwesenheit 4 Wo.</dt>
                <dd className="num mt-1 text-xl font-semibold text-app-heading">{attendanceRate === null ? "–" : `${attendanceRate} %`}</dd>
              </div>
            </dl>
            {missingCheckIn.length > 0 && withLogin.length > 0 && (
              <p className="mt-3 text-[13px] text-app-muted">
                Noch kein Check-in: {missingCheckIn.slice(0, 6).map((swimmer) => swimmer.first_name).join(", ")}
                {missingCheckIn.length > 6 ? ` und ${missingCheckIn.length - 6} weitere` : ""}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-[13px] font-semibold">
              <Link href="/coach/anwesenheit" className="text-app-accent-soft hover:underline">Anwesenheit →</Link>
              <Link href="/coach/bericht" className="text-app-accent-soft hover:underline">Wochenbericht →</Link>
            </div>
          </Section>
        </div>

        {/* 4. Entwicklung */}
        <div className="lg:col-span-4">
          <Section title="Neue Bestzeiten" meta={<span className="text-[13px] text-app-muted">letzte 7 Tage</span>}>
            {bests.length === 0 ? (
              <p className="text-sm text-app-muted">Keine neuen Bestzeiten.</p>
            ) : (
              <ul className="divide-y divide-app-border/60">
                {bests.map(({ result, previous }) => (
                  <li key={result.id}>
                    <Link href={`/coach/schwimmer/${result.swimmer_id}`} className="flex items-baseline gap-2 py-2 text-sm hover:text-app-accent-soft">
                      <span className="min-w-0 flex-1 truncate font-semibold text-app-heading">{nameOf(result.swimmer_id)}</span>
                      <span className="text-app-muted">{formatEventShort(result)}</span>
                      <span className="num font-semibold text-app-heading">{formatTime(result.time_ms)}</span>
                      <span className="num text-app-good">{formatTimeDifference(result.time_ms - previous)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Fristen und Aufgaben */}
        <div className="space-y-4 sm:space-y-5 lg:col-span-4">
          <DeadlinesCard />
          <TodoCard teamId={teamId} />
        </div>
      </div>
    </div>
  );
}
