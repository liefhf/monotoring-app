"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { deleteTraining, printTraining } from "@/lib/trainingPlan";
import AttendanceCard from "@/components/AttendanceCard";
import LoadStrainPanel from "@/components/LoadStrainPanel";
import SetTimesCard from "@/components/SetTimesCard";

type TrainingSession = {
  id: string;
  coach_id: string;
  team_id: string;
  title: string;
  session_date: string;
  start_time: string | null;
  training_type: "water" | "land";
  duration_minutes: number | null;
  total_meters: number | null;
  focus: string | null;
};

type Team = {
  id: string;
  name: string;
};

type TeamMember = {
  athlete_id: string;
};

type AthleteProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type TrainingFeedback = {
  id: string;
  athlete_id: string;
  rpe: number;
  comment: string | null;
  completed: boolean;
};

type AthleteFeedbackRow = {
  athleteId: string;
  name: string;
  hasName: boolean;
  rpe: number | null;
  comment: string | null;
  completed: boolean;
};

function formatDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);

  return date.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getAthleteDisplay(
  profile: AthleteProfile | undefined
) {
  if (!profile) {
    return {
      name: "Athlet",
      hasName: false,
    };
  }

  const fullName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (!fullName) {
    return {
      name: "Athlet",
      hasName: false,
    };
  }

  return {
    name: fullName,
    hasName: true,
  };
}

