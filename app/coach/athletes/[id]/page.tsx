"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import LoadStrainPanel from "@/components/LoadStrainPanel";
import GrowthPanel from "@/components/GrowthPanel";

type AthleteProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: "athlete";
  created_at: string;
};

type Team = {
  id: string;
  name: string;
};

type TeamMember = {
  team_id: string;
  athlete_id: string;
};

type BefindenEntry = {
  id: string;
  athlete_id: string;
  entry_date: string;
  sleep_quality: number;
  energy: number;
  muscle_feeling: number;
  stress: number;
  mood: number;
  sleep_hours: number | null;
  has_pain: boolean;
  pain_area: string | null;
  comment: string | null;
  created_at: string;
};

type TrainingFeedback = {
  id: string;
  training_session_id: string;
  athlete_id: string;
  rpe: number;
  comment: string | null;
  completed: boolean;
  created_at: string;
};

type TrainingSession = {
  id: string;
  title: string;
  session_date: string;
  start_time: string | null;
  training_type: "water" | "land";
  duration_minutes: number | null;
  total_meters: number | null;
  focus: string | null;
};

type FeedbackWithTraining = {
  feedback: TrainingFeedback;
  training: TrainingSession | null;
};

type TrainingChartMetric =
  | "rpe"
  | "meters"
  | "duration";

type BefindenChartMetric =
  | "overall"
  | "sleep"
  | "energy"
  | "muscles"
  | "stress"
  | "mood";

type ChartPoint = {
  id: string;
  date: string;
  title: string;
  value: number;
};

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

function getTrainingMetricTitle(
  metric: TrainingChartMetric
) {
  if (metric === "rpe") {
    return "Persönliche RPE";
  }

  if (metric === "meters") {
    return "Trainingsumfang";
  }

  return "Trainingsdauer";
}

function getBefindenMetricTitle(
  metric: BefindenChartMetric
) {
  if (metric === "overall") {
    return "Tagesstatus";
  }

  if (metric === "sleep") {
    return "Schlafqualität";
  }

  if (metric === "energy") {
    return "Energie";
  }

  if (metric === "muscles") {
    return "Muskelgefühl";
  }

  if (metric === "stress") {
    return "Stress";
  }

  return "Stimmung";
}

