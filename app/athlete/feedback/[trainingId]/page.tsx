"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { sessionPhase } from "@/lib/sessionTiming";
import { supabase } from "@/lib/supabase";

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

type ExistingFeedback = {
  id: string;
  rpe: number;
  comment: string | null;
  completed: boolean;
};

type TeamMember = {
  team_id: string;
};

type StreakTraining = {
  id: string;
  session_date: string;
};

type StreakFeedback = {
  training_session_id: string;
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

function getRpeLabel(value: number) {
  if (value <= 2) {
    return {
      emoji: "😌",
      title: "Sehr leicht",
      description:
        "Das Training war sehr locker.",
    };
  }

  if (value <= 4) {
    return {
      emoji: "🙂",
      title: "Leicht",
      description:
        "Das Training war gut machbar.",
    };
  }

  if (value <= 6) {
    return {
      emoji: "😊",
      title: "Mittel",
      description:
        "Das Training war spürbar anstrengend.",
    };
  }

  if (value <= 8) {
    return {
      emoji: "😅",
      title: "Anstrengend",
      description:
        "Das Training war deutlich anstrengend.",
    };
  }

  return {
    emoji: "🥵",
    title: "Maximal anstrengend",
    description:
      "Das Training war sehr hart.",
  };
}

export default function TrainingFeedbackPage() {
  const params = useParams();

  const trainingId =
    typeof params.trainingId === "string"
      ? params.trainingId
      : "";

  const [
    training,
    setTraining,
  ] = useState<TrainingSession | null>(
    null
  );

  const [
    existingFeedback,
    setExistingFeedback,
  ] = useState<ExistingFeedback | null>(
    null
  );

  const [rpe, setRpe] =
    useState<number | null>(null);

  const [
    comment,
    setComment,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    streak,
    setStreak,
  ] = useState<number | null>(null);

  const saveLock = useRef(false);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);

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
        "Athlet konnte nicht geladen werden."
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
          team_id,
          title,
          session_date,
          start_time,
          training_type,
          duration_minutes,
          total_meters
        `)
        .eq(
          "id",
          trainingId
        )
        .single();

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

    setTraining(
      trainingData as TrainingSession
    );
    setLoadedAt(new Date());

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
          rpe,
          comment,
          completed
        `)
        .eq(
          "training_session_id",
          trainingId
        )
        .eq(
          "athlete_id",
          user.id
        )
        .maybeSingle();

    if (feedbackError) {
      setMessage(
        `Feedback konnte nicht geladen werden: ${feedbackError.message}`
      );

      setLoading(false);
      return;
    }

    if (feedbackData) {
      const feedback =
        feedbackData as ExistingFeedback;

      setExistingFeedback(
        feedback
      );

      setRpe(
        feedback.rpe
      );

      setComment(
        feedback.comment ?? ""
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    if (!trainingId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- Ladefunktion entsteht bei jedem Rendern neu; geladen wird nur, wenn sich die aufgefuehrten Werte aendern
  }, [trainingId]);

  async function calculateCurrentStreak(
    athleteId: string
  ) {
    /*
      1. Teams des Athleten laden
    */
    const {
      data: membershipData,
      error: membershipError,
    } =
      await supabase
        .from("team_members")
        .select("team_id")
        .eq(
          "athlete_id",
          athleteId
        );

    if (
      membershipError ||
      !membershipData
    ) {
      return null;
    }

    const memberships =
      membershipData as TeamMember[];

    const teamIds =
      memberships.map(
        (membership) =>
          membership.team_id
      );

    if (
      teamIds.length === 0
    ) {
      return 0;
    }

    /*
      Wir verwenden denselben
      Vergangenheitsbereich wie
      auf der Athleten-Startseite.
    */
    const today =
      new Date();

    const startDate =
      new Date(today);

    startDate.setDate(
      startDate.getDate() -
        180
    );

    const todayString =
      getLocalDateString(
        today
      );

    /*
      2. Tatsächlich geplante
      Trainingseinheiten laden.

      Es werden keine Kalendertage
      erfunden.
    */
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
          session_date
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
          todayString
        )
        .order(
          "session_date",
          {
            ascending: false,
          }
        );

    if (
      trainingError ||
      !trainingData
    ) {
      return null;
    }

    const streakTrainings =
      trainingData as StreakTraining[];

    if (
      streakTrainings.length === 0
    ) {
      return 0;
    }

    const trainingIds =
      streakTrainings.map(
        (training) =>
          training.id
      );

    /*
      3. Abgeschlossene Bewertungen
      laden.
    */
    const {
      data: feedbackData,
      error: feedbackError,
    } =
      await supabase
        .from(
          "training_feedback"
        )
        .select(`
          training_session_id,
          completed
        `)
        .eq(
          "athlete_id",
          athleteId
        )
        .in(
          "training_session_id",
          trainingIds
        );

    if (
      feedbackError ||
      !feedbackData
    ) {
      return null;
    }

    const streakFeedback =
      feedbackData as StreakFeedback[];

    const completedTrainingIds =
      new Set(
        streakFeedback
          .filter(
            (entry) =>
              entry.completed
          )
          .map(
            (entry) =>
              entry.training_session_id
          )
      );

    /*
      Gleiche Grundlogik wie auf
      der Athleten-Startseite:

      Ein Trainingstag zählt,
      wenn alle tatsächlich
      eingetragenen Einheiten
      dieses Tages bewertet wurden.

      Trainingsfreie Kalendertage
      spielen überhaupt keine Rolle.
    */
    const trainingDates = [
      ...new Set(
        streakTrainings.map(
          (training) =>
            training.session_date
        )
      ),
    ].sort(
      (a, b) =>
        b.localeCompare(a)
    );

    let currentStreak = 0;

    for (
      const date of trainingDates
    ) {
      const trainingsOfDay =
        streakTrainings.filter(
          (training) =>
            training.session_date ===
            date
        );

      const allCompleted =
        trainingsOfDay.length > 0 &&
        trainingsOfDay.every(
          (training) =>
            completedTrainingIds.has(
              training.id
            )
        );

      /*
        Ist der heutige Trainingstag
        noch nicht komplett bewertet,
        wird der bisherige Streak
        noch nicht zerstört.
      */
      if (
        date ===
          todayString &&
        !allCompleted
      ) {
        continue;
      }

      if (
        allCompleted
      ) {
        currentStreak += 1;
        continue;
      }

      break;
    }

    return currentStreak;
  }

  async function saveFeedback() {
    if (saveLock.current) return; // Doppel-Tipp
    saveLock.current = true;
    try {
      await saveFeedbackOnce();
    } finally {
      saveLock.current = false;
    }
  }

  async function saveFeedbackOnce() {
    if (!rpe) {
      setMessage(
        "Bitte wähle zuerst aus, wie anstrengend das Training war."
      );

      return;
    }

    setSaving(true);
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

      setSaving(false);
      return;
    }

    if (
      existingFeedback
    ) {
      const {
        data: updated,
        error,
      } =
        await supabase
          .from(
            "training_feedback"
          )
          .update({
            rpe,
            comment:
              comment.trim() ||
              null,
            completed: true,
          })
          .eq(
            "id",
            existingFeedback.id
          )
          .eq(
            "athlete_id",
            user.id
          )
          .select("id");

      if (error || !updated?.length) {
        setMessage(
          "Feedback konnte nicht gespeichert werden. Deine Auswahl ist noch da – bitte nochmal versuchen."
        );

        setSaving(false);
        return;
      }
    } else {
      const {
        data,
        error,
      } =
        await supabase
          .from(
            "training_feedback"
          )
          .insert({
            training_session_id:
              trainingId,
            athlete_id:
              user.id,
            rpe,
            comment:
              comment.trim() ||
              null,
            completed: true,
          })
          .select(`
            id,
            rpe,
            comment,
            completed
          `)
          .single();

      if (error || !data) {
        setMessage(
          error?.code === "23505"
            ? "Du hast für dieses Training schon eine Rückmeldung gegeben (z. B. auf einem anderen Gerät). Bitte Seite neu laden, um sie zu ändern."
            : "Feedback konnte nicht gespeichert werden. Deine Auswahl ist noch da – bitte nochmal versuchen."
        );

        setSaving(false);
        return;
      }

      {
        setExistingFeedback(
          data as ExistingFeedback
        );
      }
    }

    /*
      Erst NACH erfolgreichem
      Speichern wird der echte
      aktuelle Streak berechnet.
    */
    const currentStreak =
      await calculateCurrentStreak(
        user.id
      );

    setStreak(
      currentStreak
    );

    setSuccess(true);
    setSaving(false);
  }

  const selectedRpe =
    rpe !== null
      ? getRpeLabel(rpe)
      : null;

  if (loading) {
    return (
      <main className="bg-app-bg px-4 py-8 text-app-heading">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[20px] border border-app-border bg-app-surface p-10 text-center text-app-muted">
            Training wird geladen...
          </div>
        </div>
      </main>
    );
  }

  if (!training) {
    return (
      <main className="bg-app-bg px-4 py-8 text-app-heading">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[20px] border border-app-bad/40 bg-app-bad/10 p-6 text-app-bad">
            {message ||
              "Training konnte nicht geladen werden."}
          </div>

          <Link
            href="/athlete"
            className="mt-6 inline-block text-sm text-app-muted hover:text-app-heading"
          >
            ← Zurück
          </Link>
        </div>
      </main>
    );
  }

  /*
    Erfolgsansicht nach
    erfolgreichem Speichern.
  */
  if (success) {
    return (
      <main className="bg-app-bg px-4 py-8 text-app-heading sm:px-6">
        <div className="mx-auto max-w-2xl">
          <section className="overflow-hidden rounded-[20px] border border-app-good/40 bg-app-surface">
            <div className="bg-app-good/10 px-6 py-8 text-center sm:px-8 sm:py-10">
              <div className="text-6xl">
                🔥
              </div>

              <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">
                Stark! Training bewertet.
              </h1>

              <p className="mt-2 text-app-text">
                Danke für dein Feedback!
              </p>

              {streak !== null && (
                <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-app-warn/30 bg-app-bg p-5">
                  <p className="text-sm font-medium text-app-muted">
                    Dein aktueller Streak
                  </p>

                  <p className="mt-1 text-3xl font-bold text-app-warn">
                    {streak}
                  </p>

                  <p className="mt-1 text-sm text-app-text">
                    {streak === 1
                      ? "Trainingstag in Folge"
                      : "Trainingstage in Folge"}
                  </p>
                </div>
              )}

              {streak === null && (
                <p className="mt-6 rounded-2xl bg-app-bg p-4 text-sm text-app-good">
                  ✓ Dein Feedback wurde erfolgreich gespeichert.
                </p>
              )}
            </div>

            <div className="p-5">
              <Link
                href="/athlete"
                className="block w-full rounded-2xl bg-app-accent px-6 py-4 text-center font-bold text-app-accent-ink transition hover:brightness-110"
              >
                Zurück zur Übersicht →
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-app-bg px-4 py-5 text-app-heading sm:px-6 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/athlete"
          className="text-sm text-app-muted transition hover:text-app-heading"
        >
          ← Zurück
        </Link>

        <header className="mt-4">
          <p className="text-sm font-medium text-app-warn">
            Training bewerten
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">
            Wie war dein Training?
          </h1>

          <p className="mt-1 text-sm text-app-muted">
            Dauert nur ein paar Sekunden.
          </p>
        </header>

        {/* ÄUSSERE BELASTUNG */}
        <section className="mt-5 rounded-[20px] border border-app-border bg-app-surface shadow-app px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                training.training_type ===
                "water"
                  ? "bg-app-accent/10 text-app-accent"
                  : "bg-app-good/10 text-app-good"
              }`}
            >
              {training.training_type ===
              "water"
                ? "🏊 Wasser"
                : "🏋️ Land"}
            </span>

            <span className="rounded-full bg-app-elevated px-2.5 py-1 text-[11px] font-semibold text-app-muted">
              Belastung
            </span>
          </div>

          <h2 className="mt-2 text-lg font-bold">
            {training.title}
          </h2>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-app-muted sm:text-sm">
            <span>
              📅{" "}
              {formatDate(
                training.session_date
              )}
            </span>

            {training.start_time && (
              <span>
                🕒{" "}
                {training.start_time.slice(
                  0,
                  5
                )}{" "}
                Uhr
              </span>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-app-border bg-app-bg px-3 py-3">
              <p className="text-xs text-app-faint">
                Dauer
              </p>

              <p className="mt-1 font-semibold text-app-heading">
                {training.duration_minutes !==
                null
                  ? `${training.duration_minutes} Min.`
                  : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-app-border bg-app-bg px-3 py-3">
              <p className="text-xs text-app-faint">
                Umfang
              </p>

              <p className="mt-1 font-semibold text-app-heading">
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
          </div>
        </section>

        {message && (
          <div className="mt-5 rounded-2xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
            {message}
          </div>
        )}

        {/* INNERE BEANSPRUCHUNG */}
        <section className="mt-5 rounded-[20px] border border-app-border bg-app-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-app-warn">
                Beanspruchung
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Wie anstrengend war das Training?
              </h2>
            </div>

            {existingFeedback && (
              <span className="rounded-full border border-app-good/40 bg-app-good/10 px-3 py-1 text-xs font-medium text-app-good">
                Bereits gespeichert
              </span>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-app-muted">
            <div className="text-left">
              <span className="font-semibold text-app-heading">
                1
              </span>{" "}
              = sehr leicht
            </div>

            <div className="text-center">
              <span className="font-semibold text-app-heading">
                5
              </span>{" "}
              = mittel
            </div>

            <div className="text-right">
              <span className="font-semibold text-app-heading">
                10
              </span>{" "}
              = maximal anstrengend
            </div>
          </div>

          <div className="mt-5 grid grid-cols-5 gap-3 sm:grid-cols-10">
            {Array.from(
              { length: 10 },
              (_, index) =>
                index + 1
            ).map(
              (value) => {
                const selected =
                  rpe === value;

                return (
                  <button
                    key={
                      value
                    }
                    type="button"
                    onClick={() =>
                      setRpe(
                        value
                      )
                    }
                    aria-pressed={
                      selected
                    }
                    className={`flex aspect-square items-center justify-center rounded-2xl text-lg font-bold transition ${
                      selected
                        ? "scale-105 bg-app-accent text-app-accent-ink shadow-lg"
                        : "border border-app-border bg-app-bg text-app-text hover:border-app-border hover:bg-app-elevated"
                    }`}
                  >
                    {value}
                  </button>
                );
              }
            )}
          </div>

          {selectedRpe && (
            <div className="mt-5 flex items-center gap-4 rounded-2xl bg-app-bg p-4">
              <div className="text-4xl">
                {
                  selectedRpe.emoji
                }
              </div>

              <div>
                <p className="font-bold">
                  {rpe} von 10 ·{" "}
                  {
                    selectedRpe.title
                  }
                </p>

                <p className="mt-1 text-sm text-app-muted">
                  {
                    selectedRpe.description
                  }
                </p>
              </div>
            </div>
          )}
        </section>

        {/* NOTIZ */}
        <section className="mt-5 rounded-[20px] border border-app-border bg-app-surface p-5 sm:p-6">
          <h2 className="text-xl font-bold">
            Notiz
          </h2>

          <p className="mt-1 text-sm text-app-muted">
            Optional
          </p>

          <textarea
            value={
              comment
            }
            onChange={(
              event
            ) =>
              setComment(
                event.target.value
              )
            }
            rows={3}
            maxLength={500}
            placeholder="Zum Beispiel: Heute sehr müde oder die letzten 10 Minuten waren besonders anstrengend."
            className="mt-4 min-h-[82px] w-full resize-y rounded-2xl border border-app-border bg-app-bg p-4 text-base text-app-heading outline-none transition placeholder:text-app-faint focus:border-app-warn"
          />

          <p className="mt-1 text-right text-xs text-app-faint">
            {
              comment.length
            }
            /500
          </p>
        </section>

        {training && loadedAt && sessionPhase(training, loadedAt) !== "finished" && !existingFeedback && (
          <p className="mt-4 rounded-xl bg-app-elevated p-3 text-center text-sm text-app-text">
            Das Training ist noch nicht vorbei. Gib deine Rückmeldung bitte danach.
          </p>
        )}

        {existingFeedback && (
          <p className="mt-4 text-center text-xs text-app-faint">
            Du kannst dein bestehendes Feedback ändern und erneut speichern.
          </p>
        )}

        <button
          type="button"
          onClick={
            saveFeedback
          }
          disabled={
            saving ||
            rpe === null ||
            Boolean(training && loadedAt && sessionPhase(training, loadedAt) !== "finished" && !existingFeedback)
          }
          className="mt-5 w-full rounded-2xl bg-app-accent px-6 py-4 text-lg font-bold text-app-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving
            ? "Wird gespeichert..."
            : existingFeedback
            ? "Feedback aktualisieren"
            : "Feedback speichern"}
        </button>

        <p className="mt-3 text-center text-xs text-app-faint">
          Dein Feedback hilft deinem Trainer, die Belastung und deine persönliche Beanspruchung besser einzuschätzen.
        </p>
      </div>
    </main>
  );
}