"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { teamNotice, useSelectedTeam } from "@/lib/useSelectedTeam";
import { fetchAll } from "@/lib/fetchAll";
import { CalendarEntry, formatEntryWhen, localDateOf, toDateKey } from "@/lib/community";
import { competitionPriority, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import { daysUntilDate } from "@/lib/dashboardStats";
import { RESULT_COLUMNS, SwimmerResult, formatEvent, formatTime } from "@/lib/swim";
import { attendanceDisplay } from "@/lib/attendance";
import { newPersonalBests } from "@/lib/weeklyReport";
import { Icon } from "@/components/icons";
import RedFlagsPanel from "@/components/RedFlagsPanel";
import TodoCard from "@/components/TodoCard";
import { Details, IconTile, ListRow, cardClass } from "@/components/ui";
import TeamSwitcher from "@/components/TeamSwitcher";
import DeadlinesCard from "@/components/DeadlinesCard";

/*
 * Coach-Dashboard = Kommandozentrale. Nach Prioritaet geordnet:
 *   1. Aufmerksamkeit heute  - Athleten mit Hinweisen (vorsortiert, erklaert)
 *   2. Heute                 - Einheit(en) heute mit Schnellaktionen, Termine der Woche, naechster Wettkampf
 *   3. Team                  - Check-ins heute, Anwesenheit 4 Wochen
 *   4. Entwicklung           - neue Bestzeiten der letzten 7 Tage
 *   dazu Fristen (Dokumente) und Aufgaben.
 * Einziges Diagramm: geplanter Umfang dieser Woche (echte Planwerte).
 * Wochenplan und Belastungsverlauf liegen unter "Training".
 */

type Session = { id: string; title: string; session_date: string; start_time: string | null; total_meters: number | null; training_type: string | null };
type Swimmer = { id: string; first_name: string; last_name: string | null; profile_id: string | null };

const DAY = 86_400_000;
const addDays = (date: string, days: number) => toDateKey(new Date(Date.parse(`${date}T12:00:00`) + days * DAY));

/* Karte im Stil der Vorlage: runde Ecken, leichter Schatten */
function Section({ title, meta, children, id }: { title: string; meta?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className={`${cardClass} px-4 py-4 sm:px-5`}>
      <div className="mb-2 flex items-baseline gap-3">
        <h2 id={id} className="flex-1 text-base font-bold text-app-heading">
          {title}
        </h2>
        {meta}
      </div>
      {children}
    </section>
  );
}

export default function CoachDashboard() {
  const [today] = useState(() => toDateKey(new Date()));
  const { teams, teamId, chooseTeam, status: teamStatus } = useSelectedTeam();
  const teamHint = teamNotice(teamStatus, teamId);
  type DashData = {
    key: string;
    swimmers: Swimmer[];
    todaySessions: Session[];
    competition: CalendarEntry | null;
    checkedIn: Set<string> | null;
    attendance: { present: number; entries: number; recordedSessions: number; pastSessions: number } | null;
    bests: { result: SwimmerResult; previous: number }[];
    week: { date: string; meters: number; count: number }[] | null;
    failed: string[];
  };
  const [data, setData] = useState<DashData | null>(null);
  const key = `${teamId}|${today}`;

  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    const requestKey = `${teamId}|${today}`;
    async function load() {
      const failed: string[] = [];
      const memberRes = await supabase.from("team_swimmers").select("swimmer_id").eq("team_id", teamId!);
      if (memberRes.error) failed.push("Team");
      const memberIds = ((memberRes.data ?? []) as { swimmer_id: string }[]).map((row) => row.swimmer_id);
      const weekStart = addDays(today, -((new Date(`${today}T12:00:00`).getDay() + 6) % 7));
      const [swimmerRes, sessionRes, pastRes, upcoming, weekRes] = await Promise.all([
        memberIds.length ? supabase.from("swimmers").select("id, first_name, last_name, profile_id").in("id", memberIds) : Promise.resolve({ data: [], error: null }),
        supabase.from("training_sessions").select("id, title, session_date, start_time, total_meters, training_type").eq("team_id", teamId!).eq("session_date", today).order("start_time"),
        /* Anwesenheit: Einheiten der letzten 4 Wochen bis heute; gezaehlt werden nur erfasste Eintraege */
        supabase.from("training_sessions").select("id").eq("team_id", teamId!).gte("session_date", addDays(today, -27)).lte("session_date", today),
        loadUpcomingCompetitions(),
        supabase.from("training_sessions").select("session_date, total_meters").eq("team_id", teamId!).gte("session_date", weekStart).lte("session_date", addDays(weekStart, 6)),
      ]);
      if (swimmerRes.error) failed.push("Athleten");
      if (sessionRes.error || pastRes.error) failed.push("Trainings");
      const team = (swimmerRes.data ?? []) as Swimmer[];
      const relevant = upcoming.filter((entry) => !entry.team_id || entry.team_id === teamId);

      const profileIds = team.map((swimmer) => swimmer.profile_id).filter(Boolean) as string[];
      const pastIds = ((pastRes.data ?? []) as { id: string }[]).map((row) => row.id);
      const [checkInRes, attendanceRes, resultRes] = await Promise.all([
        profileIds.length ? supabase.from("befinden_entries").select("athlete_id").in("athlete_id", profileIds).eq("entry_date", today) : Promise.resolve({ data: [], error: null }),
        pastIds.length ? supabase.from("training_attendance").select("training_session_id, status").in("training_session_id", pastIds) : Promise.resolve({ data: [], error: null }),
        team.length
          ? fetchAll(() => supabase.from("swimmer_results").select(RESULT_COLUMNS).in("swimmer_id", team.map((swimmer) => swimmer.id)).eq("kind", "einzel").order("id"))
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (cancelled) return;
      const attendanceRows = (attendanceRes.data ?? []) as { training_session_id: string; status: string }[];
      setData({
        key: requestKey,
        swimmers: team,
        todaySessions: (sessionRes.data ?? []) as Session[],
        competition: relevant.find((entry) => competitionPriority(entry) === "A") ?? relevant[0] ?? null,
        checkedIn: checkInRes.error ? null : new Set(((checkInRes.data ?? []) as { athlete_id: string }[]).map((row) => row.athlete_id)),
        attendance: attendanceRes.error
          ? null
          : {
              present: attendanceRows.filter((row) => row.status === "anwesend").length,
              entries: attendanceRows.length,
              recordedSessions: new Set(attendanceRows.map((row) => row.training_session_id)).size,
              pastSessions: pastIds.length,
            },
        bests: resultRes.error ? [] : newPersonalBests((resultRes.data ?? []) as SwimmerResult[], addDays(today, -7), today).slice(0, 5),
        week: weekRes.error
          ? null
          : Array.from({ length: 7 }, (_, i) => {
              const date = addDays(weekStart, i);
              const list = ((weekRes.data ?? []) as { session_date: string; total_meters: number | null }[]).filter((row) => row.session_date === date);
              return { date, meters: list.reduce((sum, row) => sum + (row.total_meters ?? 0), 0), count: list.length };
            }),
        failed: [...failed, ...(weekRes.error ? ["Wochenumfang"] : []), ...(checkInRes.error ? ["Check-ins"] : []), ...(attendanceRes.error ? ["Anwesenheit"] : []), ...(resultRes.error ? ["Bestzeiten"] : [])],
      });
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [teamId, today]);

  /* Teamwechsel: Werte des vorherigen Teams nie anzeigen */
  const current = data && data.key === key ? data : null;
  const swimmers = current?.swimmers ?? [];
  const todaySessions = current?.todaySessions ?? [];
  const competition = current?.competition ?? null;
  const checkedIn = current?.checkedIn ?? null;
  const bests = current?.bests ?? [];

  const todayLabel = new Date(`${today}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
  const withLogin = swimmers.filter((swimmer) => swimmer.profile_id);
  const missingCheckIn = checkedIn ? withLogin.filter((swimmer) => !checkedIn.has(swimmer.profile_id!)) : [];
  const nameOf = (id: string) => {
    const swimmer = swimmers.find((item) => item.id === id);
    return swimmer ? `${swimmer.first_name} ${swimmer.last_name ?? ""}`.trim() : "Athlet";
  };
  const countdown = competition ? daysUntilDate(localDateOf(competition.starts_at), today) : null;

  const noLogin = swimmers.filter((swimmer) => !swimmer.profile_id);
  const attendanceShown = current?.attendance ? attendanceDisplay(current.attendance.present, current.attendance.entries) : null;
  const teamName = teams.find((team) => team.id === teamId)?.name ?? "";

  const week = current?.week ?? null;
  const weekMax = week ? Math.max(...week.map((day) => day.meters), 1) : 1;
  const weekTotal = week ? week.reduce((sum, day) => sum + day.meters, 0) : 0;
  const km = (meters: number) => (meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 });

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-3 sm:space-y-4">
      {/* Orientierung: Heute, Datum, Team */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight text-app-heading sm:text-[32px]">Dashboard</h1>
        {teams.length > 0 && teamId && <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} />}
        <p className="label-caps w-full text-app-muted sm:ml-auto sm:w-auto">{todayLabel}</p>
      </div>

      {teamHint && (
        <p role="status" className="rounded-2xl border border-app-warn/40 bg-app-warn/10 px-4 py-3 text-sm text-app-text">
          {teamHint}
        </p>
      )}

      {current && current.failed.length > 0 && (
        <p role="alert" className="rounded-2xl border border-app-bad/40 bg-app-bad/10 px-4 py-3 text-sm text-app-text">
          Nicht geladen: {current.failed.join(", ")}. Diese Werte fehlen unten – bitte neu laden.
        </p>
      )}

      {/* Heute: Einheiten mit direkter Anwesenheit */}
      <section aria-label="Training heute" className="space-y-2">
        {!current ? (
          <div className="h-16 animate-pulse rounded-[28px] bg-app-elevated" aria-label="Wird geladen" />
        ) : todaySessions.length === 0 ? (
          <div className={`${cardClass} flex min-h-16 flex-wrap items-center gap-3 rounded-[28px] px-3 py-2`}>
            <IconTile icon="training" tone="neutral" />
            <span className="flex-1 text-[15px] text-app-text">Heute kein Training geplant</span>
            <Link href={`/coach/training/new?day=${today}`} className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-app-accent-soft hover:bg-app-accent/10">
              Einheit planen
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {todaySessions.map((session) => (
              <li key={session.id} className={`${cardClass} flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[28px] px-3 py-2.5 sm:pl-5`}>
                <Link href={`/coach/training/session/${session.id}`} className="flex min-w-0 flex-1 basis-56 flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-app-good ring-4 ring-app-good/20" />
                    <span className="label-caps hidden text-app-accent-soft sm:inline">Heute</span>
                    <span className="num text-[17px] font-bold text-app-heading">{session.start_time?.slice(0, 5) ?? "–"}</span>
                  </span>
                  <span className="min-w-0 truncate text-[17px] font-bold text-app-heading">{session.title}</span>
                  <span className="num text-[13px] text-app-muted">
                    {session.training_type === "land" ? "Land" : session.total_meters ? `${km(session.total_meters)} km` : "Wasser"}
                  </span>
                </Link>
                <div className="flex items-center gap-2">
                  <Link href={`/coach/training/session/${session.id}#serienzeiten`} aria-label={`Serienzeiten ${session.title}`} title="Serienzeiten" className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-app-elevated text-app-text hover:text-app-accent-soft">
                    <Icon name="stopwatch" className="h-5 w-5" />
                  </Link>
                  <Link
                    href={`/coach/training/session/${session.id}#anwesenheit`}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-app-accent px-4 text-sm font-bold text-app-accent-ink shadow-app hover:brightness-110"
                  >
                    <Icon name="check" className="h-4 w-4" /> Anwesenheit
                  </Link>
                  <Link href={`/coach/training/session/${session.id}`} aria-label={`${session.title} öffnen`} className="hidden h-11 w-11 items-center justify-center rounded-full text-app-muted hover:text-app-accent-soft sm:inline-flex">
                    <Icon name="chevron" className="h-5 w-5" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-12 [&>*]:min-w-0">
        {/* Aufmerksamkeit: Hinweise, Fristen, fehlende Daten */}
        <div className="lg:col-span-7">
          <Section
            title="Team heute"
            id="aufmerksamkeit"
            meta={
              <Link href="/coach/athleten-check" className="num inline-flex min-h-11 items-center gap-1 text-[13px] text-app-muted hover:text-app-accent-soft">
                {current && checkedIn === null && <span className="font-semibold text-app-bad">Check-ins nicht geladen</span>}
                {checkedIn !== null && (
                  <>
                    <span className="font-bold text-app-heading">
                      {checkedIn.size}/{withLogin.length}
                    </span>{" "}
                    Check-ins
                  </>
                )}
                <span aria-hidden="true">↗</span>
                <span className="sr-only">Athleten-Check öffnen</span>
              </Link>
            }
          >
            {teamId && <RedFlagsPanel teamId={teamId} variant="summary" extra={<DeadlinesCard teamId={teamId} embedded />} />}
          </Section>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:col-span-5">
          {competition && countdown !== null && (
            <Link href="/coach/competitions" className="bg-highlight block rounded-[20px] p-4 text-white shadow-app">
              <span className="label-caps block text-white/80">Nächster Wettkampf</span>
              <span className="mt-1 flex items-end justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-lg font-extrabold">{competition.title}</span>
                  <span className="block truncate text-[13px] text-white/85">
                    {formatEntryWhen(competition)}
                    {competition.location ? ` · ${competition.location}` : ""}
                  </span>
                </span>
                <span className="num shrink-0 text-right">
                  <span className="block text-[44px] font-extrabold leading-none">{countdown}</span>
                  <span className="label-caps text-white/85">{countdown === 1 ? "Tag" : "Tage"}</span>
                </span>
              </span>
            </Link>
          )}

          {/* Kennzahlen: Check-ins und Anwesenheit */}
          <div>
            <Link href="/coach/anwesenheit" className={`${cardClass} block p-4 hover:border-app-accent/40`}>
              <span className="label-caps block text-app-muted">Anwesenheit · letzte 4 Wochen</span>
              {!current ? (
                <span className="mt-2 block h-7 w-16 animate-pulse rounded bg-app-elevated" />
              ) : !attendanceShown ? (
                <span className="mt-1 block text-sm font-semibold text-app-bad">nicht geladen</span>
              ) : (
                <>
                  <span className="num mt-1 block text-[34px] font-bold leading-tight text-app-heading">{attendanceShown.main}</span>
                  <span className="num block text-[12px] text-app-muted">
                    {current.attendance!.recordedSessions}/{current.attendance!.pastSessions} Einheiten erfasst
                  </span>
                </>
              )}
            </Link>
          </div>

          {/* Fehlende Check-ins */}
          {current && checkedIn && (missingCheckIn.length > 0 || noLogin.length > 0) && (
            <Section title="Check-in fehlt" id="checkins" meta={<span className="num text-sm font-semibold text-app-muted">{missingCheckIn.length}</span>}>
              {missingCheckIn.length > 0 && (
                <ul className="flex flex-wrap gap-1.5">
                  {missingCheckIn.slice(0, 10).map((swimmer) => (
                    <li key={swimmer.id}>
                      <Link href={`/coach/schwimmer/${swimmer.id}?tab=befinden`} className="inline-flex min-h-11 items-center rounded-full border border-app-border px-3 text-sm font-semibold text-app-heading hover:border-app-accent/50">
                        {swimmer.first_name}
                      </Link>
                    </li>
                  ))}
                  {missingCheckIn.length > 10 && <li className="inline-flex min-h-11 items-center px-2 text-sm text-app-muted">+{missingCheckIn.length - 10}</li>}
                </ul>
              )}
              {noLogin.length > 0 && (
                <Details summary={`${noLogin.length} ohne eigenen Login`}>
                  <p>Können nicht einchecken. Login im Profil unter Stammdaten verknüpfen:</p>
                  <p className="mt-1">
                    {noLogin.map((swimmer, index) => (
                      <span key={swimmer.id}>
                        {index > 0 && ", "}
                        <Link href={`/coach/schwimmer/${swimmer.id}?tab=infos`} className="font-semibold text-app-heading underline decoration-app-border underline-offset-2">
                          {swimmer.first_name}
                        </Link>
                      </span>
                    ))}
                  </p>
                </Details>
              )}
            </Section>
          )}
        </div>

        <div className="space-y-3 sm:space-y-4 lg:col-span-7">
          <Section title="Neue Bestzeiten" id="bestzeiten" meta={<span className="text-[13px] text-app-muted">7 Tage</span>}>
            {current?.failed.includes("Bestzeiten") ? (
              <p className="text-sm text-app-bad">Bestzeiten nicht geladen.</p>
            ) : bests.length === 0 ? (
              <p className="text-sm text-app-muted">Keine neuen Bestzeiten.</p>
            ) : (
              <ul className="space-y-2">
                {bests.map(({ result, previous }) => (
                  <li key={result.id}>
                    <ListRow
                      icon="trophy"
                      tone="pink"
                      href={`/coach/schwimmer/${result.swimmer_id}?tab=bestzeiten`}
                      title={nameOf(result.swimmer_id)}
                      subtitle={formatEvent(result)}
                      trailing={
                        <span className="num">
                          <span className="block text-[15px] font-bold text-app-heading">{formatTime(result.time_ms)}</span>
                          <span className="text-app-good">−{((previous - result.time_ms) / 1000).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s</span>
                        </span>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:col-span-5">
          {/* Geplanter Umfang dieser Woche – nur echte Planwerte */}
          {week && weekTotal > 0 && (
            <Section title="Umfang diese Woche" id="umfang" meta={<span className="num text-[28px] font-bold leading-none text-app-heading">{km(weekTotal)}<span className="text-sm font-semibold text-app-muted"> km</span></span>}>
              <div className="flex h-28 items-end gap-2" role="img" aria-label={`Geplanter Umfang: ${week.map((day) => `${new Date(`${day.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "short" })} ${km(day.meters)} km`).join(", ")}`}>
                {week.map((day) => (
                  <div key={day.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className={`w-full rounded-md ${day.date === today ? "bg-highlight" : day.meters ? "bg-app-accent/40" : "bg-app-elevated"}`}
                      style={{ height: `${Math.max(4, (day.meters / weekMax) * 100)}%` }}
                    />
                    <span className={`text-[11px] ${day.date === today ? "font-bold text-app-heading" : "text-app-muted"}`}>
                      {new Date(`${day.date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "narrow" })}
                    </span>
                  </div>
                ))}
              </div>
              <Link href="/coach/training" className="mt-1 inline-flex min-h-11 items-center text-[13px] font-semibold text-app-accent-soft hover:underline">
                Trainingswoche →
              </Link>
            </Section>
          )}
          <TodoCard teamId={teamId} compact />
          <Link href="/coach/bericht" className="flex min-h-11 items-center gap-2 px-1 text-[13px] font-semibold text-app-accent-soft hover:underline">
            <Icon name="news" className="h-4 w-4" /> Wochenbericht{teamName ? ` ${teamName}` : ""} →
          </Link>
        </div>
      </div>
    </div>
  );
}
