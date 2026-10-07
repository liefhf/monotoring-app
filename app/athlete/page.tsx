"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CalendarEntry, CALENDAR_COLUMNS, toDateKey } from "@/lib/community";
import { SwimmerResult, formatEventShort, formatTime, splitResults } from "@/lib/swim";
import { newPersonalBests } from "@/lib/weeklyReport";
import { feedbackDue, newsLabel, sessionPhase, weekRange } from "@/lib/sessionTiming";
import { Goal, goalLabel, goalProgress, sortGoals } from "@/lib/goals";
import Loader from "@/components/Loader";

/*
 * "Heute" – Startseite fuer Athleten (auch fuer Kinder ab ca. 9 Jahren).
 * Beantwortet nur: Wie geht es mir? Was steht an? Was soll ich tun?
 * Wie habe ich mich verbessert? Grosse Karten, kurze Saetze, keine
 * Fachbegriffe und keine Diagramme. Details liegen eine Ebene tiefer.
 */

type Session = {
  id: string;
  title: string;
  session_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  training_type: string | null;
};
type News = { id: string; title: string; created_at: string; pinned: boolean | null };
type CheckIn = "done" | "open" | "unknown";

const DAY = 86_400_000;
const addDays = (date: string, days: number) => toDateKey(new Date(Date.parse(`${date}T12:00:00`) + days * DAY));
const SESSION_COLUMNS = "id, title, session_date, start_time, duration_minutes, training_type";

