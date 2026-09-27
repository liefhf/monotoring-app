"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import LandCoveragePanel from "@/components/LandCoveragePanel";

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

type TeamMember = {
  team_id: string;
  athlete_id: string;
};

type TrainingFeedback = {
  training_session_id: string;
  athlete_id: string;
  rpe: number;
  completed: boolean;
};

type SessionOverview = {
  training: TrainingSession;
  teamName: string;
  athleteCount: number;
  feedbackCount: number;
  averageRpe: number | null;
};

type ChartMetric =
  | "rpe"
  | "meters"
  | "duration";

type ChartPoint = {
  id: string;
  date: string;
  label: string;
  value: number;
};

function formatDate(
  dateString: string
) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  return date.toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
}

function formatShortDate(
  dateString: string
) {
  const date = new Date(
    `${dateString}T12:00:00`
  );

  return date.toLocaleDateString(
    "de-DE",
    {
      day: "2-digit",
      month: "2-digit",
    }
  );
}

function getRpeText(
  rpe: number
) {
  if (rpe <= 2) {
    return "Sehr leicht";
  }

  if (rpe <= 4) {
    return "Leicht";
  }

  if (rpe <= 6) {
    return "Mittel";
  }

  if (rpe <= 8) {
    return "Anstrengend";
  }

  return "Sehr anstrengend";
}

function getMetricTitle(
  metric: ChartMetric
) {
  if (metric === "rpe") {
    return "Durchschnittliche RPE";
  }

  if (metric === "meters") {
    return "Trainingsumfang";
  }

  return "Trainingsdauer";
}

function formatMetricValue(
  metric: ChartMetric,
  value: number
) {
  if (metric === "rpe") {
    return value.toLocaleString(
      "de-DE",
      {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }
    );
  }

  if (metric === "meters") {
    return `${Math.round(
      value
    ).toLocaleString(
      "de-DE"
    )} m`;
  }

  return `${Math.round(
    value
  )} min`;
}

