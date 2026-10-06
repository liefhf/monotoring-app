"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import TrainingEffectCards from "@/components/TrainingEffectCards";
import { LatestNews, UpcomingEntries } from "@/components/DashboardWidgets";

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type TeamMember = {
  team_id: string;
};

type TrainingSession = {
  id: string;
  team_id: string;
  title: string;
  session_date: string;
  start_time: string | null;
  training_type: "water" | "land";
  duration_minutes: number | null;
  total_meters: number | null;
};

type TrainingFeedback = {
  id: string;
  athlete_id: string;
  training_session_id: string;
  rpe: number;
  completed: boolean;
  created_at: string;
};

type DailyCheckIn = {
  id: string;
  athlete_id: string;
  entry_date: string;
};

type CheckInDate = {
  entry_date: string;
};

type FeedbackWithTraining = {
  feedback: TrainingFeedback;
  training: TrainingSession | null;
};

type DayStatus =
  | "complete"
  | "pending"
  | "missed"
  | "rest"
  | "future";

type WeekDay = {
  date: string;
  dateObject: Date;
  weekday: string;
  dayNumber: string;
  isToday: boolean;
  trainings: TrainingSession[];
  completedCount: number;
  status: DayStatus;
};

type ChartPoint = {
  id: string;
  date: string;
  title: string;
  value: number;
};

function getLocalDateString(date: Date) {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getStartOfWeek(date: Date) {
  const result =
    new Date(date);

  const day =
    result.getDay();

  const difference =
    day === 0
      ? -6
      : 1 - day;

  result.setDate(
    result.getDate() +
      difference
  );

  result.setHours(
    12,
    0,
    0,
    0
  );

  return result;
}

function getWeekDays() {
  const today =
    new Date();

  today.setHours(
    12,
    0,
    0,
    0
  );

  const monday =
    getStartOfWeek(today);

  return Array.from(
    { length: 7 },
    (_, index) => {
      const date =
        new Date(monday);

      date.setDate(
        monday.getDate() +
          index
      );

      return date;
    }
  );
}

function calculateCheckInStreakFromDates(
  checkInDates: string[],
  hasTodayCheckIn: boolean
) {
  const dates =
    new Set(checkInDates);

  let streak = 0;

  const current =
    new Date();

  current.setHours(
    12,
    0,
    0,
    0
  );

  if (!hasTodayCheckIn) {
    current.setDate(
      current.getDate() - 1
    );
  }

  while (true) {
    const dateString =
      getLocalDateString(
        current
      );

    if (
      !dates.has(
        dateString
      )
    ) {
      break;
    }

    streak += 1;

    current.setDate(
      current.getDate() - 1
    );
  }

  return streak;
}

function formatDate(
  dateString: string
) {
  return new Date(
    `${dateString}T12:00:00`
  ).toLocaleDateString(
    "de-DE"
  );
}

function formatShortDate(
  dateString: string
) {
  return new Date(
    `${dateString}T12:00:00`
  ).toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
    }
  );
}

function formatCompactDate(
  dateString: string
) {
  return new Date(
    `${dateString}T12:00:00`
  ).toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    }
  );
}

