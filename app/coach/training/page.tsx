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

  useEffect(() => {
    loadData();
  }, []);

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
    ).toLocaleDateString("de-DE");
  }

  function getTrainingStatus(
    training: TrainingSession
  ) {
    if (
      training.session_date === today
    ) {
      return {
        label: "Heute",
        className:
          "bg-blue-950 text-blue-300",
      };
    }

    return {
      label: "Geplant",
      className:
        "bg-slate-800 text-slate-300",
    };
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
        {/* KOPFBEREICH */}

        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-slate-400">
              Coach Bereich
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Training
            </h1>

            <p className="mt-1.5 text-sm text-slate-400 sm:text-base">
              Plane und verwalte die Trainingseinheiten deiner Teams.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/coach/training/season"
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Jahresplanung
            </Link>

            <Link
              href="/coach/training/new"
              className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Training erstellen
            </Link>
          </div>
        </header>

        {message && (
          <div className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
            {message}
          </div>
        )}

        {/* KENNZAHLEN */}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5">
            <p className="text-xs font-medium text-slate-400">
              Heute
            </p>

            <div className="mt-1.5 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold">
                {todayTrainings.length}
              </p>

              <p className="pb-0.5 text-right text-[11px] leading-4 text-slate-500 sm:text-xs">
                Geplante Einheiten
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5">
            <p className="text-xs font-medium text-slate-400">
              Diese Woche
            </p>

            <div className="mt-1.5 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold">
                {weekTrainings.length}
              </p>

              <p className="pb-0.5 text-right text-[11px] leading-4 text-slate-500 sm:text-xs">
                Einheiten
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5">
            <p className="text-xs font-medium text-slate-400">
              Wassertraining
            </p>

            <div className="mt-1.5 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold">
                {waterTrainings.length}
              </p>

              <p className="pb-0.5 text-right text-[11px] leading-4 text-slate-500 sm:text-xs">
                Diese Woche
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5">
            <p className="text-xs font-medium text-slate-400">
              Landtraining
            </p>

            <div className="mt-1.5 flex items-end justify-between gap-3">
              <p className="text-2xl font-bold">
                {landTrainings.length}
              </p>

              <p className="pb-0.5 text-right text-[11px] leading-4 text-slate-500 sm:text-xs">
                Diese Woche
              </p>
            </div>
          </div>
        </section>

        {/* KOMMENDE TRAININGSEINHEITEN */}

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Kommende Trainingseinheiten
              </h2>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                Deine geplanten Trainingseinheiten im Überblick.
              </p>
            </div>

            <div className="grid w-full gap-2 sm:grid-cols-2 md:w-auto">
              <select
                value={selectedTeam}
                onChange={(event) =>
                  setSelectedTeam(
                    event.target.value
                  )
                }
                className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-slate-500"
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
                    event.target
                      .value as TypeFilter
                  )
                }
                className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-slate-500"
              >
                <option value="all">
                  Alle Trainingsarten
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
            <div className="p-7 text-center text-sm text-slate-400">
              Trainings werden geladen...
            </div>
          ) : filteredTrainings.length ===
            0 ? (
            <div className="p-7 text-center">
              <p className="text-sm text-slate-500">
                Keine kommenden Trainingseinheiten gefunden.
              </p>

              <Link
                href="/coach/training/new"
                className="mt-4 inline-block rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
              >
                Erstes Training erstellen
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredTrainings.map(
                (training) => {
                  const status =
                    getTrainingStatus(
                      training
                    );

                  const teamName =
                    getTeamName(
                      training.team_id
                    );

                  const trainingType =
                    training.training_type ===
                    "water"
                      ? "Wasser"
                      : "Land";

                  return (
                    <article
                      key={training.id}
                      className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-950 p-4"
                    >
                      {/* DATUM + STATUS */}

                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs text-slate-400">
                          {formatDate(
                            training.session_date
                          )}{" "}
                          ·{" "}
                          {training.start_time
                            ? training.start_time.slice(
                                0,
                                5
                              )
                            : "—"}{" "}
                          Uhr
                        </p>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${status.className}`}
                        >
                          {
                            status.label
                          }
                        </span>
                      </div>

                      {/* TITEL */}

                      <div className="mt-3">
                        <h3 className="text-base font-semibold leading-6 text-white">
                          {
                            training.title
                          }
                        </h3>

                        {training.focus && (
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {
                              training.focus
                            }
                          </p>
                        )}
                      </div>

                      {/* INFORMATIONEN */}

                      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-y border-slate-800 py-3 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                        <div className="min-w-0">
                          <p className="text-[11px] text-slate-600">
                            Team
                          </p>

                          <p className="mt-0.5 truncate text-sm font-medium text-slate-200">
                            {teamName}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-slate-600">
                            Dauer
                          </p>

                          <p className="mt-0.5 text-sm font-medium text-slate-200">
                            {training.duration_minutes !==
                            null
                              ? `${training.duration_minutes} min`
                              : "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-slate-600">
                            Art
                          </p>

                          <p className="mt-0.5 text-sm font-medium text-slate-200">
                            {trainingType}
                          </p>
                        </div>

                        <div>
                          <p className="text-[11px] text-slate-600">
                            Umfang
                          </p>

                          <p className="mt-0.5 text-sm font-medium text-slate-200">
                            {training.training_type ===
                              "water" &&
                            training.total_meters !==
                              null
                              ? `${training.total_meters.toLocaleString(
                                  "de-DE"
                                )} m`
                              : training.training_type ===
                                "land"
                              ? "Land"
                              : "—"}
                          </p>
                        </div>
                      </div>

                      {/* AKTIONEN */}

                      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
                        <Link
                          href={`/coach/training/session/${training.id}`}
                          className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-950 transition hover:bg-white"
                        >
                          Öffnen
                        </Link>

                        <Link
                          href={`/coach/training/new?session=${training.id}`}
                          className="rounded-lg border border-slate-700 px-3 py-2 text-center text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                        >
                          Bearbeiten
                        </Link>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* TRAININGSPLANUNG */}

        <section className="mt-4">
          <div className="mb-3">
            <h2 className="text-lg font-semibold">
              Trainingsplanung
            </h2>

            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
              Direkter Zugriff auf deine Planungsbereiche.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Link
              href="/coach/training/season"
              className="group rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 transition hover:border-slate-600 hover:bg-slate-900/80"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
                Saison
              </p>

              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-semibold text-white">
                  Jahresplanung
                </p>

                <span className="text-sm text-slate-600 transition group-hover:text-slate-400">
                  →
                </span>
              </div>

              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Makrozyklen, Mesozyklen und Saisontermine.
              </p>
            </Link>

            <Link
              href="/coach/training/week/1"
              className="group rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 transition hover:border-slate-600 hover:bg-slate-900/80"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
                Mikrozyklus
              </p>

              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-semibold text-white">
                  Wochenplanung
                </p>

                <span className="text-sm text-slate-600 transition group-hover:text-slate-400">
                  →
                </span>
              </div>

              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Montag bis Sonntag mit allen Einheiten.
              </p>
            </Link>

            <Link
              href="/coach/training/new"
              className="group rounded-xl border border-slate-800 bg-slate-900 px-4 py-3.5 transition hover:border-slate-600 hover:bg-slate-900/80"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-600">
                Einzeltraining
              </p>

              <div className="mt-1 flex items-center justify-between gap-3">
                <p className="font-semibold text-white">
                  Training schreiben
                </p>

                <span className="text-sm text-slate-600 transition group-hover:text-slate-400">
                  →
                </span>
              </div>

              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Wasser- oder Landtraining erstellen.
              </p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}