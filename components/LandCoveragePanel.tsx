"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CORE_GOALS,
  MIN_LAND_SESSIONS_PER_WEEK,
  formatDayMonth,
  startOfWeek,
  toDateString,
} from "@/lib/kapitel1";

/*
 * Kapitel 1.2 - Kraeftigungs-Check
 *   Landtraining mindestens zweimal pro Woche? Je Team,
 *   die letzten Wochen plus die laufende.
 *
 * Kapitel 1.4 - Kernziel-Abdeckung
 *   Welche Kernziele (Land & Praevention) wurden im Monat
 *   wie oft eingeplant? Luecken werden markiert.
 */

type Team = { id: string; name: string };

type Session = {
  id: string;
  team_id: string;
  session_date: string;
  training_type: "water" | "land";
  core_goals: string[] | null;
};

const WEEKS_BACK = 5;

function weekStarts() {
  const current = startOfWeek(new Date());

  return Array.from(
    { length: WEEKS_BACK + 1 },
    (_, index) => {
      const d = new Date(current);
      d.setDate(d.getDate() - (WEEKS_BACK - index) * 7);
      return toDateString(d);
    }
  );
}

function addDays(dateString: string, days: number) {
  const d = new Date(`${dateString}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

function monthBounds(offset: number) {
  const now = new Date();
  const first = new Date(
    now.getFullYear(),
    now.getMonth() + offset,
    1,
    12
  );
  const last = new Date(
    now.getFullYear(),
    now.getMonth() + offset + 1,
    0,
    12
  );

  return {
    from: toDateString(first),
    to: toDateString(last),
    label: first.toLocaleDateString("de-DE", {
      month: "long",
      year: "numeric",
    }),
  };
}

export default function LandCoveragePanel() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [monthOffset, setMonthOffset] = useState(0);

  const weeks = useMemo(() => weekStarts(), []);
  const month = useMemo(
    () => monthBounds(monthOffset),
    [monthOffset]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: teamData } = await supabase
        .from("teams")
        .select("id, name")
        .eq("coach_id", user.id)
        .order("name");

      const loadedTeams = (teamData ?? []) as Team[];

      if (loadedTeams.length === 0) {
        if (!cancelled) {
          setTeams([]);
          setSessions([]);
          setLoading(false);
        }
        return;
      }

      const from = [weeks[0], month.from].sort()[0];
      const to = [addDays(weeks[weeks.length - 1], 6), month.to]
        .sort()
        .reverse()[0];

      const { data, error } = await supabase
        .from("training_sessions")
        .select(
          "id, team_id, session_date, training_type, core_goals"
        )
        .eq("coach_id", user.id)
        .in(
          "team_id",
          loadedTeams.map((t) => t.id)
        )
        .gte("session_date", from)
        .lte("session_date", to);

      if (cancelled) return;

      if (error) {
        setMessage(
          "Einheiten konnten nicht geladen werden. Wurde das SQL-Skript für Kapitel 1 schon ausgeführt?"
        );
      }

      setTeams(loadedTeams);
      setSessions((data ?? []) as Session[]);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [weeks, month.from, month.to]);

  function landCount(teamId: string, weekStart: string) {
    const weekEnd = addDays(weekStart, 6);

    return sessions.filter(
      (s) =>
        s.team_id === teamId &&
        s.training_type === "land" &&
        s.session_date >= weekStart &&
        s.session_date <= weekEnd
    ).length;
  }

  function goalCount(teamId: string, goal: string) {
    return sessions.filter(
      (s) =>
        s.team_id === teamId &&
        s.session_date >= month.from &&
        s.session_date <= month.to &&
        (s.core_goals ?? []).includes(goal)
    ).length;
  }

  const currentWeek = weeks[weeks.length - 1];

  return (
    <section className="mt-5 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
      <div className="border-b border-app-border px-4 py-3 sm:px-5">
        <h2 className="font-semibold text-app-heading">
          Kräftigung & Kernziele
        </h2>
        <p className="text-xs text-app-faint">
          Landtraining ≥ {MIN_LAND_SESSIONS_PER_WEEK}× pro
          Woche und Abdeckung der Kernziele Land &
          Prävention.
        </p>
      </div>

      {loading ? (
        <p className="px-4 py-4 text-sm text-app-muted sm:px-5">
          Wird geladen...
        </p>
      ) : message ? (
        <p className="px-4 py-4 text-sm text-app-bad sm:px-5">
          {message}
        </p>
      ) : teams.length === 0 ? (
        <p className="px-4 py-4 text-sm text-app-faint sm:px-5">
          Noch keine Teams.
        </p>
      ) : (
        <>
          {/* 1.2 Kraeftigungs-Check */}
          <div className="overflow-x-auto border-b border-app-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-[11px] text-app-faint">
                  <th className="px-4 py-2 text-left font-medium sm:px-5">
                    Landeinheiten / Woche
                  </th>
                  {weeks.map((w) => (
                    <th
                      key={w}
                      className="px-1 py-2 text-center font-medium"
                    >
                      {w === currentWeek
                        ? "diese"
                        : formatDayMonth(w)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr
                    key={team.id}
                    className="border-t border-app-border"
                  >
                    <td className="px-4 py-2 text-app-text sm:px-5">
                      {team.name}
                    </td>
                    {weeks.map((w) => {
                      const count = landCount(team.id, w);
                      const ok =
                        count >= MIN_LAND_SESSIONS_PER_WEEK;

                      return (
                        <td
                          key={w}
                          className="px-1 py-1.5 text-center"
                        >
                          <span
                            className={`inline-flex h-7 w-9 items-center justify-center rounded-md border text-xs font-semibold ${
                              ok
                                ? "border-app-good/40 bg-app-good/10 text-app-good"
                                : count === 1
                                ? "border-app-warn/40 bg-app-warn/10 text-app-warn"
                                : "border-app-bad/40 bg-app-bad/10 text-app-bad"
                            }`}
                            title={
                              ok
                                ? "Ziel erreicht"
                                : `${
                                    MIN_LAND_SESSIONS_PER_WEEK -
                                    count
                                  } fehlt`
                            }
                          >
                            {count}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 1.4 Kernziel-Abdeckung */}
          <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
            <p className="text-xs font-medium text-app-muted">
              Kernziele im {month.label}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setMonthOffset((m) => m - 1)}
                aria-label="Vormonat"
                className="rounded-md border border-app-border px-2 py-0.5 text-xs hover:bg-app-elevated"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setMonthOffset((m) => m + 1)}
                aria-label="Folgemonat"
                className="rounded-md border border-app-border px-2 py-0.5 text-xs hover:bg-app-elevated"
              >
                →
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-[11px] text-app-faint">
                  <th className="px-4 py-2 text-left font-medium sm:px-5">
                    Team
                  </th>
                  {CORE_GOALS.map((goal) => (
                    <th
                      key={goal.key}
                      title={goal.hint}
                      className="px-1 py-2 text-center font-medium"
                    >
                      {goal.label}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-right font-medium sm:px-5">
                    abgedeckt
                  </th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const counts = CORE_GOALS.map((goal) =>
                    goalCount(team.id, goal.key)
                  );
                  const covered = counts.filter(
                    (c) => c > 0
                  ).length;

                  return (
                    <tr
                      key={team.id}
                      className="border-t border-app-border"
                    >
                      <td className="px-4 py-2 text-app-text sm:px-5">
                        {team.name}
                      </td>
                      {counts.map((count, index) => (
                        <td
                          key={CORE_GOALS[index].key}
                          className="px-1 py-1.5 text-center"
                        >
                          <span
                            className={`inline-flex h-7 w-9 items-center justify-center rounded-md border text-xs ${
                              count > 0
                                ? "border-app-good/40 bg-app-good/10 font-semibold text-app-good"
                                : "border-app-border text-app-faint"
                            }`}
                          >
                            {count > 0 ? count : "–"}
                          </span>
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right text-xs text-app-muted sm:px-5">
                        {covered} / {CORE_GOALS.length}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="border-t border-app-border px-4 py-2 text-[11px] text-app-faint sm:px-5">
            Kernziele werden im Trainingseditor pro Einheit
            gesetzt. „–“ = im Monat nicht eingeplant.
          </p>
        </>
      )}
    </section>
  );
}