function TrendChart({
  points,
  metric,
}: {
  points: ChartPoint[];
  metric: ChartMetric;
}) {
  const width = 900;
  const height = 280;

  const padding = {
    top: 20,
    right: 20,
    bottom: 48,
    left: 56,
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
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-app-border bg-app-bg/50 px-4 text-center text-sm text-app-faint">
        Für diese Auswahl sind noch keine Daten für den Verlauf vorhanden.
      </div>
    );
  }

  let minValue = 0;
  let maxValue = 10;

  if (metric !== "rpe") {
    const values =
      points.map(
        (point) =>
          point.value
      );

    maxValue =
      Math.max(
        ...values
      );

    minValue = 0;

    if (maxValue <= 0) {
      maxValue = 1;
    }

    maxValue =
      Math.ceil(
        maxValue * 1.1
      );
  } else {
    minValue = 1;
    maxValue = 10;
  }

  const valueRange =
    maxValue - minValue || 1;

  const getX = (
    index: number
  ) => {
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
  };

  const getY = (
    value: number
  ) => {
    return (
      padding.top +
      chartHeight -
      ((value - minValue) /
        valueRange) *
        chartHeight
    );
  };

  const linePoints =
    points
      .map(
        (point, index) =>
          `${getX(
            index
          )},${getY(
            point.value
          )}`
      )
      .join(" ");

  const yTicks =
    metric === "rpe"
      ? [1, 3, 5, 7, 10]
      : Array.from(
          {
            length: 5,
          },
          (_, index) =>
            Math.round(
              (maxValue / 4) *
                index
            )
        );

  const maxLabels = 6;

  const labelStep =
    Math.max(
      1,
      Math.ceil(
        points.length /
          maxLabels
      )
    );

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[650px] w-full"
        role="img"
        aria-label={`${getMetricTitle(
          metric
        )} im Verlauf`}
      >
        {/* horizontale Hilfslinien */}

        {yTicks.map(
          (tick) => {
            const y =
              getY(
                tick
              );

            return (
              <g
                key={
                  tick
                }
              >
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
                    12
                  }
                  y={
                    y + 4
                  }
                  textAnchor="end"
                  className="fill-app-faint text-[11px]"
                >
                  {metric ===
                  "rpe"
                    ? tick
                    : tick.toLocaleString(
                        "de-DE"
                      )}
                </text>
              </g>
            );
          }
        )}

        {/* Verlaufslinie */}

        {points.length >
          1 && (
          <polyline
            points={
              linePoints
            }
            fill="none"
            stroke="currentColor"
            className="text-app-text"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Punkte */}

        {points.map(
          (
            point,
            index
          ) => {
            const x =
              getX(
                index
              );

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
                  r="4.5"
                  fill="currentColor"
                  className={
                    metric ===
                    "rpe"
                      ? "text-app-warn"
                      : "text-app-text"
                  }
                />

                <title>
                  {`${formatDate(
                    point.date
                  )} · ${
                    point.label
                  } · ${formatMetricValue(
                    metric,
                    point.value
                  )}`}
                </title>

                {showLabel && (
                  <text
                    x={x}
                    y={
                      height -
                      18
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

export default function CoachAnalyticsPage() {
  const [
    trainings,
    setTrainings,
  ] =
    useState<
      TrainingSession[]
    >([]);

  const [
    teams,
    setTeams,
  ] = useState<
    Team[]
  >([]);

  const [
    teamMembers,
    setTeamMembers,
  ] =
    useState<
      TeamMember[]
    >([]);

  const [
    feedback,
    setFeedback,
  ] =
    useState<
      TrainingFeedback[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    selectedTeam,
    setSelectedTeam,
  ] =
    useState(
      "all"
    );

  const [
    chartMetric,
    setChartMetric,
  ] =
    useState<ChartMetric>(
      "rpe"
    );

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(
      true
    );

    setMessage("");

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setMessage(
        "Coach konnte nicht geladen werden."
      );

      setLoading(
        false
      );

      return;
    }

    /*
      1. Eigene Teams laden
    */
    const {
      data: teamData,
      error:
        teamError,
    } =
      await supabase
        .from(
          "teams"
        )
        .select(`
          id,
          name
        `)
        .eq(
          "coach_id",
          user.id
        )
        .order(
          "name"
        );

    if (
      teamError
    ) {
      setMessage(
        `Teams konnten nicht geladen werden: ${teamError.message}`
      );

      setLoading(
        false
      );

      return;
    }

    const ownTeams =
      (teamData ??
        []) as Team[];

    setTeams(
      ownTeams
    );

    const teamIds =
      ownTeams.map(
        (team) =>
          team.id
      );

    if (
      teamIds.length ===
      0
    ) {
      setTrainings(
        []
      );

      setTeamMembers(
        []
      );

      setFeedback(
        []
      );

      setLoading(
        false
      );

      return;
    }

    /*
      2. Trainingseinheiten laden
    */
    const {
      data:
        trainingData,
      error:
        trainingError,
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
          duration_minutes,
          training_type,
          total_meters,
          focus
        `)
        .eq(
          "coach_id",
          user.id
        )
        .order(
          "session_date",
          {
            ascending:
              false,
          }
        )
        .order(
          "start_time",
          {
            ascending:
              false,
          }
        );

    if (
      trainingError
    ) {
      setMessage(
        `Trainings konnten nicht geladen werden: ${trainingError.message}`
      );

      setLoading(
        false
      );

      return;
    }

    const ownTrainings =
      (trainingData ??
        []) as TrainingSession[];

    setTrainings(
      ownTrainings
    );

    /*
      3. Teammitglieder laden
    */
    const {
      data:
        memberData,
      error:
        memberError,
    } =
      await supabase
        .from(
          "team_members"
        )
        .select(`
          team_id,
          athlete_id
        `)
        .in(
          "team_id",
          teamIds
        );

    if (
      memberError
    ) {
      setMessage(
        `Teammitglieder konnten nicht geladen werden: ${memberError.message}`
      );

      setLoading(
        false
      );

      return;
    }

    const ownMembers =
      (memberData ??
        []) as TeamMember[];

    setTeamMembers(
      ownMembers
    );

    /*
      4. Feedback laden
    */
    const trainingIds =
      ownTrainings.map(
        (
          training
        ) =>
          training.id
      );

    if (
      trainingIds.length ===
      0
    ) {
      setFeedback(
        []
      );

      setLoading(
        false
      );

      return;
    }

    const {
      data:
        feedbackData,
      error:
        feedbackError,
    } =
      await supabase
        .from(
          "training_feedback"
        )
        .select(`
          training_session_id,
          athlete_id,
          rpe,
          completed
        `)
        .in(
          "training_session_id",
          trainingIds
        );

    if (
      feedbackError
    ) {
      setMessage(
        `Rückmeldungen konnten nicht geladen werden: ${feedbackError.message}`
      );

      setLoading(
        false
      );

      return;
    }

    setFeedback(
      (feedbackData ??
        []) as TrainingFeedback[]
    );

    setLoading(
      false
    );
  }

  /*
    Training + Team + Feedback
    zusammenführen
  */
  const sessionOverview =
    useMemo<
      SessionOverview[]
    >(
      () => {
        return trainings.map(
          (
            training
          ) => {
            const teamName =
              teams.find(
                (
                  team
                ) =>
                  team.id ===
                  training.team_id
              )
                ?.name ??
              "Unbekanntes Team";

            const membersOfTeam =
              teamMembers.filter(
                (
                  member
                ) =>
                  member.team_id ===
                  training.team_id
              );

            const feedbackOfTraining =
              feedback.filter(
                (
                  entry
                ) =>
                  entry.training_session_id ===
                    training.id &&
                  entry.completed
              );

            const averageRpe =
              feedbackOfTraining.length >
              0
                ? feedbackOfTraining.reduce(
                    (
                      total,
                      entry
                    ) =>
                      total +
                      entry.rpe,
                    0
                  ) /
                  feedbackOfTraining.length
                : null;

            return {
              training,
              teamName,
              athleteCount:
                membersOfTeam.length,
              feedbackCount:
                feedbackOfTraining.length,
              averageRpe,
            };
          }
        );
      },
      [
        trainings,
        teams,
        teamMembers,
        feedback,
      ]
    );

  /*
    Teamfilter
  */
  const filteredSessions =
    useMemo(
      () => {
        if (
          selectedTeam ===
          "all"
        ) {
          return sessionOverview;
        }

        return sessionOverview.filter(
          (
            session
          ) =>
            session.training.team_id ===
            selectedTeam
        );
      },
      [
        sessionOverview,
        selectedTeam,
      ]
    );

  const sessionsWithFeedback =
    filteredSessions.filter(
      (
        session
      ) =>
        session.averageRpe !==
        null
    );

  /*
    KPI:
    Durchschnitt der
    Einheiten-Durchschnitte
  */
  const overallAverageRpe =
    useMemo(
      () => {
        if (
          sessionsWithFeedback.length ===
          0
        ) {
          return null;
        }

        const total =
          sessionsWithFeedback.reduce(
            (
              sum,
              session
            ) =>
              sum +
              (session.averageRpe ??
                0),
            0
          );

        return (
          total /
          sessionsWithFeedback.length
        );
      },
      [
        sessionsWithFeedback,
      ]
    );

  const totalFeedbackCount =
    filteredSessions.reduce(
      (
        total,
        session
      ) =>
        total +
        session.feedbackCount,
      0
    );

  const totalPossibleFeedback =
    filteredSessions.reduce(
      (
        total,
        session
      ) =>
        total +
        session.athleteCount,
      0
    );

  /*
    Diagrammdaten

    Für den Verlauf werden
    die Einheiten chronologisch
    sortiert.
  */
  const chartPoints =
    useMemo<
      ChartPoint[]
    >(
      () => {
        const chronological =
          [
            ...filteredSessions,
          ].sort(
            (
              a,
              b
            ) => {
              const dateCompare =
                a.training.session_date.localeCompare(
                  b.training.session_date
                );

              if (
                dateCompare !==
                0
              ) {
                return dateCompare;
              }

              return (
                a.training.start_time ??
                ""
              ).localeCompare(
                b.training.start_time ??
                  ""
              );
            }
          );

        return chronological.flatMap(
          (
            session
          ) => {
            let value:
              | number
              | null =
              null;

            if (
              chartMetric ===
              "rpe"
            ) {
              value =
                session.averageRpe;
            }

            if (
              chartMetric ===
              "meters"
            ) {
              value =
                session.training.total_meters;
            }

            if (
              chartMetric ===
              "duration"
            ) {
              value =
                session.training.duration_minutes;
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
                  session.training.id,
                date:
                  session.training.session_date,
                label:
                  session.training.title,
                value,
              },
            ];
          }
        );
      },
      [
        filteredSessions,
        chartMetric,
      ]
    );

  if (
    loading
  ) {
    return (
      <main>
        <div className="mx-auto max-w-[1300px]">
          <div className="rounded-2xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
            Auswertungen werden geladen...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto max-w-[1300px] px-4 py-6 sm:px-6 lg:px-8">
        {/* HEADER */}

        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm text-app-muted">
              Monitoring & Analyse
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Auswertungen
            </h1>

            <p className="mt-1.5 text-sm text-app-muted sm:text-base">
              Belastung und subjektive Beanspruchung deiner Trainingseinheiten im Verlauf.
            </p>

            <p className="mt-2 max-w-3xl text-xs leading-5 text-app-faint">
              Belastung beschreibt hier Dauer und Umfang der Einheit. Beanspruchung wird über die subjektiv wahrgenommene RPE der Athleten dargestellt.
            </p>
          </div>

          <select
            value={
              selectedTeam
            }
            onChange={(
              event
            ) =>
              setSelectedTeam(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-sm text-app-heading outline-none transition focus:border-app-accent md:w-auto"
          >
            <option value="all">
              Alle Teams
            </option>

            {teams.map(
              (
                team
              ) => (
                <option
                  key={
                    team.id
                  }
                  value={
                    team.id
                  }
                >
                  {
                    team.name
                  }
                </option>
              )
            )}
          </select>
        </header>

        {message && (
          <div className="mt-4 rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
            {
              message
            }
          </div>
        )}

        {/* KPIS */}

        <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
            <p className="text-xs text-app-faint">
              Trainingseinheiten
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                filteredSessions.length
              }
            </p>

            <p className="mt-0.5 text-[11px] text-app-faint">
              im Verlauf
            </p>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
            <p className="text-xs text-app-faint">
              Mit RPE
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                sessionsWithFeedback.length
              }
            </p>

            <p className="mt-0.5 text-[11px] text-app-faint">
              Einheiten bewertet
            </p>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
            <p className="text-xs text-app-faint">
              Ø RPE
            </p>

            <div className="mt-1 flex items-baseline gap-1">
              <p className="text-2xl font-bold text-app-warn">
                {overallAverageRpe !==
                null
                  ? overallAverageRpe.toLocaleString(
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

              {overallAverageRpe !==
                null && (
                <span className="text-sm text-app-faint">
                  / 10
                </span>
              )}
            </div>

            <p className="mt-0.5 text-[11px] text-app-faint">
              bewertete Einheiten
            </p>
          </div>

          <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3">
            <p className="text-xs text-app-faint">
              Rückmeldungen
            </p>

            <p className="mt-1 text-2xl font-bold">
              {
                totalFeedbackCount
              }{" "}
              /{" "}
              {
                totalPossibleFeedback
              }
            </p>

            <p className="mt-0.5 text-[11px] text-app-faint">
              abgegeben
            </p>
          </div>
        </section>

        {/* VERLAUF */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
          <div className="flex flex-col gap-3 border-b border-app-border px-4 py-4 sm:px-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Beanspruchung im Verlauf
              </h2>

              <p className="mt-1 text-xs text-app-faint sm:text-sm">
                {getMetricTitle(
                  chartMetric
                )}{" "}
                über mehrere Trainingseinheiten.
              </p>
            </div>

            <div className="inline-flex w-full rounded-lg border border-app-border bg-app-bg p-1 md:w-auto">
              <button
                type="button"
                onClick={() =>
                  setChartMetric(
                    "rpe"
                  )
                }
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition md:flex-none ${
                  chartMetric ===
                  "rpe"
                    ? "bg-app-accent text-app-accent-ink"
                    : "text-app-muted hover:text-app-heading"
                }`}
              >
                RPE
              </button>

              <button
                type="button"
                onClick={() =>
                  setChartMetric(
                    "meters"
                  )
                }
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition md:flex-none ${
                  chartMetric ===
                  "meters"
                    ? "bg-app-accent text-app-accent-ink"
                    : "text-app-muted hover:text-app-heading"
                }`}
              >
                Umfang
              </button>

              <button
                type="button"
                onClick={() =>
                  setChartMetric(
                    "duration"
                  )
                }
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition md:flex-none ${
                  chartMetric ===
                  "duration"
                    ? "bg-app-accent text-app-accent-ink"
                    : "text-app-muted hover:text-app-heading"
                }`}
              >
                Dauer
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <TrendChart
              points={
                chartPoints
              }
              metric={
                chartMetric
              }
            />

            <p className="mt-2 text-xs leading-5 text-app-faint">
              Jede Markierung entspricht einer Trainingseinheit. Es wird jeweils nur die ausgewählte Kennzahl dargestellt.
            </p>
          </div>
        </section>

        {/* TRAININGSEINHEITEN */}

        <section className="mt-5 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
          <div className="border-b border-app-border px-4 py-3.5 sm:px-5">
            <h2 className="text-lg font-semibold">
              Trainingseinheiten
            </h2>

            <p className="mt-1 text-xs text-app-faint sm:text-sm">
              Belastung und Beanspruchung im Detail
            </p>
          </div>

          {filteredSessions.length ===
          0 ? (
            <div className="px-5 py-7 text-center text-sm text-app-faint">
              Für diese Auswahl sind noch keine Trainingseinheiten vorhanden.
            </div>
          ) : (
            <>
              {/* DESKTOP HEADER */}

              <div className="hidden grid-cols-[105px_minmax(220px,1.5fr)_130px_95px_125px_120px_145px] gap-3 border-b border-app-border bg-app-bg/50 px-5 py-2 text-[11px] font-medium uppercase tracking-wide text-app-faint lg:grid">
                <div>
                  Datum
                </div>

                <div>
                  Training
                </div>

                <div>
                  Team
                </div>

                <div>
                  Dauer
                </div>

                <div>
                  Umfang
                </div>

                <div>
                  Ø RPE
                </div>

                <div>
                  Feedback
                </div>
              </div>

              <div className="divide-y divide-app-border">
                {filteredSessions.map(
                  (
                    session
                  ) => (
                    <a
                      key={
                        session.training.id
                      }
                      href={`/coach/training/session/${session.training.id}`}
                      className="block px-4 py-3 transition hover:bg-app-elevated/40 sm:px-5"
                    >
                      {/* MOBILE / TABLET */}

                      <div className="lg:hidden">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs text-app-faint">
                              {formatDate(
                                session.training.session_date
                              )}
                            </p>

                            <h3 className="mt-1 truncate text-sm font-semibold text-app-heading">
                              {
                                session.training.title
                              }
                            </h3>

                            <p className="mt-0.5 text-xs text-app-faint">
                              {
                                session.teamName
                              }
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              session.training.training_type ===
                              "water"
                                ? "bg-app-accent/10 text-app-accent"
                                : "bg-app-elevated text-app-text"
                            }`}
                          >
                            {session.training.training_type ===
                            "water"
                              ? "Wasser"
                              : "Land"}
                          </span>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                          <div>
                            <p className="text-[11px] text-app-faint">
                              Dauer
                            </p>

                            <p className="mt-0.5 text-sm text-app-text">
                              {session.training.duration_minutes !==
                              null
                                ? `${session.training.duration_minutes} min`
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] text-app-faint">
                              Umfang
                            </p>

                            <p className="mt-0.5 text-sm text-app-text">
                              {session.training.training_type ===
                                "water" &&
                              session.training.total_meters !==
                                null
                                ? `${session.training.total_meters.toLocaleString(
                                    "de-DE"
                                  )} m`
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] text-app-faint">
                              Ø RPE
                            </p>

                            {session.averageRpe !==
                            null ? (
                              <>
                                <div className="mt-0.5 flex items-baseline gap-1">
                                  <span className="text-sm font-semibold text-app-warn">
                                    {session.averageRpe.toLocaleString(
                                      "de-DE",
                                      {
                                        minimumFractionDigits:
                                          1,
                                        maximumFractionDigits:
                                          1,
                                      }
                                    )}
                                  </span>

                                  <span className="text-xs text-app-faint">
                                    / 10
                                  </span>
                                </div>

                                <p className="text-[11px] text-app-faint">
                                  {getRpeText(
                                    session.averageRpe
                                  )}
                                </p>
                              </>
                            ) : (
                              <p className="mt-0.5 text-xs text-app-faint">
                                Keine Daten
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-[11px] text-app-faint">
                              Feedback
                            </p>

                            <p className="mt-0.5 text-sm text-app-text">
                              {
                                session.feedbackCount
                              }{" "}
                              /{" "}
                              {
                                session.athleteCount
                              }
                              <span className="hidden sm:inline">
                                {" "}
                                abgegeben
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* DESKTOP */}

                      <div className="hidden grid-cols-[105px_minmax(220px,1.5fr)_130px_95px_125px_120px_145px] items-center gap-3 lg:grid">
                        <div className="text-xs text-app-muted">
                          {formatDate(
                            session.training.session_date
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-app-heading">
                            {
                              session.training.title
                            }
                          </p>

                          {session.training.focus && (
                            <p className="mt-0.5 truncate text-[11px] text-app-faint">
                              {
                                session.training.focus
                              }
                            </p>
                          )}
                        </div>

                        <div className="truncate text-sm text-app-muted">
                          {
                            session.teamName
                          }
                        </div>

                        <div className="text-sm text-app-text">
                          {session.training.duration_minutes !==
                          null
                            ? `${session.training.duration_minutes} min`
                            : "—"}
                        </div>

                        <div className="text-sm text-app-text">
                          {session.training.training_type ===
                            "water" &&
                          session.training.total_meters !==
                            null
                            ? `${session.training.total_meters.toLocaleString(
                                "de-DE"
                              )} m`
                            : "—"}
                        </div>

                        <div>
                          {session.averageRpe !==
                          null ? (
                            <>
                              <div className="flex items-baseline gap-1">
                                <span className="text-sm font-bold text-app-warn">
                                  {session.averageRpe.toLocaleString(
                                    "de-DE",
                                    {
                                      minimumFractionDigits:
                                        1,
                                      maximumFractionDigits:
                                        1,
                                    }
                                  )}
                                </span>

                                <span className="text-xs text-app-faint">
                                  / 10
                                </span>
                              </div>

                              <p className="mt-0.5 text-[11px] text-app-faint">
                                {getRpeText(
                                  session.averageRpe
                                )}
                              </p>
                            </>
                          ) : (
                            <span className="text-xs text-app-faint">
                              Keine Daten
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-app-text">
                          {
                            session.feedbackCount
                          }{" "}
                          /{" "}
                          {
                            session.athleteCount
                          }{" "}
                          <span className="text-xs text-app-faint">
                            abgegeben
                          </span>
                        </div>
                      </div>
                    </a>
                  )
                )}
              </div>
            </>
          )}
        </section>

        {/* Kapitel 1.2 + 1.4 */}
        <LandCoveragePanel />
      </div>
    </main>
  );
}