function getRpeText(rpe: number) {
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

export default function CoachTrainingSessionPage() {
  const params = useParams();
  const router = useRouter();

  const trainingId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [
    training,
    setTraining,
  ] = useState<TrainingSession | null>(
    null
  );

  const [
    team,
    setTeam,
  ] = useState<Team | null>(
    null
  );

  const [
    athletes,
    setAthletes,
  ] = useState<AthleteProfile[]>(
    []
  );

  const [
    members,
    setMembers,
  ] = useState<TeamMember[]>(
    []
  );

  const [
    feedback,
    setFeedback,
  ] = useState<TrainingFeedback[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    message,
    setMessage,
  ] = useState("");

  async function loadPage() {
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
        "Coach konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

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
          coach_id,
          team_id,
          title,
          session_date,
          start_time,
          training_type,
          duration_minutes,
          total_meters,
          focus
        `)
        .eq(
          "id",
          trainingId
        )
        .eq(
          "coach_id",
          user.id
        )
        .maybeSingle();

    if (
      trainingError ||
      !trainingData
    ) {
      setMessage(
        "Diese Trainingseinheit konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    const currentTraining =
      trainingData as TrainingSession;

    setTraining(
      currentTraining
    );

    const {
      data: teamData,
      error: teamError,
    } =
      await supabase
        .from("teams")
        .select(`
          id,
          name
        `)
        .eq(
          "id",
          currentTraining.team_id
        )
        .eq(
          "coach_id",
          user.id
        )
        .maybeSingle();

    if (teamError) {
      setMessage(
        `Team konnte nicht geladen werden: ${teamError.message}`
      );

      setLoading(false);
      return;
    }

    if (teamData) {
      setTeam(
        teamData as Team
      );
    }

    const {
      data: memberData,
      error: memberError,
    } =
      await supabase
        .from(
          "team_members"
        )
        .select(`
          athlete_id
        `)
        .eq(
          "team_id",
          currentTraining.team_id
        );

    if (memberError) {
      setMessage(
        `Teammitglieder konnten nicht geladen werden: ${memberError.message}`
      );

      setLoading(false);
      return;
    }

    const currentMembers =
      (memberData ??
        []) as TeamMember[];

    setMembers(
      currentMembers
    );

    const athleteIds =
      currentMembers.map(
        (member) =>
          member.athlete_id
      );

    if (
      athleteIds.length > 0
    ) {
      const {
        data: athleteData,
        error: athleteError,
      } =
        await supabase
          .from("profiles")
          .select(`
            id,
            first_name,
            last_name
          `)
          .in(
            "id",
            athleteIds
          );

      if (athleteError) {
        setMessage(
          `Athleten konnten nicht geladen werden: ${athleteError.message}`
        );

        setLoading(false);
        return;
      }

      setAthletes(
        (athleteData ??
          []) as AthleteProfile[]
      );
    } else {
      setAthletes([]);
    }

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
          rpe,
          comment,
          completed
        `)
        .eq(
          "training_session_id",
          trainingId
        );

    if (feedbackError) {
      setMessage(
        `Rückmeldungen konnten nicht geladen werden: ${feedbackError.message}`
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
    if (!trainingId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadPage();
  }, [trainingId]);

  const athleteRows =
    useMemo<AthleteFeedbackRow[]>(
      () => {
        return members.map(
          (member) => {
            const profile =
              athletes.find(
                (athlete) =>
                  athlete.id ===
                  member.athlete_id
              );

            const athleteFeedback =
              feedback.find(
                (entry) =>
                  entry.athlete_id ===
                    member.athlete_id &&
                  entry.completed
              );

            const display =
              getAthleteDisplay(
                profile
              );

            return {
              athleteId:
                member.athlete_id,

              name:
                display.name,

              hasName:
                display.hasName,

              rpe:
                athleteFeedback?.rpe ??
                null,

              comment:
                athleteFeedback?.comment ??
                null,

              completed:
                Boolean(
                  athleteFeedback
                ),
            };
          }
        );
      },
      [
        members,
        athletes,
        feedback,
      ]
    );

  const completedFeedback =
    athleteRows.filter(
      (athlete) =>
        athlete.completed &&
        athlete.rpe !== null
    );

  const averageRpe =
    useMemo(() => {
      if (
        completedFeedback.length ===
        0
      ) {
        return null;
      }

      const total =
        completedFeedback.reduce(
          (sum, athlete) =>
            sum +
            (athlete.rpe ?? 0),
          0
        );

      return (
        total /
        completedFeedback.length
      );
    }, [completedFeedback]);

  const averageRpeText =
    averageRpe !== null
      ? getRpeText(
          averageRpe
        )
      : null;

  if (loading) {
    return (
      <main>
        <div className="mx-auto max-w-[1200px]">
          <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-8 text-center text-sm text-app-muted">
            Training wird geladen...
          </div>
        </div>
      </main>
    );
  }

  if (!training) {
    return (
      <main>
        <div className="mx-auto max-w-[1200px]">
          <div className="rounded-2xl border border-app-bad/40 bg-app-bad/10 p-5 text-sm text-app-bad">
            {message ||
              "Training konnte nicht geladen werden."}
          </div>

          <Link
            href="/coach/training"
            className="mt-5 inline-block text-sm text-app-muted transition hover:text-app-heading"
          >
            ← Zurück zum Training
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8">
        <Link
          href="/coach/training"
          className="text-sm text-app-muted transition hover:text-app-heading"
        >
          ← Zurück zum Training
        </Link>

        <header className="mt-4 flex flex-col gap-4 border-b border-app-border pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-app-muted">
              {team?.name ??
                "Trainingseinheit"}
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {training.title}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-app-faint">
              <span>
                {formatDate(
                  training.session_date
                )}
              </span>

              {training.start_time && (
                <>
                  <span className="hidden text-app-faint sm:inline">
                    •
                  </span>

                  <span>
                    {training.start_time.slice(
                      0,
                      5
                    )}{" "}
                    Uhr
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                const error = await printTraining(training.id);
                if (error) setMessage(error);
              }}
              className="rounded-xl border border-app-border px-4 py-2.5 text-sm font-medium transition hover:bg-app-surface"
            >
              Drucken / PDF
            </button>
            <Link
              href={`/coach/training/new?session=${training.id}`}
              className="rounded-xl border border-app-border px-4 py-2.5 text-center text-sm font-medium transition hover:bg-app-surface"
            >
              Training bearbeiten
            </Link>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(`Training „${training.title}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`)) return;
                const error = await deleteTraining(training.id);
                if (error) {
                  setMessage(error);
                  return;
                }
                router.push("/coach/training");
              }}
              className="rounded-xl border border-app-bad/40 px-4 py-2.5 text-sm font-medium text-app-bad transition hover:bg-app-bad/10"
            >
              Löschen
            </button>
          </div>
        </header>

        {message && (
          <div className="mt-4 rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
            {message}
          </div>
        )}

        <AttendanceCard sessionId={training.id} teamId={training.team_id} />

        <SetTimesCard sessionId={training.id} teamId={training.team_id} sessionDate={training.session_date} />

        <section className="mt-5">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-lg font-semibold">
              Belastung
            </h2>

            <span className="text-app-faint">
              ↔
            </span>

            <h2 className="text-lg font-semibold">
              Beanspruchung
            </h2>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
            <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-app-faint">
                    Äußere Belastung
                  </p>

                  <p className="mt-1 text-sm text-app-muted">
                    Geplante Trainingsanforderung
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    training.training_type ===
                    "water"
                      ? "bg-app-accent/10 text-app-accent"
                      : "bg-app-good/10 text-app-good"
                  }`}
                >
                  {training.training_type ===
                  "water"
                    ? "Wasser"
                    : "Land"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-app-faint">
                    Umfang
                  </p>

                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {training.training_type ===
                      "water" &&
                    training.total_meters !==
                      null
                      ? `${training.total_meters.toLocaleString(
                          "de-DE"
                        )} m`
                      : "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-app-faint">
                    Dauer
                  </p>

                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {training.duration_minutes !==
                    null
                      ? `${training.duration_minutes} min`
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="mt-3 border-t border-app-border pt-3">
                <p className="text-xs text-app-faint">
                  Trainingsfokus
                </p>

                <p className="mt-1 text-sm font-medium text-app-text">
                  {training.focus ||
                    "—"}
                </p>
              </div>
            </div>

            <div className="hidden items-center justify-center px-1 lg:flex">
              <span
                aria-hidden="true"
                className="text-xl text-app-faint"
              >
                ↔
              </span>
            </div>

            <div className="rounded-3xl border border-app-border bg-app-surface shadow-app p-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-app-faint">
                  Innere Beanspruchung
                </p>

                <p className="mt-1 text-sm text-app-muted">
                  Subjektive Reaktion der Athleten
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-app-faint">
                    Ø RPE
                  </p>

                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold tracking-tight text-app-warn">
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
                    </span>

                    {averageRpe !==
                      null && (
                      <span className="text-sm text-app-faint">
                        / 10
                      </span>
                    )}
                  </div>

                  {averageRpeText && (
                    <p className="mt-1 text-xs text-app-muted">
                      {
                        averageRpeText
                      }
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-app-faint">
                    Rückmeldungen
                  </p>

                  <p className="mt-1 text-2xl font-bold tracking-tight">
                    {
                      completedFeedback.length
                    }{" "}
                    /{" "}
                    {
                      athleteRows.length
                    }
                  </p>

                  <p className="mt-1 text-xs text-app-muted">
                    abgegeben
                  </p>
                </div>
              </div>

              <p className="mt-3 border-t border-app-border pt-3 text-xs leading-5 text-app-faint">
                RPE = subjektiv wahrgenommene Anstrengung des Athleten.
              </p>
            </div>
          </div>
        </section>

        {/* Kapitel 1.1 */}
        {trainingId && (
          <LoadStrainPanel
            sessionId={trainingId}
          />
        )}

        <section className="mt-5 overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-app">
          <div className="flex flex-col gap-1 border-b border-app-border px-4 py-3 sm:px-5">
            <h2 className="font-semibold">
              Athleten-Rückmeldungen
            </h2>

            <p className="text-xs text-app-faint">
              Individuelle Beanspruchung nach der Trainingseinheit
            </p>
          </div>

          {athleteRows.length ===
          0 ? (
            <div className="px-5 py-6 text-center text-sm text-app-faint">
              Diesem Team sind aktuell keine Athleten zugeordnet.
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[minmax(180px,1fr)_150px_2fr] gap-4 border-b border-app-border bg-app-bg/50 px-5 py-2 text-xs font-medium uppercase tracking-wide text-app-faint md:grid">
                <div>
                  Athlet
                </div>

                <div>
                  RPE
                </div>

                <div>
                  Notiz
                </div>
              </div>

              <div className="divide-y divide-app-border">
                {athleteRows.map(
                  (athlete) => (
                    <div
                      key={
                        athlete.athleteId
                      }
                      className="grid gap-2.5 px-4 py-3 sm:px-5 md:grid-cols-[minmax(180px,1fr)_150px_2fr] md:items-center md:gap-4"
                    >
                      <div>
                        <p className="text-sm font-semibold text-app-text">
                          {
                            athlete.name
                          }
                        </p>

                        {athlete.hasName && (
                          <p className="mt-0.5 text-xs text-app-faint">
                            Athlet
                          </p>
                        )}
                      </div>

                      <div>
                        {athlete.rpe !==
                        null ? (
                          <div className="flex items-center gap-2 md:block">
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-app-warn">
                                {
                                  athlete.rpe
                                }
                              </span>

                              <span className="text-xs text-app-faint">
                                / 10
                              </span>
                            </div>

                            <p className="text-xs text-app-faint md:mt-0.5">
                              {getRpeText(
                                athlete.rpe
                              )}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex rounded-full bg-app-elevated px-2.5 py-1 text-xs text-app-muted">
                            Keine Rückmeldung
                          </span>
                        )}
                      </div>

                      {athlete.completed ? (
                        athlete.comment ? (
                          <p className="text-sm leading-5 text-app-text">
                            {
                              athlete.comment
                            }
                          </p>
                        ) : (
                          <span className="text-sm text-app-faint">
                            —
                          </span>
                        )
                      ) : null}
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}