function RpeChart({
  points,
}: {
  points: ChartPoint[];
}) {
  const width = 820;
  const height = 185;

  const padding = {
    top: 14,
    right: 18,
    bottom: 36,
    left: 44,
  };

  const chartWidth =
    width -
    padding.left -
    padding.right;

  const chartHeight =
    height -
    padding.top -
    padding.bottom;

  if (
    points.length === 0
  ) {
    return (
      <div className="flex min-h-[135px] items-center justify-center rounded-xl border border-app-border bg-app-bg/40 px-4 text-center text-sm text-app-faint">
        Noch keine RPE-Daten vorhanden.
      </div>
    );
  }

  function getX(
    index: number
  ) {
    if (
      points.length === 1
    ) {
      return (
        padding.left +
        chartWidth / 2
      );
    }

    return (
      padding.left +
      (index /
        (points.length - 1)) *
        chartWidth
    );
  }

  function getY(
    value: number
  ) {
    const min = 1;
    const max = 10;

    return (
      padding.top +
      chartHeight -
      ((value - min) /
        (max - min)) *
        chartHeight
    );
  }

  const polylinePoints =
    points
      .map(
        (
          point,
          index
        ) =>
          `${getX(
            index
          )},${getY(
            point.value
          )}`
      )
      .join(" ");

  const ticks = [
    1,
    3,
    5,
    7,
    10,
  ];

  const labelStep =
    Math.max(
      1,
      Math.ceil(
        points.length / 6
      )
    );

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[560px] w-full"
        role="img"
        aria-label="RPE im Verlauf"
      >
        {ticks.map(
          (tick) => {
            const y =
              getY(tick);

            return (
              <g key={tick}>
                <line
                  x1={
                    padding.left
                  }
                  y1={y}
                  x2={
                    width -
                    padding.right
                  }
                  y2={y}
                  stroke="currentColor"
                  className="text-app-faint"
                  strokeWidth="1"
                />

                <text
                  x={
                    padding.left -
                    9
                  }
                  y={y + 4}
                  textAnchor="end"
                  className="fill-app-faint text-[10px]"
                >
                  {tick}
                </text>
              </g>
            );
          }
        )}

        {points.length >
          1 && (
          <polyline
            points={
              polylinePoints
            }
            fill="none"
            stroke="currentColor"
            className="text-app-text"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map(
          (
            point,
            index
          ) => {
            const x =
              getX(index);

            const y =
              getY(
                point.value
              );

            const showLabel =
              index %
                labelStep ===
                0 ||
              index ===
                points.length -
                  1;

            return (
              <g
                key={
                  point.id
                }
              >
                <circle
                  cx={x}
                  cy={y}
                  r="3.8"
                  fill="currentColor"
                  className="text-app-warn"
                />

                <title>
                  {`${formatDate(
                    point.date
                  )} · ${
                    point.title
                  } · RPE ${
                    point.value
                  } / 10`}
                </title>

                {showLabel && (
                  <text
                    x={x}
                    y={
                      height -
                      11
                    }
                    textAnchor="middle"
                    className="fill-app-faint text-[10px]"
                  >
                    {formatShortDate(
                      point.date
                    )}
                  </text>
                )}
              </g>
            );
          }
        )}
      </svg>
    </div>
  );
}