function dayLabel(date: string, today: string) {
  if (date === today) return "Heute";
  if (date === addDays(today, 1)) return "Morgen";
  return new Date(`${date}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "numeric" });
}

function daysUntil(iso: string, today: string) {
  return Math.round((Date.parse(`${iso.slice(0, 10)}T12:00:00`) - Date.parse(`${today}T12:00:00`)) / DAY);
}

/* Aktuelle Uhrzeit, die sich jede Minute und bei Rueckkehr in die App erneuert (Tageswechsel). */
function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = window.setInterval(tick, 60_000);
    const onVisible = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return now;
}

export default function AthleteToday() {
  const now = useNow();
  const today = toDateKey(now);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [checkIn, setCheckIn] = useState<CheckIn>("unknown");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsFailed, setSessionsFailed] = useState(false);
  const [recent, setRecent] = useState<Session[]>([]);
  const [given, setGiven] = useState<Set<string> | null>(null);
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [competition, setCompetition] = useState<CalendarEntry | null>(null);
  const [news, setNews] = useState<News | null>(null);
  const [bests, setBests] = useState<{ result: SwimmerResult; previous: number }[]>([]);
  const [goal, setGoal] = useState<{ goal: Goal; remainingMs: number | null; current: number | null } | null>(null);

  /* Laedt neu, wenn sich der Tag aendert (App ueber Mitternacht offen). */
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user || cancelled) return;
      const week = weekRange(new Date(`${today}T12:00:00`));
      const until = week.to > addDays(today, 6) ? week.to : addDays(today, 6);

      const [profileRes, checkInRes, sessionRes, recentRes, compRes, newsRes, resultRes, goalRes, meRes] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", user.id).maybeSingle(),
        supabase.from("befinden_entries").select("id").eq("athlete_id", user.id).eq("entry_date", today).maybeSingle(),
        supabase.from("training_sessions").select(SESSION_COLUMNS).gte("session_date", today).lte("session_date", until).order("session_date").order("start_time"),
        supabase.from("training_sessions").select(SESSION_COLUMNS).gte("session_date", addDays(today, -3)).lte("session_date", today).order("session_date", { ascending: false }),
        supabase.from("calendar_entries").select(CALENDAR_COLUMNS).eq("category", "wettkampf").gte("starts_at", `${today}T00:00:00`).order("starts_at").limit(1),
        supabase.from("news_posts").select("id, title, created_at, pinned").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(1),
        supabase.rpc("my_results"),
        supabase.from("athlete_goals").select("*"),
        supabase.rpc("my_swimmer"),
      ]);
      if (cancelled) return;

      setName(((profileRes.data as { first_name: string | null } | null)?.first_name ?? "").trim());
      // Ladefehler ist NICHT "offen": dann wissen wir es nicht
      setCheckIn(checkInRes.error ? "unknown" : checkInRes.data ? "done" : "open");
      setSessionsFailed(Boolean(sessionRes.error));
      setSessions((sessionRes.data ?? []) as Session[]);
      setCompetition(((compRes.data ?? []) as CalendarEntry[])[0] ?? null);
      setNews(((newsRes.data ?? []) as News[])[0] ?? null);

      const recentList = recentRes.error ? [] : ((recentRes.data ?? []) as Session[]);
      setRecent(recentList);
      if (recentList.length) {
        const ids = recentList.map((session) => session.id);
        const swimmerId = (meRes.data as { id?: string } | null)?.id;
        const [feedbackRes, attendanceRes] = await Promise.all([
          supabase.from("training_feedback").select("training_session_id").eq("athlete_id", user.id).in("training_session_id", ids),
          swimmerId
            ? supabase.from("training_attendance").select("training_session_id, status").eq("swimmer_id", swimmerId).in("training_session_id", ids)
            : Promise.resolve({ data: [], error: null }),
        ]);
        if (cancelled) return;
        // Konnte nicht geprueft werden -> lieber nicht nachfragen als doppelt
        setGiven(feedbackRes.error ? null : new Set(((feedbackRes.data ?? []) as { training_session_id: string }[]).map((row) => row.training_session_id)));
        setAbsent(
          new Set(
            ((attendanceRes.data ?? []) as { training_session_id: string; status: string }[])
              .filter((row) => row.status !== "anwesend")
              .map((row) => row.training_session_id)
          )
        );
      } else {
        setGiven(new Set());
      }

      const results = resultRes.error ? [] : splitResults((resultRes.data ?? []) as Record<string, unknown>[]).pool;
      setBests(resultRes.error ? [] : newPersonalBests(results, addDays(today, -30), today).slice(0, 2));
      setGoal(null);
      if (!goalRes.error && !resultRes.error) {
        const open = sortGoals((goalRes.data ?? []) as Goal[], results).find((item) => !goalProgress(item, results).reached);
        if (open) {
          const progress = goalProgress(open, results);
          setGoal({ goal: open, remainingMs: progress.remainingMs, current: progress.best?.time_ms ?? null });
        }
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [today]);

  if (loading) {
    return (
      <main className="px-4 py-6">
        <Loader />
      </main>
    );
  }

  const upcoming = sessions.filter((session) => sessionPhase(session, now) !== "finished");
  const next = upcoming[0];
  const nextRunning = next ? sessionPhase(next, now) === "running" : false;
  const week = weekRange(now);
  const moreThisWeek = upcoming.filter((session) => session !== next && session.session_date <= week.to).length;
  const openFeedback = given ? recent.find((session) => feedbackDue(session, now, { given, absent })) ?? null : null;
  const newsTag = news ? newsLabel(news, now) : null;

  const checkInCard =
    checkIn === "open" ? (
      <Link href="/athlete/check-in" className="bg-highlight flex min-h-24 items-center gap-4 rounded-[20px] px-5 py-4 text-white shadow-app">
        <span className="text-4xl" aria-hidden="true">🙂</span>
        <span className="flex-1">
          <span className="block text-xl font-extrabold">Wie geht es dir heute?</span>
          <span className="block text-sm text-white/90">6 kurze Fragen – dauert 30 Sekunden</span>
        </span>
        <span className="text-2xl" aria-hidden="true">→</span>
      </Link>
    ) : checkIn === "done" ? (
      <div className="flex items-center gap-3 rounded-[20px] bg-app-good/15 px-5 py-4">
        <span className="text-2xl" aria-hidden="true">✅</span>
        <p className="text-lg font-bold text-app-heading">Check-in erledigt. Danke!</p>
      </div>
    ) : (
      <Link href="/athlete/check-in" className="flex items-center gap-3 rounded-[20px] border border-app-border bg-app-surface px-5 py-4">
        <span className="text-2xl" aria-hidden="true">❔</span>
        <span className="flex-1 text-app-text">
          <span className="block font-bold text-app-heading">Check-in konnte gerade nicht geprüft werden</span>
          <span className="block text-sm text-app-muted">Hier tippen zum Ausfüllen oder Ansehen</span>
        </span>
      </Link>
    );

  const feedbackCard = openFeedback && (
    <Link href={`/athlete/feedback/${openFeedback.id}`} className="flex min-h-20 items-center gap-4 rounded-[20px] border-2 border-app-accent bg-app-surface px-5 py-4">
      <span className="text-3xl" aria-hidden="true">💪</span>
      <span className="flex-1">
        <span className="block text-lg font-bold text-app-heading">Wie anstrengend war dein Training?</span>
        <span className="block text-sm text-app-muted">
          {openFeedback.title} · {dayLabel(openFeedback.session_date, today)}
        </span>
      </span>
      <span className="text-xl text-app-accent-soft" aria-hidden="true">→</span>
    </Link>
  );

  /* Genau eine Hauptaktion oben: Check-in, sonst die offene Rueckmeldung */
  const mainIsFeedback = checkIn !== "open" && Boolean(openFeedback);

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-5">
      <h1 className="text-[28px] font-extrabold tracking-tight text-app-heading">Hallo{name ? ` ${name}` : ""}! 👋</h1>

      {mainIsFeedback ? feedbackCard : checkInCard}

      {/* Danach: heutiges oder naechstes Training */}
      <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-5 shadow-app">
        <h2 className="text-lg font-bold text-app-heading">Dein Training</h2>
        {sessionsFailed ? (
          <p className="mt-2 text-app-bad">Training konnte gerade nicht geladen werden.</p>
        ) : next ? (
          <>
            <Link href={`/athlete/training/${next.id}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-app-elevated/70 px-4 py-3">
              <span className="text-2xl" aria-hidden="true">{next.training_type === "land" ? "🏋️" : "🏊"}</span>
              <span className="flex-1">
                <span className="block font-bold text-app-heading">
                  {nextRunning ? "Läuft gerade" : dayLabel(next.session_date, today)}
                  {next.start_time && !nextRunning ? ` · ${next.start_time.slice(0, 5)} Uhr` : ""}
                </span>
                <span className="block text-sm text-app-muted">{next.title}</span>
              </span>
              <span className="text-app-faint" aria-hidden="true">→</span>
            </Link>
            {moreThisWeek > 0 && (
              <Link href="/athlete/training" className="mt-2 block text-sm font-semibold text-app-accent-soft">
                Diese Woche noch {moreThisWeek} weitere{moreThisWeek === 1 ? "s Training" : " Trainings"} →
              </Link>
            )}
          </>
        ) : (
          <p className="mt-2 text-app-muted">In den nächsten 7 Tagen ist kein Training eingetragen.</p>
        )}
      </section>

      {!mainIsFeedback && feedbackCard}

      {competition && (
        <Link href="/athlete/wettkampftag" className="flex items-center gap-4 rounded-[20px] border border-app-border/60 bg-app-surface p-5 shadow-app">
          <span className="text-3xl" aria-hidden="true">🏆</span>
          <span className="flex-1">
            <span className="block text-sm text-app-muted">Nächster Wettkampf</span>
            <span className="block font-bold text-app-heading">{competition.title}</span>
          </span>
          <span className="text-center">
            <span className="num block text-3xl font-semibold leading-none text-app-heading">{Math.max(0, daysUntil(competition.starts_at, today))}</span>
            <span className="text-xs text-app-muted">{daysUntil(competition.starts_at, today) === 1 ? "Tag" : "Tage"}</span>
          </span>
        </Link>
      )}

      {/* 4. Fortschritt: positiv, ohne Fachbegriffe */}
      {(bests.length > 0 || goal) && (
        <Link href="/athlete/fortschritt" className="block rounded-[20px] border border-app-border/60 bg-app-surface p-5 shadow-app">
          <h2 className="text-lg font-bold text-app-heading">Dein Fortschritt</h2>
          <ul className="mt-2 space-y-2">
            {bests.map(({ result, previous }) => (
              <li key={result.id} className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">🎉</span>
                <span>
                  <span className="block font-bold text-app-heading">
                    Neue Bestzeit {formatEventShort(result)}: {formatTime(result.time_ms)}
                  </span>
                  <span className="block text-sm text-app-good">
                    {((previous - result.time_ms) / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Sekunden schneller
                  </span>
                </span>
              </li>
            ))}
            {goal && (
              <li className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">🎯</span>
                <span>
                  <span className="block font-bold text-app-heading">Dein Ziel: {goalLabel(goal.goal)}</span>
                  <span className="block text-sm text-app-muted">
                    {goal.goal.target_ms
                      ? goal.remainingMs !== null
                        ? `Noch ${(goal.remainingMs / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Sekunden bis ${formatTime(goal.goal.target_ms)}`
                        : `Ziel: ${formatTime(goal.goal.target_ms)}`
                      : "Du schaffst das!"}
                  </span>
                </span>
              </li>
            )}
          </ul>
        </Link>
      )}

      {news && newsTag && (
        <Link href="/athlete/news" className="flex items-center gap-4 rounded-[20px] border border-app-border/60 bg-app-surface p-5 shadow-app">
          <span className="text-2xl" aria-hidden="true">📣</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-app-muted">{newsTag}</span>
            <span className="block truncate font-bold text-app-heading">{news.title}</span>
          </span>
          <span className="text-app-faint" aria-hidden="true">→</span>
        </Link>
      )}

      <Link href="/athlete/pain" className="block py-2 text-center text-sm font-semibold text-app-muted">
        Etwas tut weh? Hier melden →
      </Link>
    </main>
  );
}
