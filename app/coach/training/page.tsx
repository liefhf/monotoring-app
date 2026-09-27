"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

type TrainingSession = {
  id: string;
  team_id: string;
  title: string;
  session_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  training_type: "water" | "land";
  total_meters: number | null;
  focus: string | null;
};

type Team = {
  id: string;
  name: string;
};

type TeamFilter = "all" | string;
type TypeFilter = "all" | "water" | "land";

function getLocalDateString(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date) {
  const result = new Date(date);

  const day = result.getDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  result.setDate(
    result.getDate() + difference
  );

  result.setHours(0, 0, 0, 0);

  return result;
}

function getEndOfWeek(date: Date) {
  const start = getStartOfWeek(date);

  const result = new Date(start);

  result.setDate(
    result.getDate() + 6
  );

  result.setHours(
    23,
    59,
    59,
    999
  );

  return result;
}

export default function TrainingPage() {
  const [trainings, setTrainings] =
    useState<TrainingSession[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [
    selectedTeam,
    setSelectedTeam,
  ] = useState<TeamFilter>("all");

  const [
    selectedType,
    setSelectedType,
  ] = useState<TypeFilter>("all");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Coach konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    /*
      1. Eigene Teams des Coaches laden
    */
    const {
      data: teamData,
      error: teamError,
    } = await supabase
      .from("teams")
      .select("id, name")
      .eq("coach_id", user.id)
      .order("name");

    if (teamError) {
      setMessage(
        `Teams konnten nicht geladen werden: ${teamError.message}`
      );

      setLoading(false);
      return;
    }

    /*
      2. Echte Trainingseinheiten
      dieses Coaches laden
    */
    const {
      data: trainingData,
      error: trainingError,
    } = await supabase
      .from("training_sessions")
      .select(
        `
          id,
          team_id,
          title,
          session_date,
          start_time,
          duration_minutes,
          training_type,
          total_meters,
          focus
        `
      )
      .eq("coach_id", user.id)
      .order("session_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });

    if (trainingError) {
      setMessage(
        `Trainings konnten nicht geladen werden: ${trainingError.message}`
      );

      setLoading(false);
      return;
    }

    setTeams(
      (teamData ?? []) as Team[]
    );

    setTrainings(
      (trainingData ??
        []) as TrainingSession[]
    );

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadData();
  }, []);

  const today =
    getLocalDateString(new Date());

  const weekStart =
    getLocalDateString(
      getStartOfWeek(new Date())
    );

  const weekEnd =
    getLocalDateString(
      getEndOfWeek(new Date())
    );

  /*
    Trainingseinheiten dieser Woche
  */
  const weekTrainings =
    useMemo(() => {
      return trainings.filter(
        (training) =>
          training.session_date >=
            weekStart &&
          training.session_date <=
            weekEnd
      );
    }, [
      trainings,
      weekStart,
      weekEnd,
    ]);

  /*
    KPI: heutige Einheiten
  */
  const todayTrainings =
    weekTrainings.filter(
      (training) =>
        training.session_date ===
        today
    );

  const waterTrainings =
    weekTrainings.filter(
      (training) =>
        training.training_type ===
        "water"
    );

  const landTrainings =
    weekTrainings.filter(
      (training) =>
        training.training_type ===
        "land"
    );

  /*
    Kommende Trainings:
    heute oder später
  */
  const upcomingTrainings =
    useMemo(() => {
      return trainings.filter(
        (training) =>
          training.session_date >=
          today
      );
    }, [trainings, today]);

  /*
    Team- und Artfilter anwenden
  */
  const filteredTrainings =
    useMemo(() => {
      return upcomingTrainings.filter(
        (training) => {
          const matchesTeam =
            selectedTeam === "all" ||
            training.team_id ===
              selectedTeam;

          const matchesType =
            selectedType === "all" ||
            training.training_type ===
              selectedType;

          return (
            matchesTeam &&
            matchesType
          );
        }
      );
    }, [
      upcomingTrainings,
      selectedTeam,
      selectedType,
    ]);

  function getTeamName(
    teamId: string
  ) {
    return (
      teams.find(
        (team) =>
          team.id === teamId
      )?.name ?? "Unbekanntes Team"
    );
  }

  function formatDate(
    date: string
  ) {
    return new Date(
      `${date}T12:00:00`
    ).toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  }

  return (
    <main>
      <div className="mx-auto w-full max-w-[1500px]">
        {/* Kopf */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-app-heading">
              Training
            </h1>

            <p className="mt-0.5 text-sm text-app-muted">
              Einheiten deiner Teams
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/coach/training/season"
              className="rounded-lg border border-app-border px-4 py-2.5 text-sm font-medium text-app-text transition hover:bg-app-elevated hover:text-app-heading"
            >
              Jahresplanung
            </Link>

            <Link
              href="/coach/training/new"
              className="rounded-lg bg-app-accent px-4 py-2.5 text-sm font-semibold text-app-accent-ink transition hover:brightness-110"
            >
              + Training erstellen
            </Link>
          </div>
        </div>

        {message && (
          <div className="mt-5 rounded-lg border border-app-bad/40 bg-app-bad/10 px-4 py-3 text-sm text-app-bad">
            {message}
          </div>
        )}

        {/* Kennzahlen */}
        <section className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-app-border bg-app-border lg:grid-cols-4">
          <div className="bg-app-surface px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
              Heute
            </p>

            <p className="mt-1.5 text-2xl font-semibold text-app-heading">
              {todayTrainings.length}
            </p>

            <p className="mt-0.5 text-xs text-app-faint">
              Geplante Einheiten
            </p>
          </div>

          <div className="bg-app-surface px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
              Diese Woche
            </p>

            <p className="mt-1.5 text-2xl font-semibold text-app-heading">
              {weekTrainings.length}
            </p>

            <p className="mt-0.5 text-xs text-app-faint">
              Einheiten gesamt
            </p>
          </div>

          <div className="bg-app-surface px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
              Wasser
            </p>

            <p className="mt-1.5 text-2xl font-semibold text-app-accent">
              {waterTrainings.length}
            </p>

            <p className="mt-0.5 text-xs text-app-faint">
              Diese Woche
            </p>
          </div>

          <div className="bg-app-surface px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-app-muted">
              Land
            </p>

            <p className="mt-1.5 text-2xl font-semibold text-app-good">
              {landTrainings.length}
            </p>

            <p className="mt-0.5 text-xs text-app-faint">
              Diese Woche
            </p>
          </div>
        </section>

        {/* Kommende Einheiten */}
        <section className="mt-5 overflow-hidden rounded-xl border border-app-border bg-app-surface">
          <div className="flex flex-col gap-3 border-b border-app-border px-4 py-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-semibold text-app-heading">
              Kommende Einheiten
            </h2>

            <div className="flex flex-wrap gap-2">
              <select
                value={selectedTeam}
                onChange={(event) =>
                  setSelectedTeam(event.target.value)
                }
                className="rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-sm text-app-heading outline-none transition focus:border-app-accent"
              >
                <option value="all">
                  Alle Teams
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(event) =>
                  setSelectedType(
                    event.target.value as TypeFilter
                  )
                }
                className="rounded-lg border border-app-border bg-app-bg px-3 py-1.5 text-sm text-app-heading outline-none transition focus:border-app-accent"
              >
                <option value="all">
                  Alle Arten
                </option>

                <option value="water">
                  Wasser
                </option>

                <option value="land">
                  Land
                </option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-app-muted">
              Trainings werden geladen...
            </div>
          ) : filteredTrainings.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-app-faint">
                Keine kommenden Einheiten gefunden.
              </p>

              <Link
                href="/coach/training/new"
                className="mt-4 inline-block rounded-lg bg-app-accent px-4 py-2 text-sm font-semibold text-app-accent-ink transition hover:brightness-110"
              >
                Erstes Training erstellen
              </Link>
            </div>
          ) : (
            /*
              Dichte Liste statt grosser Karten: beim Planen
              vergleicht man Einheiten, statt eine zu lesen.
            */
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left">
                <thead>
                  <tr className="border-b border-app-border text-[11px] uppercase tracking-wider text-app-faint">
                    <th className="px-4 py-2.5 font-medium">
                      Datum
                    </th>

                    <th className="px-4 py-2.5 font-medium">
                      Zeit
                    </th>

                    <th className="px-4 py-2.5 font-medium">
                      Einheit
                    </th>

                    <th className="px-4 py-2.5 font-medium">
                      Team
                    </th>

                    <th className="px-4 py-2.5 font-medium">
                      Art
                    </th>

                    <th className="px-4 py-2.5 text-right font-medium">
                      Dauer
                    </th>

                    <th className="px-4 py-2.5 text-right font-medium">
                      Umfang
                    </th>

                    <th className="px-4 py-2.5 text-right font-medium">
                      Bearbeiten
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-app-border">
                  {filteredTrainings.map(
                    (training) => {
                      const isToday =
                        training.session_date === today;

                      return (
                        <tr
                          key={training.id}
                          className="transition hover:bg-app-elevated/40"
                        >
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/coach/training/session/${training.id}`}
                              className={`text-sm font-medium ${
                                isToday
                                  ? "text-app-accent"
                                  : "text-app-text"
                              }`}
                            >
                              {isToday
                                ? "Heute"
                                : formatDate(
                                    training.session_date
                                  )}
                            </Link>
                          </td>

                          <td className="px-4 py-2.5 text-sm text-app-text">
                            {training.start_time
                              ? training.start_time.slice(0, 5)
                              : "—"}
                          </td>

                          <td className="px-4 py-2.5">
                            <Link
                              href={`/coach/training/session/${training.id}`}
                              className="block max-w-[26rem] truncate text-sm font-medium text-app-heading hover:underline"
                            >
                              {training.title}
                            </Link>

                            {training.focus && (
                              <span className="mt-0.5 block max-w-[26rem] truncate text-xs text-app-faint">
                                {training.focus}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-2.5 text-sm text-app-muted">
                            {getTeamName(training.team_id)}
                          </td>

                          <td className="px-4 py-2.5">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                                training.training_type === "water"
                                  ? "bg-app-accent/15 text-app-accent"
                                  : "bg-app-good/15 text-app-good"
                              }`}
                            >
                              {training.training_type === "water"
                                ? "Wasser"
                                : "Land"}
                            </span>
                          </td>

                          <td className="px-4 py-2.5 text-right text-sm text-app-text">
                            {training.duration_minutes !== null
                              ? `${training.duration_minutes} min`
                              : "—"}
                          </td>

                          <td className="px-4 py-2.5 text-right text-sm text-app-text">
                            {training.training_type === "water" &&
                            training.total_meters !== null
                              ? `${training.total_meters.toLocaleString(
                                  "de-DE"
                                )} m`
                              : "—"}
                          </td>

                          <td className="px-4 py-2.5 text-right">
                            <Link
                              href={`/coach/training/new?session=${training.id}`}
                              className="text-xs text-app-muted transition hover:text-app-heading"
                            >
                              Bearbeiten
                            </Link>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Planungsbereiche */}
        <section className="mt-5 overflow-hidden rounded-xl border border-app-border bg-app-surface">
          <div className="border-b border-app-border px-4 py-3">
            <h2 className="text-sm font-semibold text-app-heading">
              Planung
            </h2>
          </div>

          <ul className="divide-y divide-app-border">
            <li>
              <Link
                href="/coach/training/season"
                className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-app-elevated/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-app-heading">
                    Jahresplanung
                  </span>

                  <span className="mt-0.5 block text-xs text-app-faint">
                    Makrozyklen, Mesozyklen und Saisontermine
                  </span>
                </span>

                <span className="shrink-0 text-app-muted">
                  →
                </span>
              </Link>
            </li>

            <li>
              <Link
                href="/coach/training/week/1"
                className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-app-elevated/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-app-heading">
                    Wochenplanung
                  </span>

                  <span className="mt-0.5 block text-xs text-app-faint">
                    Montag bis Sonntag mit allen Einheiten
                  </span>
                </span>

                <span className="shrink-0 text-app-muted">
                  →
                </span>
              </Link>
            </li>

            <li>
              <Link
                href="/coach/training/new"
                className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-app-elevated/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-app-heading">
                    Training schreiben
                  </span>

                  <span className="mt-0.5 block text-xs text-app-faint">
                    Wasser- oder Landtraining erstellen
                  </span>
                </span>

                <span className="shrink-0 text-app-muted">
                  →
                </span>
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}