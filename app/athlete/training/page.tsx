"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AthleteTraining = {
  id: string;
  session_date: string;
  start_time: string | null;
  title: string;
  training_type: "water" | "land";
  focus: string | null;
  duration_minutes: number | null;
  total_meters: number | null;
};

type DisplayTraining = {
  id: string;
  day: string;
  date: string;
  rawDate: string;
  time: string;
  title: string;
  type: "Wasser" | "Land";
  focus: string;
  duration: number;
  meters?: number;
  status: "Geplant" | "Heute" | "Vergangen";
};

const weekDays = [
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
  "Sonntag",
];

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date) {
  const result = new Date(date);

  const day = result.getDay();

  const difference =
    day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);
  result.setHours(0, 0, 0, 0);

  return result;
}

function getEndOfWeek(date: Date) {
  const start = getStartOfWeek(date);
  const result = new Date(start);

  result.setDate(start.getDate() + 6);
  result.setHours(23, 59, 59, 999);

  return result;
}

export default function AthleteTrainingPage() {
  const [trainings, setTrainings] = useState<
    AthleteTraining[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTrainings() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Athlete konnte nicht geladen werden.");
      setLoading(false);
      return;
    }

    const today = new Date();

    const weekStart =
      getLocalDateString(getStartOfWeek(today));

    const weekEnd =
      getLocalDateString(getEndOfWeek(today));

    const { data, error } = await supabase
      .from("training_sessions")
      .select(
        `
          id,
          session_date,
          start_time,
          title,
          training_type,
          focus,
          duration_minutes,
          total_meters
        `
      )
      .gte("session_date", weekStart)
      .lte("session_date", weekEnd)
      .order("session_date", {
        ascending: true,
      })
      .order("start_time", {
        ascending: true,
      });

    if (error) {
      setMessage(
        `Trainings konnten nicht geladen werden: ${error.message}`
      );
      setLoading(false);
      return;
    }

    setTrainings((data ?? []) as AthleteTraining[]);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadTrainings();
  }, []);

  const displayTrainings = useMemo<
    DisplayTraining[]
  >(() => {
    const todayString =
      getLocalDateString(new Date());

    return trainings.map((training) => {
      const parsedDate = new Date(
        `${training.session_date}T12:00:00`
      );

      const formattedDate =
        parsedDate.toLocaleDateString("de-DE");

      const day =
        parsedDate.toLocaleDateString("de-DE", {
          weekday: "long",
        });

      let status: DisplayTraining["status"] =
        "Geplant";

      if (
        training.session_date === todayString
      ) {
        status = "Heute";
      } else if (
        training.session_date < todayString
      ) {
        status = "Vergangen";
      }

      return {
        id: training.id,
        day,
        date: formattedDate,
        rawDate: training.session_date,
        time: training.start_time
          ? training.start_time.slice(0, 5)
          : "—",
        title: training.title,
        type:
          training.training_type === "water"
            ? "Wasser"
            : "Land",
        focus:
          training.focus ??
          "Kein Schwerpunkt eingetragen",
        duration:
          training.duration_minutes ?? 0,
        meters:
          training.total_meters ?? undefined,
        status,
      };
    });
  }, [trainings]);

  const totalMeters =
    displayTrainings.reduce(
      (total, training) =>
        total + (training.meters ?? 0),
      0
    );

  const waterSessions =
    displayTrainings.filter(
      (training) =>
        training.type === "Wasser"
    ).length;

  const landSessions =
    displayTrainings.filter(
      (training) =>
        training.type === "Land"
    ).length;

  const groupedTrainings =
    displayTrainings.reduce<
      Record<string, DisplayTraining[]>
    >((groups, training) => {
      const normalizedDay =
        training.day.charAt(0).toUpperCase() +
        training.day.slice(1);

      if (!groups[normalizedDay]) {
        groups[normalizedDay] = [];
      }

      groups[normalizedDay].push(training);

      return groups;
    }, {});

  const todayTrainings =
    displayTrainings.filter(
      (training) =>
        training.status === "Heute"
    );

  function getStatusStyle(
    status: DisplayTraining["status"]
  ) {
    if (status === "Heute") {
      return "bg-app-accent/10 text-app-accent";
    }

    if (status === "Vergangen") {
      return "bg-app-elevated text-app-muted";
    }

    return "bg-app-elevated text-app-text";
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      {/* Kopf */}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm text-app-muted">
            Mein Training
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Trainingsplan
          </h1>

          <p className="mt-2 text-app-muted">
            Deine echten geplanten Einheiten
            aus Supabase.
          </p>
        </div>

        <Link
          href="/athlete"
          className="rounded-xl border border-app-border px-4 py-3 text-center text-sm hover:bg-app-elevated"
        >
          Zurück zum Dashboard
        </Link>
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
          {message}
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-app-border bg-app-surface p-6 text-app-muted">
          Trainings werden geladen...
        </div>
      ) : (
        <>
          {/* Kennzahlen */}
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-app-border bg-app-surface p-5">
              <p className="text-sm text-app-muted">
                Einheiten
              </p>

              <p className="mt-2 text-3xl font-bold">
                {displayTrainings.length}
              </p>

              <p className="mt-2 text-sm text-app-faint">
                Diese Woche
              </p>
            </div>

            <div className="rounded-2xl border border-app-border bg-app-surface p-5">
              <p className="text-sm text-app-muted">
                Wasser
              </p>

              <p className="mt-2 text-3xl font-bold">
                {waterSessions}
              </p>

              <p className="mt-2 text-sm text-app-faint">
                Einheiten
              </p>
            </div>

            <div className="rounded-2xl border border-app-border bg-app-surface p-5">
              <p className="text-sm text-app-muted">
                Land
              </p>

              <p className="mt-2 text-3xl font-bold">
                {landSessions}
              </p>

              <p className="mt-2 text-sm text-app-faint">
                Einheiten
              </p>
            </div>

            <div className="rounded-2xl border border-app-border bg-app-surface p-5">
              <p className="text-sm text-app-muted">
                Wochenumfang
              </p>

              <p className="mt-2 text-3xl font-bold">
                {(
                  totalMeters / 1000
                ).toLocaleString(
                  "de-DE"
                )}{" "}
                km
              </p>

              <p className="mt-2 text-sm text-app-faint">
                Wasser
              </p>
            </div>
          </section>

          {/* Wochenplan */}
          <section className="mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold">
                Diese Woche
              </h2>

              <p className="mt-1 text-sm text-app-muted">
                Montag bis Sonntag
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-7">
              {weekDays.map((day) => {
                const dayTrainings =
                  groupedTrainings[
                    day
                  ] ?? [];

                return (
                  <div
                    key={day}
                    className="min-h-[390px] rounded-2xl border border-app-border bg-app-surface"
                  >
                    <div className="border-b border-app-border p-4">
                      <h3 className="font-semibold">
                        {day}
                      </h3>

                      {dayTrainings[0] && (
                        <p className="mt-1 text-xs text-app-faint">
                          {
                            dayTrainings[0]
                              .date
                          }
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 p-3">
                      {dayTrainings.length ===
                      0 ? (
                        <div className="rounded-xl border border-dashed border-app-border p-4 text-center">
                          <p className="text-sm text-app-faint">
                            Ruhetag
                          </p>
                        </div>
                      ) : (
                        dayTrainings.map(
                          (training) => (
                            <div
                              key={
                                training.id
                              }
                              className="rounded-xl border border-app-border bg-app-bg p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] font-medium ${
                                    training.type ===
                                    "Wasser"
                                      ? "bg-app-accent/10 text-app-accent"
                                      : "bg-app-good/10 text-app-good"
                                  }`}
                                >
                                  {
                                    training.type
                                  }
                                </span>

                                <span className="text-xs text-app-faint">
                                  {
                                    training.time
                                  }
                                </span>
                              </div>

                              <h4 className="mt-3 text-sm font-semibold">
                                {
                                  training.title
                                }
                              </h4>

                              <p className="mt-1 text-xs leading-5 text-app-faint">
                                {
                                  training.focus
                                }
                              </p>

                              {training.meters !==
                                undefined && (
                                <p className="mt-3 text-sm font-medium">
                                  {training.meters.toLocaleString(
                                    "de-DE"
                                  )}{" "}
                                  m
                                </p>
                              )}

                              <div className="mt-3 flex items-center justify-between">
                                <span
                                  className={`rounded-full px-2 py-1 text-[10px] ${getStatusStyle(
                                    training.status
                                  )}`}
                                >
                                  {
                                    training.status
                                  }
                                </span>

                                <span className="text-xs text-app-faint">
                                  {
                                    training.duration
                                  }{" "}
                                  Min
                                </span>
                              </div>

                              <Link
                                href={`/athlete/training/${training.id}`}
                                className="mt-4 block rounded-lg border border-app-border px-3 py-2 text-center text-xs hover:bg-app-elevated"
                              >
                                Training öffnen
                              </Link>
                            </div>
                          )
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Heutige Einheiten */}
          <section className="mt-6 rounded-2xl border border-app-border bg-app-surface">
            <div className="border-b border-app-border p-5">
              <h2 className="text-xl font-semibold">
                Heute
              </h2>

              <p className="mt-1 text-sm text-app-muted">
                Deine heutigen Trainingseinheiten
              </p>
            </div>

            {todayTrainings.length ===
            0 ? (
              <div className="p-5">
                <div className="rounded-xl border border-dashed border-app-border p-6 text-center">
                  <p className="text-sm text-app-faint">
                    Heute ist keine
                    Trainingseinheit
                    eingetragen.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 p-5 md:grid-cols-2">
                {todayTrainings.map(
                  (training) => (
                    <div
                      key={training.id}
                      className="rounded-2xl border border-app-border bg-app-bg p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-app-faint">
                            {
                              training.time
                            }{" "}
                            Uhr
                          </p>

                          <h3 className="mt-2 text-lg font-semibold">
                            {
                              training.title
                            }
                          </h3>

                          <p className="mt-1 text-sm text-app-muted">
                            {
                              training.focus
                            }
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            training.type ===
                            "Wasser"
                              ? "bg-app-accent/10 text-app-accent"
                              : "bg-app-good/10 text-app-good"
                          }`}
                        >
                          {
                            training.type
                          }
                        </span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-app-border bg-app-surface p-3">
                          <p className="text-xs text-app-faint">
                            Dauer
                          </p>

                          <p className="mt-1 font-semibold">
                            {
                              training.duration
                            }{" "}
                            Min
                          </p>
                        </div>

                        <div className="rounded-xl border border-app-border bg-app-surface p-3">
                          <p className="text-xs text-app-faint">
                            Umfang
                          </p>

                          <p className="mt-1 font-semibold">
                            {training.meters !==
                            undefined
                              ? `${training.meters.toLocaleString(
                                  "de-DE"
                                )} m`
                              : "Land"}
                          </p>
                        </div>
                      </div>

                      <Link
                        href={`/athlete/training/${training.id}`}
                        className="mt-4 block rounded-xl bg-app-accent px-4 py-3 text-center text-sm font-medium text-app-accent-ink hover:brightness-110"
                      >
                        Training ansehen
                      </Link>
                    </div>
                  )
                )}
              </div>
            )}
          </section>

          <section className="mt-6 rounded-2xl border border-app-border bg-app-surface p-5">
            <h2 className="text-lg font-semibold">
              Nach dem Training
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-app-muted">
              Nach einer Einheit kannst du
              später angeben, wie anstrengend
              das Training war und wie es für
              dich gelaufen ist. Diese
              Rückmeldung sieht anschließend
              dein Coach.
            </p>
          </section>
        </>
      )}
    </div>
  );
}