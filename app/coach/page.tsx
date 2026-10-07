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

/* Ruhiger Bereich: Linie statt Schatten, moderate Rundung */
function Section({ title, meta, children, id }: { title: string; meta?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-app-border bg-app-surface px-4 py-3.5 sm:px-5 sm:py-4">
      <div className="mb-1.5 flex items-baseline gap-3">
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
      const [swimmerRes, sessionRes, pastRes, upcoming] = await Promise.all([
        memberIds.length ? supabase.from("swimmers").select("id, first_name, last_name, profile_id").in("id", memberIds) : Promise.resolve({ data: [], error: null }),
        supabase.from("training_sessions").select("id, title, session_date, start_time, total_meters, training_type").eq("team_id", teamId!).eq("session_date", today).order("start_time"),
        /* Anwesenheit: Einheiten der letzten 4 Wochen bis heute; gezaehlt werden nur erfasste Eintraege */
        supabase.from("training_sessions").select("id").eq("team_id", teamId!).gte("session_date", addDays(today, -27)).lte("session_date", today),
        loadUpcomingCompetitions(),
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
        failed: [...failed, ...(checkInRes.error ? ["Check-ins"] : []), ...(attendanceRes.error ? ["Anwesenheit"] : []), ...(resultRes.error ? ["Bestzeiten"] : [])],
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

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-3 sm:space-y-4">
      {/* Orientierung: Heute, Datum, Team */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h1 className="text-xl font-extrabold tracking-tight text-app-heading sm:text-2xl">
          Heute <span className="font-semibold text-app-muted">· {todayLabel}</span>
        </h1>
        {teams.length > 0 && teamId && <TeamSwitcher teams={teams} teamId={teamId} onChange={chooseTeam} />}
      </div>

      {teamHint && (
        <p role="status" className="rounded-xl border border-app-warn/40 bg-app-warn/10 px-4 py-3 text-sm text-app-text">
          {teamHint}
        </p>
      )}

      {current && current.failed.length > 0 && (
        <p role="alert" className="rounded-xl border border-app-bad/40 bg-app-bad/10 px-4 py-3 text-sm text-app-text">
          Nicht alles konnte geladen werden ({current.failed.join(", ")}). Betroffene Zahlen fehlen unten bewusst – bitte Seite neu laden.
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-12 [&>*]:min-w-0">
        {/* 1. Aufmerksamkeit: Hinweise und Dokument-Fristen */}
        <div className="lg:col-span-7">
          <Section title="Aufmerksamkeit" id="aufmerksamkeit" meta={<Link href="/coach/athleten-check" className="text-[13px] font-semibold text-app-accent-soft hover:underline">Athleten-Check →</Link>}>
            {teamId && <RedFlagsPanel teamId={teamId} variant="summary" extra={<DeadlinesCard teamId={teamId} embedded />} />}
          </Section>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:col-span-5">
          {/* 2. Heutiges Training mit direkter Anwesenheit */}
          <Section title="Training heute" id="training-heute" meta={<Link href="/coach/training" className="text-[13px] font-semibold text-app-accent-soft hover:underline">Woche →</Link>}>
            {!current ? (
              <div className="h-12 animate-pulse rounded-xl bg-app-elevated" aria-label="Wird geladen" />
            ) : todaySessions.length === 0 ? (
              <p className="text-sm text-app-text">
                Kein Training geplant.{" "}
                <Link href={`/coach/training/new?day=${today}`} className="inline-flex min-h-11 items-center font-semibold text-app-accent-soft underline-offset-2 hover:underline">
                  Einheit planen
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-app-border/70">
                {todaySessions.map((session) => (
                  <li key={session.id} className="flex items-center gap-3 py-2">
                    <Link href={`/coach/training/session/${session.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-bold text-app-heading">
                        <span className="num font-semibold text-app-muted">{session.start_time?.slice(0, 5) ?? "–"}</span> {session.title}
                      </span>
                      <span className="block text-[13px] text-app-text">
                        {session.training_type === "land" ? "Land" : session.total_meters ? `${(session.total_meters / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} km` : "Wasser"}
                      </span>
                    </Link>
                    <Link
                      href={`/coach/training/session/${session.id}#anwesenheit`}
                      className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-app-accent px-3.5 text-sm font-bold text-app-accent-ink hover:brightness-110"
                    >
                      <Icon name="check" className="h-4 w-4" /> Anwesenheit
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 3. Check-ins */}
          <Section title="Check-ins heute" id="checkins" meta={<span className="num text-sm font-semibold text-app-heading">{checkedIn === null ? "–" : `${checkedIn.size} von ${withLogin.length}`}</span>}>
            {!current ? (
              <div className="h-8 animate-pulse rounded-xl bg-app-elevated" aria-label="Wird geladen" />
            ) : checkedIn === null ? (
              <p className="text-sm text-app-bad">Check-ins konnten nicht geladen werden.</p>
            ) : (
              <div className="space-y-1.5 text-sm text-app-text">
                {missingCheckIn.length === 0 ? (
                  <p>{withLogin.length ? "Alle mit Login haben eingecheckt." : "Noch niemand im Team hat einen eigenen Login."}</p>
                ) : (
                  <p>
                    Fehlt noch:{" "}
                    {missingCheckIn.slice(0, 8).map((swimmer, index) => (
                      <span key={swimmer.id}>
                        {index > 0 && ", "}
                        <Link href={`/coach/schwimmer/${swimmer.id}?tab=befinden`} className="font-semibold text-app-heading underline decoration-app-border underline-offset-2 hover:text-app-accent-soft">
                          {swimmer.first_name}
                        </Link>
                      </span>
                    ))}
                    {missingCheckIn.length > 8 ? ` und ${missingCheckIn.length - 8} weitere` : ""}
                  </p>
                )}
                {noLogin.length > 0 && (
                  <p className="text-[13px]">
                    Ohne eigenen Login (können nicht einchecken):{" "}
                    {noLogin.slice(0, 5).map((swimmer, index) => (
                      <span key={swimmer.id}>
                        {index > 0 && ", "}
                        <Link href={`/coach/schwimmer/${swimmer.id}?tab=infos`} className="font-semibold text-app-heading underline decoration-app-border underline-offset-2 hover:text-app-accent-soft">
                          {swimmer.first_name}
                        </Link>
                      </span>
                    ))}
                    {noLogin.length > 5 ? ` und ${noLogin.length - 5} weitere` : ""} – Login im Profil unter Stammdaten verknüpfen.
                  </p>
                )}
              </div>
            )}
          </Section>

          {competition && countdown !== null && (
            <Link href="/coach/competitions" className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface px-4 py-3">
              <Icon name="trophy" className="h-5 w-5 shrink-0 text-app-soon" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-app-heading">{competition.title}</span>
                <span className="block truncate text-[13px] text-app-text">
                  {formatEntryWhen(competition)}
                  {competition.location ? ` · ${competition.location}` : ""}
                </span>
              </span>
              <span className="num shrink-0 text-sm font-bold text-app-heading">{countdown === 0 ? "heute" : `in ${countdown} ${countdown === 1 ? "Tag" : "Tagen"}`}</span>
            </Link>
          )}
        </div>

        {/* 4. Entwicklung und weitere Informationen */}
        <div className="space-y-3 sm:space-y-4 lg:col-span-7">
          <Section title="Neue Bestzeiten" id="bestzeiten" meta={<span className="text-[13px] text-app-muted">letzte 7 Tage</span>}>
            {current?.failed.includes("Bestzeiten") ? (
              <p className="text-sm text-app-bad">Bestzeiten konnten nicht geladen werden.</p>
            ) : bests.length === 0 ? (
              <p className="text-sm text-app-text">Keine neuen Bestzeiten.</p>
            ) : (
              <ul className="divide-y divide-app-border/70">
                {bests.map(({ result, previous }) => (
                  <li key={result.id}>
                    <Link href={`/coach/schwimmer/${result.swimmer_id}?tab=bestzeiten`} className="block py-2 text-sm hover:text-app-accent-soft">
                      <span className="font-semibold text-app-heading">{nameOf(result.swimmer_id)}</span>
                      <span className="text-app-text">
                        {" "}· {formatEvent(result)} · <span className="num font-semibold text-app-heading">{formatTime(result.time_ms)}</span> ·{" "}
                        <span className="text-app-good">{((previous - result.time_ms) / 1000).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s schneller</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:col-span-5">
          <Section title="Anwesenheit" id="anwesenheit" meta={<Link href="/coach/anwesenheit" className="text-[13px] font-semibold text-app-accent-soft hover:underline">Übersicht →</Link>}>
            {!current ? null : !attendanceShown ? (
              <p className="text-sm text-app-bad">Anwesenheit konnte nicht geladen werden.</p>
            ) : (
              <p className="text-sm text-app-text">
                <span className="num text-base font-bold text-app-heading">{attendanceShown.main}</span> {attendanceShown.sub}
                <span className="block text-[13px] text-app-muted">
                  Letzte 4 Wochen bis heute · {current.attendance!.recordedSessions} von {current.attendance!.pastSessions} Einheiten erfasst · nicht erfasste zählen nicht mit
                </span>
              </p>
            )}
            <p className="mt-1 text-[13px]">
              <Link href="/coach/bericht" className="inline-flex min-h-11 items-center font-semibold text-app-accent-soft hover:underline">
                Wochenbericht{teamName ? ` ${teamName}` : ""} →
              </Link>
            </p>
          </Section>
          <TodoCard teamId={teamId} compact />
        </div>
      </div>
    </div>
  );
}