function LineChart({
  points,
  minValue,
  maxValue,
  ariaLabel,
  highlight = false,
}: {
  points: ChartPoint[];
  minValue: number;
  maxValue: number;
  ariaLabel: string;
  highlight?: boolean;
}) {
  const width = 900;
  const height = 240;

  const padding = {
    top: 18,
    right: 20,
    bottom: 42,
    left: 52,
  };

  const chartWidth =
    width -
    padding.left -
    padding.right;

  const chartHeight =
    height -
    padding.top -
    padding.bottom;

  if (points.length === 0) {
    return (
      <div className="flex min-h-[190px] items-center justify-center rounded-xl border border-app-border bg-app-bg/40 px-4 text-center text-sm text-app-faint">
        Noch keine Daten für diesen Verlauf vorhanden.
      </div>
    );
  }

  const range =
    maxValue -
      minValue ||
    1;

  function getX(
    index: number
  ) {
    if (points.length === 1) {
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
    return (
      padding.top +
      chartHeight -
      ((value -
        minValue) /
        range) *
        chartHeight
    );
  }

  const linePoints =
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

  const ticks =
    minValue === 1 &&
    maxValue === 10
      ? [1, 3, 5, 7, 10]
      : Array.from(
          {
            length: 5,
          },
          (
            _,
            index
          ) =>
            Math.round(
              minValue +
                ((maxValue -
                  minValue) /
                  4) *
                  index
            )
        );

  const labelStep =
    Math.max(
      1,
      Math.ceil(
        points.length /
          6
      )
    );

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[620px] w-full"
        role="img"
        aria-label={
          ariaLabel
        }
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
                    10
                  }
                  y={y + 4}
                  textAnchor="end"
                  className="fill-app-faint text-[11px]"
                >
                  {tick.toLocaleString(
                    "de-DE"
                  )}
                </text>
              </g>
            );
          }
        )}

        {points.length >
          1 && (
          <polyline
            points={
              linePoints
            }
            fill="none"
            stroke="currentColor"
            className="text-app-text"
            strokeWidth="2.25"
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
                  r="4"
                  fill="currentColor"
                  className={
                    highlight
                      ? "text-app-warn"
                      : "text-app-text"
                  }
                />

                <title>
                  {`${formatDate(
                    point.date
                  )} · ${
                    point.title
                  } · ${point.value.toLocaleString(
                    "de-DE",
                    {
                      minimumFractionDigits:
                        1,
                      maximumFractionDigits:
                        1,
                    }
                  )}`}
                </title>

                {showLabel && (
                  <text
                    x={x}
                    y={
                      height -
                      14
                    }
                    textAnchor="middle"
                    className="fill-app-faint text-[11px]"
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

export default function CoachAthleteProfilePage() {
  const params =
    useParams();

  const athleteId =
    params.id as string;

  const [
    athlete,
    setAthlete,
  ] =
    useState<AthleteProfile | null>(
      null
    );

  const [
    teams,
    setTeams,
  ] =
    useState<Team[]>(
      []
    );

  const [
    befindenEntries,
    setBefindenEntries,
  ] =
    useState<
      BefindenEntry[]
    >([]);

  const [
    trainingFeedback,
    setTrainingFeedback,
  ] =
    useState<
      TrainingFeedback[]
    >([]);

  const [
    trainingSessions,
    setTrainingSessions,
  ] =
    useState<
      TrainingSession[]
    >([]);

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

  const [
    trainingChartMetric,
    setTrainingChartMetric,
  ] =
    useState<TrainingChartMetric>(
      "rpe"
    );

  const [
    befindenChartMetric,
    setBefindenChartMetric,
  ] =
    useState<BefindenChartMetric>(
      "overall"
    );

  async function loadAthlete() {
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
        "Benutzer konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    const {
      data: coachTeams,
      error: teamsError,
    } = await supabase
      .from("teams")
      .select("id, name")
      .eq(
        "coach_id",
        user.id
      );

    if (teamsError) {
      setMessage(
        `Teams konnten nicht geladen werden: ${teamsError.message}`
      );

      setLoading(false);
      return;
    }

    const teamList =
      coachTeams ?? [];

    if (
      teamList.length ===
      0
    ) {
      setMessage(
        "Du hast noch keine Teams."
      );

      setLoading(false);
      return;
    }

    const teamIds =
      teamList.map(
        (team) =>
          team.id
      );

    const {
      data: memberships,
      error:
        membershipError,
    } = await supabase
      .from(
        "team_members"
      )
      .select(
        "team_id, athlete_id"
      )
      .eq(
        "athlete_id",
        athleteId
      )
      .in(
        "team_id",
        teamIds
      );

    if (
      membershipError
    ) {
      setMessage(
        `Teamzuordnung konnte nicht geprüft werden: ${membershipError.message}`
      );

      setLoading(false);
      return;
    }

    const athleteMemberships =
      (memberships ??
        []) as TeamMember[];

    if (
      athleteMemberships.length ===
      0
    ) {
      setMessage(
        "Du hast keinen Zugriff auf diesen Athleten."
      );

      setLoading(false);
      return;
    }

    const {
      data: athleteData,
      error: athleteError,
    } = await supabase
      .from("profiles")
      .select(
        "id, first_name, last_name, role, created_at"
      )
      .eq(
        "id",
        athleteId
      )
      .eq(
        "role",
        "athlete"
      )
      .single();

    if (
      athleteError ||
      !athleteData
    ) {
      setMessage(
        "Athletenprofil konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    const assignedTeamIds =
      athleteMemberships.map(
        (
          membership
        ) =>
          membership.team_id
      );

    const assignedTeams =
      teamList.filter(
        (team) =>
          assignedTeamIds.includes(
            team.id
          )
      );

    const {
      data: befindenData,
      error: befindenError,
    } = await supabase
      .from(
        "befinden_entries"
      )
      .select(`
        id,
        athlete_id,
        entry_date,
        sleep_quality,
        energy,
        muscle_feeling,
        stress,
        mood,
        sleep_hours,
        has_pain,
        pain_area,
        comment,
        created_at
      `)
      .eq(
        "athlete_id",
        athleteId
      )
      .order(
        "entry_date",
        {
          ascending:
            false,
        }
      )
      .limit(14);

    if (befindenError) {
      setMessage(
        `Befinden konnte nicht geladen werden: ${befindenError.message}`
      );

      setLoading(false);
      return;
    }

    const {
      data: feedbackData,
      error: feedbackError,
    } = await supabase
      .from(
        "training_feedback"
      )
      .select(`
        id,
        training_session_id,
        athlete_id,
        rpe,
        comment,
        completed,
        created_at
      `)
      .eq(
        "athlete_id",
        athleteId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

    if (feedbackError) {
      setMessage(
        `Trainingsrückmeldungen konnten nicht geladen werden: ${feedbackError.message}`
      );

      setLoading(false);
      return;
    }

    const loadedFeedback =
      (feedbackData ??
        []) as TrainingFeedback[];

    let loadedTrainingSessions: TrainingSession[] =
      [];

    if (
      loadedFeedback.length >
      0
    ) {
      const trainingIds =
        [
          ...new Set(
            loadedFeedback.map(
              (
                feedback
              ) =>
                feedback.training_session_id
            )
          ),
        ];

      const {
        data:
          sessionData,
        error:
          sessionError,
      } = await supabase
        .from(
          "training_sessions"
        )
        .select(`
          id,
          title,
          session_date,
          start_time,
          training_type,
          duration_minutes,
          total_meters,
          focus
        `)
        .in(
          "id",
          trainingIds
        );

      if (sessionError) {
        setMessage(
          `Trainingsdaten konnten nicht geladen werden: ${sessionError.message}`
        );

        setLoading(false);
        return;
      }

      loadedTrainingSessions =
        (sessionData ??
          []) as TrainingSession[];
    }

    setAthlete(
      athleteData as AthleteProfile
    );

    setTeams(
      assignedTeams
    );

    setBefindenEntries(
      (befindenData ??
        []) as BefindenEntry[]
    );

    setTrainingFeedback(
      loadedFeedback
    );

    setTrainingSessions(
      loadedTrainingSessions
    );

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadAthlete();
  }, [athleteId]);

  const fullName =
    athlete
      ? [
          athlete.first_name,
          athlete.last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        "Athlet"
      : "";

  const latestEntry =
    befindenEntries[0] ??
    null;

  const latestScore =
    useMemo(() => {
      if (
        !latestEntry
      ) {
        return null;
      }

      return (
        (latestEntry.sleep_quality +
          latestEntry.energy +
          latestEntry.muscle_feeling +
          latestEntry.stress +
          latestEntry.mood) /
        5
      );
    }, [latestEntry]);

  const feedbackWithTraining =
    useMemo<
      FeedbackWithTraining[]
    >(() => {
      const combined =
        trainingFeedback.map(
          (
            feedback
          ) => ({
            feedback,
            training:
              trainingSessions.find(
                (
                  training
                ) =>
                  training.id ===
                  feedback.training_session_id
              ) ??
              null,
          })
        );

      return combined.sort(
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
      trainingFeedback,
      trainingSessions,
    ]);

  const averageRpe =
    useMemo(() => {
      if (
        trainingFeedback.length ===
        0
      ) {
        return null;
      }

      const total =
        trainingFeedback.reduce(
          (
            sum,
            feedback
          ) =>
            sum +
            feedback.rpe,
          0
        );

      return (
        total /
        trainingFeedback.length
      );
    }, [trainingFeedback]);

  const completedTrainings =
    trainingFeedback.filter(
      (
        feedback
      ) =>
        feedback.completed
    ).length;

  const befindenChartPoints =
    useMemo<
      ChartPoint[]
    >(() => {
      return [
        ...befindenEntries,
      ]
        .sort(
          (
            a,
            b
          ) =>
            a.entry_date.localeCompare(
              b.entry_date
            )
        )
        .map(
          (entry) => {
            let value = 0;

            if (
              befindenChartMetric ===
              "overall"
            ) {
              value =
                (entry.sleep_quality +
                  entry.energy +
                  entry.muscle_feeling +
                  entry.stress +
                  entry.mood) /
                5;
            }

            if (
              befindenChartMetric ===
              "sleep"
            ) {
              value =
                entry.sleep_quality;
            }

            if (
              befindenChartMetric ===
              "energy"
            ) {
              value =
                entry.energy;
            }

            if (
              befindenChartMetric ===
              "muscles"
            ) {
              value =
                entry.muscle_feeling;
            }

            if (
              befindenChartMetric ===
              "stress"
            ) {
              value =
                entry.stress;
            }

            if (
              befindenChartMetric ===
              "mood"
            ) {
              value =
                entry.mood;
            }

            return {
              id:
                entry.id,
              date:
                entry.entry_date,
              title:
                getBefindenMetricTitle(
                  befindenChartMetric
                ),
              value,
            };
          }
        );
    }, [
      befindenEntries,
      befindenChartMetric,
    ]);

  const trainingChartPoints =
    useMemo<
      ChartPoint[]
    >(() => {
      return [
        ...feedbackWithTraining,
      ]
        .filter(
          (
            entry
          ) =>
            entry.training !==
            null
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
        .flatMap(
          (
            entry
          ) => {
            const training =
              entry.training;

            if (!training) {
              return [];
            }

            let value:
              | number
              | null =
              null;

            if (
              trainingChartMetric ===
              "rpe"
            ) {
              value =
                entry.feedback.rpe;
            }

            if (
              trainingChartMetric ===
              "meters"
            ) {
              value =
                training.total_meters;
            }

            if (
              trainingChartMetric ===
              "duration"
            ) {
              value =
                training.duration_minutes;
            }

            if (
              value ===
              null
            ) {
              return [];
            }

            return [
              {
                id:
                  entry.feedback.id,
                date:
                  training.session_date,
                title:
                  training.title,
                value,
              },
            ];
          }
        );
    }, [
      feedbackWithTraining,
      trainingChartMetric,
    ]);

  const trainingChartMax =
    useMemo(() => {
      if (
        trainingChartMetric ===
        "rpe"
      ) {
        return 10;
      }

      const highest =
        Math.max(
          0,
          ...trainingChartPoints.map(
            (
              point
            ) =>
              point.value
          )
        );

      return highest > 0
        ? Math.ceil(
            highest *
              1.1
          )
        : 1;
    }, [
      trainingChartPoints,
      trainingChartMetric,
    ]);

  function getStatus(
    score: number | null
  ) {
    if (
      score === null
    ) {
      return {
        label:
          "Keine Daten",
        className:
          "border-app-border bg-app-surface text-app-muted",
      };
    }

    if (
      score >= 8
    ) {
      return {
        label: "Gut",
        className:
          "border-app-good/60 bg-app-good/10 text-app-good",
      };
    }

    if (
      score >= 6
    ) {
      return {
        label:
          "Beobachten",
        className:
          "border-app-warn/60 bg-app-warn/20 text-app-warn",
      };
    }

    return {
      label:
        "Auffällig",
      className:
        "border-app-bad/60 bg-app-bad/20 text-app-bad",
    };
  }

  function getRpeStyle(
    rpe: number
  ) {
    if (
      rpe <= 4
    ) {
      return "text-app-text";
    }

    if (
      rpe <= 7
    ) {
      return "text-app-warn";
    }

    return "text-app-warn";
  }

  const currentStatus =
    getStatus(
      latestScore
    );

  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <Link
        href="/coach/athletes"
        className="text-xs text-app-faint transition hover:text-app-heading"
      >
        ← Zurück zu Athleten
      </Link>

      {loading ? (
        <div className="mt-4 rounded-xl border border-app-border bg-app-surface p-5 text-sm text-app-muted">
          Athletenprofil wird geladen...
        </div>
      ) : message ? (
        <div className="mt-4 rounded-xl border border-app-bad/40 bg-app-bad/10 p-5 text-sm text-app-bad">
          {
            message
          }
        </div>
      ) : athlete ? (
        <>
          {/* HEADER */}

          <header className="mt-4">
            <p className="text-xs text-app-faint">
              Athletenprofil
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {
                  fullName
                }
              </h1>

              <span
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${currentStatus.className}`}
              >
                {
                  currentStatus.label
                }
              </span>
            </div>

            <p className="mt-1.5 text-sm text-app-muted">
              Befinden und Trainingsdaten im Überblick.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-app-faint">
                Teams:
              </span>

              {teams.map(
                (
                  team
                ) => (
                  <span
                    key={
                      team.id
                    }
                    className="rounded-full border border-app-border bg-app-surface px-2.5 py-1 text-xs text-app-text"
                  >
                    {
                      team.name
                    }
                  </span>
                )
              )}
            </div>
          </header>

          {/* KPIS */}

          <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
              <p className="text-xs text-app-faint">
                Teams
              </p>

              <p className="mt-1 text-2xl font-bold">
                {
                  teams.length
                }
              </p>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
              <p className="text-xs text-app-faint">
                Aktuelles Befinden
              </p>

              <div className="mt-1 flex items-baseline gap-1">
                <p className="text-2xl font-bold">
                  {latestScore !==
                  null
                    ? latestScore.toLocaleString(
                        "de-DE",
                        {
                          minimumFractionDigits:
                            1,
                          maximumFractionDigits:
                            1,
                        }
                      )
                    : "—"}
                </p>

                {latestScore !==
                  null && (
                  <span className="text-xs text-app-faint">
                    / 10
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
              <p className="text-xs text-app-faint">
                Ø RPE
              </p>

              <div className="mt-1 flex items-baseline gap-1">
                <p className="text-2xl font-bold text-app-warn">
                  {averageRpe !==
                  null
                    ? averageRpe.toLocaleString(
                        "de-DE",
                        {
                          minimumFractionDigits:
                            1,
                          maximumFractionDigits:
                            1,
                        }
                      )
                    : "—"}
                </p>

                {averageRpe !==
                  null && (
                  <span className="text-xs text-app-faint">
                    / 10
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
              <p className="text-xs text-app-faint">
                Trainingsfeedback
              </p>

              <p className="mt-1 text-2xl font-bold">
                {
                  trainingFeedback.length
                }
              </p>
            </div>
          </section>

          {/* AKTUELLES BEFINDEN */}

          <section className="mt-4 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
            <div className="flex flex-col gap-2 border-b border-app-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Aktuelles Befinden
                </h2>

                <p className="mt-0.5 text-xs text-app-faint">
                  Letzter gespeicherter Check-in
                </p>
              </div>

              {latestEntry && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-app-faint">
                    {formatDate(
                      latestEntry.entry_date
                    )}
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${currentStatus.className}`}
                  >
                    {
                      currentStatus.label
                    }
                  </span>
                </div>
              )}
            </div>

            {!latestEntry ? (
              <div className="px-5 py-6 text-sm text-app-faint">
                Noch kein Befinden eingetragen.
              </div>
            ) : (
              <div className="p-4 sm:p-5">
                <div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
                  <div>
                    <p className="text-[11px] text-app-faint">
                      Schlafqualität
                    </p>

                    <p className="mt-0.5 text-sm font-semibold">
                      {
                        latestEntry.sleep_quality
                      }{" "}
                      / 10
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-app-faint">
                      Energie
                    </p>

                    <p className="mt-0.5 text-sm font-semibold">
                      {
                        latestEntry.energy
                      }{" "}
                      / 10
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-app-faint">
                      Muskelgefühl
                    </p>

                    <p className="mt-0.5 text-sm font-semibold">
                      {
                        latestEntry.muscle_feeling
                      }{" "}
                      / 10
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-app-faint">
                      Stress
                    </p>

                    <p className="mt-0.5 text-sm font-semibold">
                      {
                        latestEntry.stress
                      }{" "}
                      / 10
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-app-faint">
                      Stimmung
                    </p>

                    <p className="mt-0.5 text-sm font-semibold">
                      {
                        latestEntry.mood
                      }{" "}
                      / 10
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 border-t border-app-border pt-3 text-sm md:grid-cols-3">
                  <p>
                    <span className="text-app-faint">
                      Schlafdauer:
                    </span>{" "}
                    <span className="text-app-text">
                      {latestEntry.sleep_hours !==
                      null
                        ? `${latestEntry.sleep_hours.toLocaleString(
                            "de-DE"
                          )} Std.`
                        : "Nicht angegeben"}
                    </span>
                  </p>

                  <p>
                    <span className="text-app-faint">
                      Beschwerden:
                    </span>{" "}
                    <span className="text-app-text">
                      {latestEntry.has_pain
                        ? latestEntry.pain_area ||
                          "Ja"
                        : "Nein"}
                    </span>
                  </p>

                  <p className="min-w-0">
                    <span className="text-app-faint">
                      Kommentar:
                    </span>{" "}
                    <span className="text-app-text">
                      {latestEntry.comment ||
                        "Kein Kommentar"}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* BEFINDEN IM VERLAUF */}

          <section className="mt-4 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
            <div className="flex flex-col gap-3 border-b border-app-border px-4 py-3.5 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Befinden im Verlauf
                </h2>

                <p className="mt-0.5 text-xs text-app-faint">
                  {
                    getBefindenMetricTitle(
                      befindenChartMetric
                    )
                  }{" "}
                  der letzten Einträge
                </p>
              </div>

              <div className="flex max-w-full gap-1 overflow-x-auto rounded-lg border border-app-border bg-app-bg p-1">
                {[
                  {
                    value:
                      "overall" as const,
                    label:
                      "Gesamt",
                  },
                  {
                    value:
                      "sleep" as const,
                    label:
                      "Schlaf",
                  },
                  {
                    value:
                      "energy" as const,
                    label:
                      "Energie",
                  },
                  {
                    value:
                      "muscles" as const,
                    label:
                      "Muskeln",
                  },
                  {
                    value:
                      "stress" as const,
                    label:
                      "Stress",
                  },
                  {
                    value:
                      "mood" as const,
                    label:
                      "Stimmung",
                  },
                ].map(
                  (
                    option
                  ) => (
                    <button
                      key={
                        option.value
                      }
                      type="button"
                      onClick={() =>
                        setBefindenChartMetric(
                          option.value
                        )
                      }
                      className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs transition ${
                        befindenChartMetric ===
                        option.value
                          ? "bg-app-accent font-medium text-app-accent-ink"
                          : "text-app-muted hover:text-app-heading"
                      }`}
                    >
                      {
                        option.label
                      }
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <LineChart
                points={
                  befindenChartPoints
                }
                minValue={1}
                maxValue={10}
                ariaLabel={`${getBefindenMetricTitle(
                  befindenChartMetric
                )} im Verlauf`}
              />
            </div>

            {befindenEntries.length >
              0 && (
              <div className="overflow-x-auto border-t border-app-border">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-app-bg/40 text-[11px] uppercase tracking-wide text-app-faint">
                    <tr>
                      <th className="px-4 py-2 font-medium">
                        Datum
                      </th>

                      <th className="px-4 py-2 font-medium">
                        Gesamt
                      </th>

                      <th className="px-4 py-2 font-medium">
                        Schlaf
                      </th>

                      <th className="px-4 py-2 font-medium">
                        Energie
                      </th>

                      <th className="px-4 py-2 font-medium">
                        Muskeln
                      </th>

                      <th className="px-4 py-2 font-medium">
                        Stress
                      </th>

                      <th className="px-4 py-2 font-medium">
                        Stimmung
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-app-border">
                    {befindenEntries.map(
                      (
                        entry
                      ) => {
                        const score =
                          (entry.sleep_quality +
                            entry.energy +
                            entry.muscle_feeling +
                            entry.stress +
                            entry.mood) /
                          5;

                        const status =
                          getStatus(
                            score
                          );

                        return (
                          <tr
                            key={
                              entry.id
                            }
                            className="text-sm transition hover:bg-app-elevated/30"
                          >
                            <td className="px-4 py-2.5 text-app-muted">
                              {formatCompactDate(
                                entry.entry_date
                              )}
                            </td>

                            <td className="px-4 py-2.5">
                              <span className="font-medium">
                                {score.toLocaleString(
                                  "de-DE",
                                  {
                                    minimumFractionDigits:
                                      1,
                                    maximumFractionDigits:
                                      1,
                                  }
                                )}
                              </span>

                              <span
                                className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] ${status.className}`}
                              >
                                {
                                  status.label
                                }
                              </span>
                            </td>

                            <td className="px-4 py-2.5">
                              {
                                entry.sleep_quality
                              }
                            </td>

                            <td className="px-4 py-2.5">
                              {
                                entry.energy
                              }
                            </td>

                            <td className="px-4 py-2.5">
                              {
                                entry.muscle_feeling
                              }
                            </td>

                            <td className="px-4 py-2.5">
                              {
                                entry.stress
                              }
                            </td>

                            <td className="px-4 py-2.5">
                              {
                                entry.mood
                              }
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

          {/* TRAINING */}

          <section className="mt-4 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
            <div className="flex flex-col gap-3 border-b border-app-border px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Training: Belastung ↔ Beanspruchung
                </h2>

                <p className="mt-0.5 text-xs text-app-faint">
                  Individueller Verlauf
                </p>
              </div>

              <div className="flex gap-2">
                <div className="rounded-lg border border-app-border bg-app-bg px-3 py-2">
                  <p className="text-[10px] text-app-faint">
                    Ø RPE
                  </p>

                  <p className="mt-0.5 text-sm font-semibold text-app-warn">
                    {averageRpe !==
                    null
                      ? averageRpe.toLocaleString(
                          "de-DE",
                          {
                            minimumFractionDigits:
                              1,
                            maximumFractionDigits:
                              1,
                          }
                        )
                      : "—"}
                  </p>
                </div>

                <div className="rounded-lg border border-app-border bg-app-bg px-3 py-2">
                  <p className="text-[10px] text-app-faint">
                    Rückmeldungen
                  </p>

                  <p className="mt-0.5 text-sm font-semibold">
                    {
                      trainingFeedback.length
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-app-faint">
                  {getTrainingMetricTitle(
                    trainingChartMetric
                  )}{" "}
                  im Verlauf
                </p>

                <div className="inline-flex w-full rounded-lg border border-app-border bg-app-bg p-1 md:w-auto">
                  <button
                    type="button"
                    onClick={() =>
                      setTrainingChartMetric(
                        "rpe"
                      )
                    }
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs transition md:flex-none ${
                      trainingChartMetric ===
                      "rpe"
                        ? "bg-app-accent font-medium text-app-accent-ink"
                        : "text-app-muted hover:text-app-heading"
                    }`}
                  >
                    RPE
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTrainingChartMetric(
                        "meters"
                      )
                    }
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs transition md:flex-none ${
                      trainingChartMetric ===
                      "meters"
                        ? "bg-app-accent font-medium text-app-accent-ink"
                        : "text-app-muted hover:text-app-heading"
                    }`}
                  >
                    Umfang
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setTrainingChartMetric(
                        "duration"
                      )
                    }
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs transition md:flex-none ${
                      trainingChartMetric ===
                      "duration"
                        ? "bg-app-accent font-medium text-app-accent-ink"
                        : "text-app-muted hover:text-app-heading"
                    }`}
                  >
                    Dauer
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <LineChart
                  points={
                    trainingChartPoints
                  }
                  minValue={
                    trainingChartMetric ===
                    "rpe"
                      ? 1
                      : 0
                  }
                  maxValue={
                    trainingChartMax
                  }
                  ariaLabel={`${getTrainingMetricTitle(
                    trainingChartMetric
                  )} im Verlauf`}
                  highlight={
                    trainingChartMetric ===
                    "rpe"
                  }
                />
              </div>

              <p className="mt-1 text-[11px] leading-4 text-app-faint">
                RPE beschreibt die subjektiv wahrgenommene Anstrengung. Umfang und Dauer stammen aus der jeweiligen Trainingseinheit.
              </p>
            </div>
          </section>

          {/* TRAININGSRÜCKMELDUNGEN */}

          <section className="mt-4 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3.5 sm:px-5">
              <div>
                <h2 className="text-lg font-semibold">
                  Trainingsrückmeldungen
                </h2>

                <p className="mt-0.5 text-xs text-app-faint">
                  Letzte Einheiten und persönliche RPE
                </p>
              </div>

              <p className="text-xs text-app-faint">
                {
                  completedTrainings
                }{" "}
                /{" "}
                {
                  trainingFeedback.length
                }{" "}
                fertig
              </p>
            </div>

            {feedbackWithTraining.length ===
            0 ? (
              <div className="px-5 py-6 text-sm text-app-faint">
                Noch keine Trainingsrückmeldung vorhanden.
              </div>
            ) : (
              <>
                {/* DESKTOP */}

                <div className="hidden md:block">
                  <div className="grid grid-cols-[100px_minmax(220px,1fr)_110px_90px_90px_100px_30px] gap-3 border-b border-app-border bg-app-bg/40 px-5 py-2 text-[11px] uppercase tracking-wide text-app-faint">
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

                    <div>
                      Status
                    </div>

                    <div />
                  </div>

                  <div className="divide-y divide-app-border">
                    {feedbackWithTraining.map(
                      ({
                        feedback,
                        training,
                      }) => (
                        <details
                          key={
                            feedback.id
                          }
                          className="group"
                        >
                          <summary className="grid cursor-pointer list-none grid-cols-[100px_minmax(220px,1fr)_110px_90px_90px_100px_30px] items-center gap-3 px-5 py-2.5 transition hover:bg-app-elevated/35">
                            <div className="text-xs text-app-muted">
                              {training
                                ? formatCompactDate(
                                    training.session_date
                                  )
                                : "—"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-app-heading">
                                {training?.title ??
                                  "Training"}
                              </p>
                            </div>

                            <div className="text-sm text-app-text">
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

                            <div className="text-sm text-app-text">
                              {training?.duration_minutes !==
                                null &&
                              training?.duration_minutes !==
                                undefined
                                ? `${training.duration_minutes} min`
                                : "—"}
                            </div>

                            <div className="flex items-baseline gap-1">
                              <span
                                className={`text-sm font-semibold ${getRpeStyle(
                                  feedback.rpe
                                )}`}
                              >
                                {
                                  feedback.rpe
                                }
                              </span>

                              <span className="text-xs text-app-faint">
                                / 10
                              </span>
                            </div>

                            <div>
                              <span className="text-xs text-app-muted">
                                {feedback.completed
                                  ? "✓ Fertig"
                                  : "Offen"}
                              </span>
                            </div>

                            <div className="text-center text-xs text-app-faint transition group-open:rotate-180">
                              ↓
                            </div>
                          </summary>

                          <div className="border-t border-app-border/70 bg-app-bg/35 px-5 py-3">
                            <div className="grid gap-4 text-sm lg:grid-cols-3">
                              <div>
                                <p className="text-[11px] text-app-faint">
                                  Trainingsart
                                </p>

                                <p className="mt-1 text-app-text">
                                  {training
                                    ? training.training_type ===
                                      "water"
                                      ? "Wasser"
                                      : "Land"
                                    : "—"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[11px] text-app-faint">
                                  Trainingsfokus
                                </p>

                                <p className="mt-1 text-app-text">
                                  {training?.focus ||
                                    "Kein Fokus angegeben"}
                                </p>
                              </div>

                              <div>
                                <p className="text-[11px] text-app-faint">
                                  Kommentar des Athleten
                                </p>

                                <p className="mt-1 text-app-text">
                                  {feedback.comment ||
                                    "Kein Kommentar"}
                                </p>
                              </div>
                            </div>
                          </div>
                        </details>
                      )
                    )}
                  </div>
                </div>

                {/* MOBILE */}

                <div className="divide-y divide-app-border md:hidden">
                  {feedbackWithTraining.map(
                    ({
                      feedback,
                      training,
                    }) => (
                      <details
                        key={
                          feedback.id
                        }
                        className="group"
                      >
                        <summary className="cursor-pointer list-none px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-app-faint">
                                {training
                                  ? formatCompactDate(
                                      training.session_date
                                    )
                                  : "—"}
                              </p>

                              <p className="mt-1 truncate text-sm font-semibold">
                                {training?.title ??
                                  "Training"}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className={`text-sm font-semibold ${getRpeStyle(
                                  feedback.rpe
                                )}`}
                              >
                                RPE{" "}
                                {
                                  feedback.rpe
                                }
                              </span>

                              <span className="text-xs text-app-faint transition group-open:rotate-180">
                                ↓
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-app-faint">
                                Umfang
                              </p>

                              <p className="mt-0.5 text-app-text">
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
                              </p>
                            </div>

                            <div>
                              <p className="text-app-faint">
                                Dauer
                              </p>

                              <p className="mt-0.5 text-app-text">
                                {training?.duration_minutes !==
                                  null &&
                                training?.duration_minutes !==
                                  undefined
                                  ? `${training.duration_minutes} min`
                                  : "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-app-faint">
                                Status
                              </p>

                              <p className="mt-0.5 text-app-text">
                                {feedback.completed
                                  ? "✓ Fertig"
                                  : "Offen"}
                              </p>
                            </div>
                          </div>
                        </summary>

                        <div className="border-t border-app-border/70 bg-app-bg/35 px-4 py-3 text-sm">
                          <div className="space-y-3">
                            <div>
                              <p className="text-[11px] text-app-faint">
                                Trainingsart
                              </p>

                              <p className="mt-0.5 text-app-text">
                                {training
                                  ? training.training_type ===
                                    "water"
                                    ? "Wasser"
                                    : "Land"
                                  : "—"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] text-app-faint">
                                Trainingsfokus
                              </p>

                              <p className="mt-0.5 text-app-text">
                                {training?.focus ||
                                  "Kein Fokus angegeben"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] text-app-faint">
                                Kommentar des Athleten
                              </p>

                              <p className="mt-0.5 text-app-text">
                                {feedback.comment ||
                                  "Kein Kommentar"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </details>
                    )
                  )}
                </div>
              </>
            )}
          </section>

          {/* Kapitel 1.1 */}
          <LoadStrainPanel
            athleteId={athleteId}
          />

          {/* Kapitel 1.6 */}
          <GrowthPanel
            athleteId={athleteId}
          />
        </>
      ) : null}
    </div>
  );
}