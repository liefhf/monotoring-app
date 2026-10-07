"use client";

import Loader from "@/components/Loader";
import { newPersonalBests } from "@/lib/weeklyReport";
import { Goal, goalLabel, goalProgress, sortGoals } from "@/lib/goals";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { localDateOf, CalendarEntry, toDateKey } from "@/lib/community";
import {
  QualifyingStandard,
  QualifyingTime,
  SwimEvent,
  Swimmer,
  SwimmerResult,
  findBestForStandard,
  findBestResult,
  findQualifyingTime,
  formatDate,
  formatEventShort,
  formatTime,
  splitResults,
} from "@/lib/swim";
import { focusFromRow, competitionPriority, loadUpcomingCompetitions } from "@/lib/nextCompetition";
import { AthleteFocus, parseFocusKey } from "@/lib/trainingFocus";
import { forecastEvent, reachChance } from "@/lib/forecast";
import { LactateTest, analyzeLactateTest, formatPace } from "@/lib/lactate";
import { RoleBadge } from "@/components/FocusBadge";
import { Card, Notice, inputClass } from "@/components/ui";

/*
 * "Mein Fortschritt" fuer Athleten: eigene Bestzeiten (25/50 m), Abstand zur
 * Pflichtzeit, Prognose zum naechsten Hoehepunkt und die eigenen Tempo-Zonen
 * aus dem letzten Laktattest. Daten kommen ueber die my_*-Funktionen
 * (supabase/mein_fortschritt.sql) - jeder sieht nur seine eigenen.
 */