export default function AthletePage() {
  const [
    profile,
    setProfile,
  ] =
    useState<Profile | null>(
      null
    );

  const [
    trainings,
    setTrainings,
  ] =
    useState<
      TrainingSession[]
    >([]);

  const [
    feedback,
    setFeedback,
  ] =
    useState<
      TrainingFeedback[]
    >([]);

  const [
    todayCheckIn,
    setTodayCheckIn,
  ] =
    useState<
      DailyCheckIn | null
    >(null);

  const [
    checkInStreak,
    setCheckInStreak,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    message,
    setMessage,
  ] =
    useState("");

  async function loadDashboard() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setMessage(
        "Athlet konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    const {
      data: profileData,
      error: profileError,
    } =
      await supabase
        .from("profiles")
        .select(`
          id,
          first_name,
          last_name
        `)
        .eq(
          "id",
          user.id
        )
        .single();

    if (
      profileError ||
      !profileData
    ) {
      setMessage(
        "Profil konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    setProfile(
      profileData as Profile
    );

    const today =
      getLocalDateString(
        new Date()
      );

    const {
      data: checkInData,
      error: checkInError,
    } =
      await supabase
        .from(
          "befinden_entries"
        )
        .select(`
          id,
          athlete_id,
          entry_date
        `)
        .eq(
          "athlete_id",
          user.id
        )
        .eq(
          "entry_date",
          today
        )
        .maybeSingle();

    if (
      checkInError
    ) {
      setMessage(
        `Täglicher Check-in konnte nicht geladen werden: ${checkInError.message}`
      );

      setLoading(false);
      return;
    }

    const currentCheckIn =
      checkInData as DailyCheckIn | null;

    setTodayCheckIn(
      currentCheckIn
    );

    const checkInStartDate =
      new Date();

    checkInStartDate.setDate(
      checkInStartDate.getDate() -
        365
    );

    const {
      data:
        checkInHistoryData,
      error:
        checkInHistoryError,
    } =
      await supabase
        .from(
          "befinden_entries"
        )
        .select(
          "entry_date"
        )
        .eq(
          "athlete_id",
          user.id
        )
        .gte(
          "entry_date",
          getLocalDateString(
            checkInStartDate
          )
        )
        .lte(
          "entry_date",
          today
        )
        .order(
          "entry_date",
          {
            ascending: false,
          }
        );

    if (
      checkInHistoryError
    ) {
      setMessage(
        `Check-in-Serie konnte nicht geladen werden: ${checkInHistoryError.message}`
      );

      setLoading(false);
      return;
    }

    const checkInDates =
      (
        (checkInHistoryData ??
          []) as CheckInDate[]
      ).map(
        (entry) =>
          entry.entry_date
      );

    const currentCheckInStreak =
      calculateCheckInStreakFromDates(
        checkInDates,
        Boolean(
          currentCheckIn
        )
      );

    setCheckInStreak(
      currentCheckInStreak
    );

    const {
      data: memberData,
      error: memberError,
    } =
      await supabase
        .from(
          "team_members"
        )
        .select(
          "team_id"
        )
        .eq(
          "athlete_id",
          user.id
        );

    if (
      memberError
    ) {
      setMessage(
        `Teams konnten nicht geladen werden: ${memberError.message}`
      );

      setLoading(false);
      return;
    }

    const memberships =
      (memberData ??
        []) as TeamMember[];

    const teamIds =
      memberships.map(
        (membership) =>
          membership.team_id
      );

    if (
      teamIds.length === 0
    ) {
      setTrainings([]);
      setFeedback([]);
      setLoading(false);
      return;
    }

    const now =
      new Date();

    const startDate =
      new Date(now);

    startDate.setDate(
      startDate.getDate() -
        180
    );

    const endDate =
      new Date(now);

    endDate.setDate(
      endDate.getDate() +
        30
    );

    const {
      data: trainingData,
      error: trainingError,
    } =
      await supabase
        .from(
          "training_sessions"
        )
        .select(`
          id,
          team_id,
          title,
          session_date,
          start_time,
          training_type,
          duration_minutes,
          total_meters
        `)
        .in(
          "team_id",
          teamIds
        )
        .gte(
          "session_date",
          getLocalDateString(
            startDate
          )
        )
        .lte(
          "session_date",
          getLocalDateString(
            endDate
          )
        )
        .order(
          "session_date",
          {
            ascending: true,
          }
        )
        .order(
          "start_time",
          {
            ascending: true,
          }
        );

    if (
      trainingError
    ) {
      setMessage(
        `Trainings konnten nicht geladen werden: ${trainingError.message}`
      );

      setLoading(false);
      return;
    }

    const loadedTrainings =
      (trainingData ??
        []) as TrainingSession[];

    setTrainings(
      loadedTrainings
    );

    const {
      data: feedbackData,
      error: feedbackError,
    } =
      await supabase
        .from(
          "training_feedback"
        )
        .select(`
          id,
          athlete_id,
          training_session_id,
          rpe,
          completed,
          created_at
        `)
        .eq(
          "athlete_id",
          user.id
        );

    if (
      feedbackError
    ) {
      setMessage(
        `Feedback konnte nicht geladen werden: ${feedbackError.message}`
      );

      setLoading(false);
      return;
    }

    setFeedback(
      (feedbackData ??
        []) as TrainingFeedback[]
    );

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadDashboard();
  }, []);

  const feedbackTrainingIds =
    useMemo(() => {
      return new Set(
        feedback
          .filter(
            (entry) =>
              entry.completed
          )
          .map(
            (entry) =>
              entry.training_session_id
          )
      );
    }, [feedback]);

  const todayString =
    getLocalDateString(
      new Date()
    );

  const weekDays =
    useMemo<WeekDay[]>(
      () => {
        return getWeekDays().map(
          (date) => {
            const dateString =
              getLocalDateString(
                date
              );

            const dayTrainings =
              trainings.filter(
                (training) =>
                  training.session_date ===
                  dateString
              );

            const completedCount =
              dayTrainings.filter(
                (training) =>
                  feedbackTrainingIds.has(
                    training.id
                  )
              ).length;

            let status: DayStatus =
              "rest";

            if (
              dayTrainings.length >
              0
            ) {
              if (
                completedCount ===
                dayTrainings.length
              ) {
                status =
                  "complete";
              } else if (
                dateString <
                todayString
              ) {
                status =
                  "missed";
              } else if (
                dateString ===
                todayString
              ) {
                status =
                  "pending";
              } else {
                status =
                  "future";
              }
            }

            return {
              date:
                dateString,

              dateObject:
                date,

              weekday:
                date.toLocaleDateString(
                  "de-DE",
                  {
                    weekday:
                      "short",
                  }
                ),

              dayNumber:
                String(
                  date.getDate()
                ).padStart(
                  2,
                  "0"
                ),

              isToday:
                dateString ===
                todayString,

              trainings:
                dayTrainings,

              completedCount,

              status,
            };
          }
        );
      },
      [
        trainings,
        feedbackTrainingIds,
        todayString,
      ]
    );

  const todayTrainings =
    useMemo(() => {
      return trainings.filter(
        (training) =>
          training.session_date ===
          todayString
      );
    }, [
      trainings,
      todayString,
    ]);

  const nextTraining =
    useMemo(() => {
      return (
        trainings.find(
          (training) =>
            training.session_date >
              todayString ||
            (
              training.session_date ===
                todayString &&
              !feedbackTrainingIds.has(
                training.id
              )
            )
        ) ??
        null
      );
    }, [
      trainings,
      todayString,
      feedbackTrainingIds,
    ]);

  const trainingDaysThisWeek =
    useMemo(() => {
      return weekDays.filter(
        (day) =>
          day.trainings.length >
          0
      ).length;
    }, [weekDays]);

  const completedTrainingDaysThisWeek =
    useMemo(() => {
      return weekDays.filter(
        (day) =>
          day.status ===
          "complete"
      ).length;
    }, [weekDays]);

  const feedbackWithTraining =
    useMemo<
      FeedbackWithTraining[]
    >(() => {
      return feedback
        .map(
          (entry) => ({
            feedback:
              entry,

            training:
              trainings.find(
                (
                  training
                ) =>
                  training.id ===
                  entry.training_session_id
              ) ??
              null,
          })
        )
        .sort(
          (
            a,
            b
          ) => {
            const dateA =
              a.training
                ?.session_date ??
              a.feedback
                .created_at;

            const dateB =
              b.training
                ?.session_date ??
              b.feedback
                .created_at;

            return dateB.localeCompare(
              dateA
            );
          }
        );
    }, [
      feedback,
      trainings,
    ]);

  const latestFeedback =
    feedbackWithTraining.find(
      (entry) =>
        entry.feedback
          .completed
    ) ??
    null;

  const rpeChartPoints =
    useMemo<
      ChartPoint[]
    >(() => {
      return [
        ...feedbackWithTraining,
      ]
        .filter(
          (entry) =>
            entry.training !==
              null &&
            entry.feedback
              .completed
        )
        .sort(
          (
            a,
            b
          ) =>
            (
              a.training
                ?.session_date ??
              ""
            ).localeCompare(
              b.training
                ?.session_date ??
                ""
            )
        )
        .map(
          (entry) => ({
            id:
              entry.feedback.id,

            date:
              entry.training!
                .session_date,

            title:
              entry.training!
                .title,

            value:
              entry.feedback.rpe,
          })
        );
    }, [
      feedbackWithTraining,
    ]);

  const recentFeedback =
    feedbackWithTraining
      .filter(
        (entry) =>
          entry.feedback
            .completed
      )
      .slice(
        0,
        5
      );

  const completedFeedbackCount =
    feedback.filter(
      (entry) =>
        entry.completed
    ).length;

  const firstName =
    profile?.first_name?.trim() ||
    "Athlet";

  return (
    <main className="bg-app-bg px-4 py-5 text-app-heading sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}

        <header>
          <p className="text-xs text-app-faint">
            Dein Dashboard
          </p>

          <h1 className="mt-0.5 text-3xl font-bold tracking-tight">
            Hallo {firstName}! 👋
          </h1>

          <p className="mt-1 text-sm text-app-muted">
            Deine Trainings und Rückmeldungen im Überblick.
          </p>
        </header>

        {/* Mein Fortschritt: Bestzeiten, Pflichtzeit, Zonen */}
        <Link
          href="/athlete/fortschritt"
          className="mt-4 flex items-center justify-between gap-3 rounded-[20px] border border-app-border bg-app-surface shadow-app px-4 py-3 transition hover:border-app-accent"
        >
          <span>
            <span className="block font-semibold text-app-heading">📈 Mein Fortschritt</span>
            <span className="text-sm text-app-muted">Bestzeiten, Pflichtzeiten, meine Tempo-Zonen</span>
          </span>
          <span className="text-app-accent">→</span>
        </Link>

        {/* Wettkampf-Tag: Starts, Routine, Essen & Trinken */}
        <Link
          href="/athlete/wettkampftag"
          className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-app-accent/40 bg-app-accent/8 px-4 py-3 transition hover:border-app-accent"
        >
          <span>
            <span className="block font-semibold text-app-heading">🏁 Mein Wettkampf-Tag</span>
            <span className="text-sm text-app-muted">Starts, Routine, Essen & Trinken</span>
          </span>
          <span className="text-app-accent">→</span>
        </Link>

        {/* Termine und Neuigkeiten vom Trainer */}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <UpcomingEntries href="/athlete/termine" limit={3} />
          <LatestNews href="/athlete/news" limit={2} />
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
            {message}
          </div>
        )}

        {loading ? (
          <div className="mt-5 rounded-[20px] border border-app-border bg-app-surface shadow-app p-7 text-center text-sm text-app-muted">
            Deine Daten werden geladen...
          </div>
        ) : (
          <>
            {/* CHECK-IN + BESCHWERDEN */}

            <section className="mt-4 grid gap-2.5 md:grid-cols-[1.4fr_1fr]">
              <div
                className={`flex min-h-[72px] items-center justify-between gap-4 rounded-xl border px-4 py-3 ${
                  todayCheckIn
                    ? "border-app-good/70 bg-app-good/15"
                    : "border-app-border bg-app-surface"
                }`}
              >
                <div>
                  {todayCheckIn ? (
                    <>
                      <p className="font-semibold text-app-good">
                        ✓ Check-in erledigt
                      </p>

                      {checkInStreak >
                        0 && (
                        <p className="mt-0.5 text-xs text-app-faint">
                          {checkInStreak}{" "}
                          {checkInStreak ===
                          1
                            ? "Tag in Folge"
                            : "Tage in Folge"}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">
                        Wie geht es dir heute?
                      </p>

                      {checkInStreak >
                        0 && (
                        <p className="mt-0.5 text-xs text-app-faint">
                          {checkInStreak}{" "}
                          Tage in Folge
                        </p>
                      )}
                    </>
                  )}
                </div>

                {!todayCheckIn && (
                  <Link
                    href="/athlete/check-in"
                    className="shrink-0 rounded-lg bg-app-accent px-4 py-2.5 text-sm font-semibold text-app-accent-ink transition hover:brightness-110"
                  >
                    Check-in
                  </Link>
                )}
              </div>

              <Link
                href="/athlete/pain"
                className="flex min-h-[72px] items-center justify-between rounded-xl border border-app-border bg-app-surface px-4 py-3 transition hover:border-app-border hover:bg-app-elevated/70"
              >
                <div>
                  <p className="text-[11px] text-app-faint">
                    Beschwerden
                  </p>

                  <p className="mt-0.5 text-sm font-medium">
                    Schmerzen melden
                  </p>
                </div>

                <span className="text-app-faint">
                  →
                </span>
              </Link>
            </section>

            {/* DEIN TRAINING */}

            <section className="mt-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-app-muted">
                Dein Training
              </h2>

              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
                <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
                  <p className="text-[11px] text-app-faint">
                    Nächstes Training
                  </p>

                  {nextTraining ? (
                    <>
                      <p className="mt-1 truncate text-sm font-semibold">
                        {
                          nextTraining.title
                        }
                      </p>

                      <p className="mt-1 text-xs text-app-faint">
                        {formatDate(
                          nextTraining.session_date
                        )}

                        {nextTraining.start_time
                          ? ` · ${nextTraining.start_time.slice(
                              0,
                              5
                            )} Uhr`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-app-faint">
                      Kein Training geplant
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
                  <p className="text-[11px] text-app-faint">
                    Letzte RPE
                  </p>

                  {latestFeedback ? (
                    <>
                      <div className="mt-0.5 flex items-baseline gap-1">
                        <span className="text-xl font-bold text-app-warn">
                          {
                            latestFeedback.feedback.rpe
                          }
                        </span>

                        <span className="text-xs text-app-faint">
                          / 10
                        </span>
                      </div>

                      <p className="mt-0.5 truncate text-[11px] text-app-faint">
                        {latestFeedback.training?.title ??
                          "Training"}
                      </p>
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-app-faint">
                      Keine Rückmeldung
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
                  <p className="text-[11px] text-app-faint">
                    Rückmeldungen
                  </p>

                  <p className="mt-0.5 text-xl font-bold">
                    {
                      completedFeedbackCount
                    }
                  </p>

                  <p className="mt-0.5 text-[11px] text-app-faint">
                    abgegeben
                  </p>
                </div>
              </div>
            </section>

            {/* HEUTE */}

            <section className="mt-4">
              <h2 className="text-lg font-semibold">
                Heute
              </h2>

              {todayTrainings.length ===
              0 ? (
                <div className="mt-2 rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-faint">
                  Heute ist kein Training geplant.
                </div>
              ) : (
                <div className="mt-2 space-y-2.5">
                  {todayTrainings.map(
                    (training) => {
                      const completed =
                        feedbackTrainingIds.has(
                          training.id
                        );

                      return (
                        <article
                          key={
                            training.id
                          }
                          className="rounded-xl border border-app-border bg-app-surface px-4 py-3"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-app-border bg-app-bg px-2 py-0.5 text-[10px] text-app-muted">
                                  {training.training_type ===
                                  "water"
                                    ? "Wasser"
                                    : "Land"}
                                </span>

                                <span
                                  className={`text-[11px] ${
                                    completed
                                      ? "text-app-good"
                                      : "text-app-warn"
                                  }`}
                                >
                                  {completed
                                    ? "✓ Bewertet"
                                    : "Noch nicht bewertet"}
                                </span>
                              </div>

                              <h3 className="mt-1.5 truncate font-semibold">
                                {
                                  training.title
                                }
                              </h3>

                              <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-app-faint">
                                <span>
                                  {training.start_time
                                    ? training.start_time.slice(
                                        0,
                                        5
                                      )
                                    : "—"}
                                </span>

                                {training.duration_minutes !==
                                  null && (
                                  <span>
                                    ·{" "}
                                    {
                                      training.duration_minutes
                                    }{" "}
                                    min
                                  </span>
                                )}

                                {training.training_type ===
                                  "water" &&
                                  training.total_meters !==
                                    null && (
                                    <span>
                                      ·{" "}
                                      {training.total_meters.toLocaleString(
                                        "de-DE"
                                      )}{" "}
                                      m
                                    </span>
                                  )}
                              </div>
                            </div>

                            <Link
                              href={`/athlete/feedback/${training.id}`}
                              className={`shrink-0 rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                                completed
                                  ? "border border-app-border text-app-text hover:bg-app-elevated"
                                  : "bg-app-accent text-app-accent-ink hover:brightness-110"
                              }`}
                            >
                              {completed
                                ? "Feedback ansehen"
                                : "Feedback geben"}
                            </Link>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            {/* DEINE WOCHE */}

            <section className="mt-4 overflow-hidden rounded-xl border border-app-border bg-app-surface">
              <div className="flex items-center justify-between gap-3 border-b border-app-border px-4 py-3">
                <div>
                  <h2 className="text-base font-semibold">
                    Deine Woche
                  </h2>

                  <p className="mt-0.5 text-[11px] text-app-faint">
                    Trainingstage dieser Woche
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold">
                    {
                      completedTrainingDaysThisWeek
                    }{" "}
                    /{" "}
                    {
                      trainingDaysThisWeek
                    }
                  </p>

                  <p className="text-[10px] text-app-faint">
                    abgeschlossen
                  </p>
                </div>
              </div>

              <div className="px-4 py-3">
                <div className="h-1.5 overflow-hidden rounded-full bg-app-elevated">
                  <div
                    className="h-full rounded-full bg-app-muted transition-all"
                    style={{
                      width:
                        trainingDaysThisWeek ===
                        0
                          ? "0%"
                          : `${Math.min(
                              100,
                              (completedTrainingDaysThisWeek /
                                trainingDaysThisWeek) *
                                100
                            )}%`,
                    }}
                  />
                </div>

                <div className="mt-3 overflow-x-auto pb-1">
                  <div className="grid min-w-[520px] grid-cols-7 gap-1.5">
                    {weekDays.map(
                      (day) => (
                        <DayCard
                          key={
                            day.date
                          }
                          day={
                            day
                          }
                        />
                      )
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* RPE VERLAUF */}

            <section className="mt-4 overflow-hidden rounded-xl border border-app-border bg-app-surface">
              <div className="border-b border-app-border px-4 py-3">
                <h2 className="text-base font-semibold">
                  RPE im Verlauf
                </h2>

                <p className="mt-0.5 text-[11px] text-app-faint">
                  Subjektive Anstrengung deiner letzten Trainingseinheiten
                </p>
              </div>

              <div className="px-4 py-3">
                <RpeChart
                  points={
                    rpeChartPoints
                  }
                />

                <p className="mt-0.5 text-[10px] leading-4 text-app-faint">
                  RPE zeigt, wie anstrengend du die jeweilige Einheit wahrgenommen hast.
                </p>
              </div>
            </section>

            {/* LETZTE TRAININGS */}

            <section className="mt-4 overflow-hidden rounded-xl border border-app-border bg-app-surface">
              <div className="border-b border-app-border px-4 py-3">
                <h2 className="text-base font-semibold">
                  Letzte Trainings
                </h2>

                <p className="mt-0.5 text-[11px] text-app-faint">
                  Deine letzten Trainingsrückmeldungen
                </p>
              </div>

              {recentFeedback.length ===
              0 ? (
                <div className="px-4 py-5 text-sm text-app-faint">
                  Noch keine Trainingsrückmeldungen vorhanden.
                </div>
              ) : (
                <>
                  {/* DESKTOP */}

                  <div className="hidden sm:block">
                    <div className="grid grid-cols-[85px_minmax(180px,1fr)_100px_80px_70px] gap-3 border-b border-app-border bg-app-bg/40 px-4 py-2 text-[10px] uppercase tracking-wide text-app-faint">
                      <div>
                        Datum
                      </div>

                      <div>
                        Training
                      </div>

                      <div>
                        Umfang
                      </div>

                      <div>
                        Dauer
                      </div>

                      <div>
                        RPE
                      </div>
                    </div>

                    <div className="divide-y divide-app-border">
                      {recentFeedback.map(
                        ({
                          feedback,
                          training,
                        }) => (
                          <div
                            key={
                              feedback.id
                            }
                            className="grid grid-cols-[85px_minmax(180px,1fr)_100px_80px_70px] items-center gap-3 px-4 py-2.5 transition hover:bg-app-elevated/30"
                          >
                            <div className="text-xs text-app-faint">
                              {training
                                ? formatCompactDate(
                                    training.session_date
                                  )
                                : "—"}
                            </div>

                            <div className="min-w-0">
                              {training ? (
                                <Link
                                  href={`/athlete/feedback/${training.id}`}
                                  className="block truncate text-sm font-medium text-app-text transition hover:text-app-heading"
                                >
                                  {
                                    training.title
                                  }
                                </Link>
                              ) : (
                                <p className="truncate text-sm text-app-text">
                                  Training
                                </p>
                              )}
                            </div>

                            <div className="text-xs text-app-muted">
                              {training?.training_type ===
                                "water" &&
                              training.total_meters !==
                                null
                                ? `${training.total_meters.toLocaleString(
                                    "de-DE"
                                  )} m`
                                : training?.training_type ===
                                  "land"
                                ? "Land"
                                : "—"}
                            </div>

                            <div className="text-xs text-app-muted">
                              {training?.duration_minutes !==
                                null &&
                              training?.duration_minutes !==
                                undefined
                                ? `${training.duration_minutes} min`
                                : "—"}
                            </div>

                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-semibold text-app-warn">
                                {
                                  feedback.rpe
                                }
                              </span>

                              <span className="text-[10px] text-app-faint">
                                / 10
                              </span>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* MOBILE */}

                  <div className="divide-y divide-app-border sm:hidden">
                    {recentFeedback.map(
                      ({
                        feedback,
                        training,
                      }) => (
                        <Link
                          key={
                            feedback.id
                          }
                          href={
                            training
                              ? `/athlete/feedback/${training.id}`
                              : "#"
                          }
                          className="block px-4 py-3 transition hover:bg-app-elevated/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] text-app-faint">
                                {training
                                  ? formatCompactDate(
                                      training.session_date
                                    )
                                  : "—"}
                              </p>

                              <p className="mt-0.5 truncate text-sm font-medium">
                                {training?.title ??
                                  "Training"}
                              </p>
                            </div>

                            <div className="shrink-0">
                              <span className="text-sm font-semibold text-app-warn">
                                {
                                  feedback.rpe
                                }
                              </span>

                              <span className="ml-1 text-[10px] text-app-faint">
                                / 10
                              </span>
                            </div>
                          </div>

                          <div className="mt-1.5 flex gap-3 text-[11px] text-app-faint">
                            <span>
                              {training?.training_type ===
                                "water" &&
                              training.total_meters !==
                                null
                                ? `${training.total_meters.toLocaleString(
                                    "de-DE"
                                  )} m`
                                : training?.training_type ===
                                  "land"
                                ? "Land"
                                : "—"}
                            </span>

                            <span>
                              {training?.duration_minutes !==
                                null &&
                              training?.duration_minutes !==
                                undefined
                                ? `${training.duration_minutes} min`
                                : "—"}
                            </span>
                          </div>
                        </Link>
                      )
                    )}
                  </div>
                </>
              )}
            </section>

            {/* Kapitel 1.3 */}
            <TrainingEffectCards />
          </>
        )}
      </div>
    </main>
  );
}

function DayCard({
  day,
}: {
  day: WeekDay;
}) {
  function getStatusStyle() {
    if (
      day.status ===
      "complete"
    ) {
      return {
        card:
          "border-app-good/60 bg-app-good/15",
        circle:
          "bg-app-good/15 text-app-good",
        symbol:
          "✓",
      };
    }

    if (
      day.status ===
      "pending"
    ) {
      return {
        card:
          "border-app-warn/50 bg-app-bg",
        circle:
          "bg-app-warn/15 text-app-warn",
        symbol:
          "•",
      };
    }

    if (
      day.status ===
      "missed"
    ) {
      return {
        card:
          "border-app-bad/50 bg-app-bad/10",
        circle:
          "bg-app-bad/10 text-app-bad",
        symbol:
          "×",
      };
    }

    if (
      day.status ===
      "future"
    ) {
      return {
        card:
          "border-app-border bg-app-bg",
        circle:
          "border border-app-border text-app-faint",
        symbol:
          "•",
      };
    }

    return {
      card:
        "border-app-border bg-app-bg/40",
      circle:
        "bg-app-elevated text-app-faint",
      symbol:
        "–",
    };
  }

  const style =
    getStatusStyle();

  return (
    <div
      className={`relative flex min-w-0 flex-col items-center rounded-lg border px-1 py-2 text-center ${style.card}`}
    >
      {day.isToday && (
        <span className="absolute -top-1.5 rounded-full bg-app-accent px-1.5 py-0.5 text-[7px] font-bold text-app-accent-ink">
          HEUTE
        </span>
      )}

      <p className="mt-0.5 text-[8px] uppercase tracking-wide text-app-faint">
        {day.weekday.replace(
          ".",
          ""
        )}
      </p>

      <p className="mt-0.5 text-xs font-semibold">
        {day.dayNumber}
      </p>

      <div
        className={`mt-1.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${style.circle}`}
      >
        {style.symbol}
      </div>

      {day.trainings.length >
        0 && (
        <p className="mt-1 text-[8px] text-app-faint">
          {day.trainings.length}x
        </p>
      )}
    </div>
  );
}