export default function MeinFortschrittPage() {
  const [swimmer, setSwimmer] = useState<(Swimmer & { focus: AthleteFocus }) | null>(null);
  const [results, setResults] = useState<SwimmerResult[]>([]);
  const [standards, setStandards] = useState<QualifyingStandard[]>([]);
  const [times, setTimes] = useState<QualifyingTime[]>([]);
  const [lactate, setLactate] = useState<LactateTest[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEntry[]>([]);
  const [standardId, setStandardId] = useState("");
  const [state, setState] = useState<"loading" | "ok" | "missing" | "unlinked">("loading");
  const [today] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    async function load() {
      const me = await supabase.rpc("my_swimmer");
      if (me.error) {
        setState("missing");
        return;
      }
      if (!me.data) {
        setState("unlinked");
        return;
      }
      const row = me.data as Record<string, unknown>;
      setSwimmer({ ...(row as unknown as Swimmer), focus: focusFromRow(row) });
      const [resultRes, standardRes, timeRes, lactateRes, upcomingList] = await Promise.all([
        supabase.rpc("my_results"),
        supabase.rpc("my_qualifying_standards"),
        supabase.rpc("my_qualifying_times"),
        supabase.rpc("my_lactate_tests"),
        loadUpcomingCompetitions(),
      ]);
      setResults(splitResults((resultRes.data ?? []) as Record<string, unknown>[]).pool);
      const loadedStandards = (standardRes.data ?? []) as QualifyingStandard[];
      setStandards(loadedStandards);
      setStandardId(loadedStandards[0]?.id ?? "");
      setTimes((timeRes.data ?? []) as QualifyingTime[]);
      setLactate(((lactateRes.error ? [] : lactateRes.data) ?? []) as LactateTest[]);
      setUpcoming(upcomingList);
      setState("ok");
    }
    load();
  }, []);

  const standard = standards.find((item) => item.id === standardId) ?? null;
  const standardTimes = times.filter((time) => time.standard_id === standardId);
  const target = upcoming.find((entry) => competitionPriority(entry) === "A") ?? upcoming[0] ?? null;

  const events: { event: SwimEvent; role: "haupt" | "neben" | null }[] = useMemo(() => {
    if (swimmer?.focus.events?.length) return swimmer.focus.events.map(parseFocusKey);
    const map = new Map<string, SwimEvent>();
    for (const result of results) map.set(`${result.distance}-${result.stroke}`, { distance: result.distance, stroke: result.stroke });
    return [...map.values()].map((event) => ({ event, role: null }));
  }, [swimmer, results]);

  const latestLactate = [...lactate].filter((test) => test.stroke === "freestyle").sort((a, b) => b.test_date.localeCompare(a.test_date))[0] ?? null;
  const zones = latestLactate ? analyzeLactateTest(latestLactate).zones : [];

  if (state === "loading") return <main className="mx-auto max-w-2xl px-4 py-6 text-sm text-app-muted"><Loader /></main>;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <h1 className="text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">Mein Fortschritt</h1>
      {state === "ok" && <ProgressHighlights results={results} />}

      {state === "missing" && <Notice tone="warn">Diese Seite ist bald verfügbar – dein Trainer muss noch ein Update einspielen.</Notice>}
      {state === "unlinked" && <Notice tone="info">Dein Login ist noch nicht mit deinem Athleten-Profil verknüpft. Sag deinem Trainer Bescheid.</Notice>}

      {state === "ok" && swimmer && (
        <>
          <Card
            title="Meine Strecken"
            description={swimmer.focus.events?.length ? "Deine Fokus-Strecken (H = Haupt, N = Neben)" : "Alle Strecken, die du geschwommen bist"}
            action={
              standards.length > 0 && (
                <select value={standardId} onChange={(e) => setStandardId(e.target.value)} className={`${inputClass} w-auto py-1.5 text-xs`}>
                  {standards.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              )
            }
          >
            <ul className="divide-y divide-app-border">
              {events.map(({ event, role }) => {
                const best25 = findBestResult(results, event, 25);
                const best50 = findBestResult(results, event, 50);
                const required = standard ? findQualifyingTime(standardTimes, swimmer, event) : null;
                const counting = standard && required ? findBestForStandard(results, event, standard) : null;
                const gap = required && counting ? counting.time_ms - required.time_ms : null;
                const forecast = target && required ? forecastEvent(results, event, 25, today, localDateOf(target.starts_at)) : null;
                const chance = forecast && required ? reachChance(forecast, required.time_ms) : null;
                const progress = required && counting ? Math.max(0, Math.min(100, (required.time_ms / counting.time_ms) * 100)) : null;
                if (!best25 && !best50) return null;
                return (
                  <li key={`${event.distance}-${event.stroke}`} className="space-y-1.5 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-lg font-bold">
                        {formatEventShort(event)}
                        <RoleBadge role={role} />
                      </span>
                      {gap !== null &&
                        (gap <= 0 ? (
                          <span className="rounded-full bg-app-good/10 px-2.5 py-0.5 text-sm font-bold text-app-good">✓ Pflichtzeit geschafft</span>
                        ) : (
                          <span className="text-sm font-bold text-app-heading">noch {formatTime(gap)}</span>
                        ))}
                    </div>
                    <p className="text-sm text-app-muted">
                      {best25 && (
                        <>
                          25 m: <b className="text-app-text">{formatTime(best25.time_ms)}</b> ({formatDate(best25.result_date).slice(3)})
                        </>
                      )}
                      {best25 && best50 && " · "}
                      {best50 && (
                        <>
                          50 m: <b className="text-app-text">{formatTime(best50.time_ms)}</b> ({formatDate(best50.result_date).slice(3)})
                        </>
                      )}
                      {required && ` · Pflichtzeit ${formatTime(required.time_ms)}`}
                    </p>
                    {progress !== null && gap !== null && gap > 0 && (
                      <div className="h-2 overflow-hidden rounded-full bg-app-elevated">
                        <div className="h-full rounded-full bg-app-accent" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                    {forecast && chance !== null && gap !== null && gap > 0 && (
                      <p className="text-xs text-app-muted">
                        Prognose {target?.title}: {formatTime(forecast.predictedMs)} · Chance auf die Pflichtzeit {chance} %
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Nur zeigen, wenn es Zonen gibt - ein Hinweis auf fehlende Tests hilft Kindern nicht */}
          {zones.length > 0 && (
          <Card
            title="Meine Tempo-Zonen"
            description={latestLactate ? `Aus deinem Test vom ${formatDate(latestLactate.test_date)} – Tempo je 100 m Kraul` : undefined}
          >
            {(
              <ul className="divide-y divide-app-border">
                {zones.map((zone) => (
                  <li key={zone.code} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span>
                      <b>{zone.code}</b> <span className="text-sm text-app-muted">{zone.label}</span>
                    </span>
                    <span className="font-mono text-base font-bold tabular-nums">
                      {zone.fromPace && zone.toPace
                        ? `${formatPace(zone.fromPace)}–${formatPace(zone.toPace)}`
                        : zone.toPace
                          ? `> ${formatPace(zone.toPace)}`
                          : `< ${formatPace(zone.fromPace!)}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          )}
        </>
      )}
    </main>
  );
}

/*
 * Oben auf der Seite, fuer Kinder verstaendlich: neue Bestzeiten der
 * letzten 3 Monate ("1,2 Sekunden schneller") und die eigenen Ziele.
 */
function ProgressHighlights({ results }: { results: SwimmerResult[] }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [today] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    supabase
      .from("athlete_goals")
      .select("*")
      .then(({ data, error }) => {
        if (!error) setGoals((data ?? []) as Goal[]);
      });
  }, []);

  const since = new Date(Date.parse(today) - 90 * 86_400_000).toISOString().slice(0, 10);
  const bests = newPersonalBests(results, since, today).slice(0, 5);
  const sortedGoals = sortGoals(goals, results);

  if (!bests.length && !sortedGoals.length) return null;

  return (
    <div className="space-y-4">
      {bests.length > 0 && (
        <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-5 shadow-app">
          <h2 className="text-lg font-bold text-app-heading">Neue Bestzeiten 🎉</h2>
          <ul className="mt-2 divide-y divide-app-border/60">
            {bests.map(({ result, previous }) => (
              <li key={result.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-app-heading">
                    {formatEventShort(result)} · {result.pool_length}-m-Bahn
                  </span>
                  <span className="block text-sm text-app-good">
                    {((previous - result.time_ms) / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Sekunden schneller
                  </span>
                </span>
                <span className="num text-lg font-semibold text-app-heading">{formatTime(result.time_ms)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {sortedGoals.length > 0 && (
        <section className="rounded-[20px] border border-app-border/60 bg-app-surface p-5 shadow-app">
          <h2 className="text-lg font-bold text-app-heading">Meine Ziele 🎯</h2>
          <ul className="mt-2 divide-y divide-app-border/60">
            {sortedGoals.map((goal) => {
              const progress = goalProgress(goal, results);
              return (
                <li key={goal.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-app-heading">{goalLabel(goal)}</span>
                    <span className="block text-sm text-app-muted">
                      {progress.reached
                        ? "Geschafft! 🎉"
                        : goal.target_ms && progress.remainingMs !== null
                          ? `Noch ${(progress.remainingMs / 1000).toLocaleString("de-DE", { maximumFractionDigits: 2 })} Sekunden`
                          : "Bleib dran!"}
                    </span>
                  </span>
                  {goal.target_ms && <span className="num text-lg font-semibold text-app-heading">{formatTime(goal.target_ms)}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
