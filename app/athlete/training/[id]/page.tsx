"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  PRACTICE_MODE_CLASS,
  PRACTICE_MODE_HINT,
  PRACTICE_MODE_LABEL,
  parsePracticeMode,
} from "@/lib/kapitel1";

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

type TrainingSection = {
  id: string;
  section_key: string;
  section_name: string;
  sort_order: number;
  practice_mode: string | null;
};

type TrainingRow = {
  id: string;
  section_id: string;
  repetitions: number;
  distance: number;
  exercise: string | null;
  style: string | null;
  materials: string[];
  zone: string | null;
  interval_type: "P" | "@" | null;
  interval_time: string | null;
  sort_order: number;
};

type TrainingBlock = {
  id: string;
  name: string;
  mode: "ueben" | "training" | null;
  rows: TrainingRow[];
};

type LandTrainingRow = {
  id: string;
  training_session_id: string;
  exercise: string;
  sets: string | null;
  repetitions: string | null;
  weight: string | null;
  material: string | null;
  intensity: string | null;
  sort_order: number;
};

type TrainingFeedback = {
  rpe: number;
  comment: string | null;
  completed: boolean;
};

export default function AthleteTrainingDetailPage() {
  const params = useParams();

  const trainingId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [training, setTraining] =
    useState<TrainingSession | null>(null);

  const [sections, setSections] = useState<
    TrainingSection[]
  >([]);

  const [rows, setRows] = useState<
    TrainingRow[]
  >([]);

  const [landRows, setLandRows] = useState<
    LandTrainingRow[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");



  const [rpe, setRpe] = useState(6);

  const [feedback, setFeedback] =
    useState("");

  const [completed, setCompleted] =
    useState(false);

  async function loadTraining() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Athlete konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    // 1. Trainingseinheit laden
    const {
      data: sessionData,
      error: sessionError,
    } = await supabase
      .from("training_sessions")
      .select(
        `
          id,
          title,
          session_date,
          start_time,
          training_type,
          duration_minutes,
          total_meters,
          focus
        `
      )
      .eq("id", trainingId)
      .single();

    if (sessionError || !sessionData) {
      setMessage(
        "Dieses Training wurde nicht gefunden oder du hast keinen Zugriff darauf."
      );

      setLoading(false);
      return;
    }

    setTraining(
      sessionData as TrainingSession
    );

    // 2. Bereits vorhandene Rückmeldung laden
    const {
      data: feedbackData,
      error: feedbackError,
    } = await supabase
      .from("training_feedback")
      .select(
        `
          rpe,
          comment,
          completed
        `
      )
      .eq(
        "training_session_id",
        trainingId
      )
      .eq("athlete_id", user.id)
      .maybeSingle();

    if (feedbackError) {
      setMessage("Vorhandene Rückmeldung konnte nicht geladen werden.");
    }

    if (feedbackData) {
      const loadedFeedback =
        feedbackData as TrainingFeedback;

      setRpe(loadedFeedback.rpe);

      setFeedback(
        loadedFeedback.comment ?? ""
      );

      setCompleted(
        loadedFeedback.completed
      );
    }

    // 3. Landtraining laden
    if (
      sessionData.training_type === "land"
    ) {
      const {
        data: landData,
        error: landError,
      } = await supabase
        .from("training_land_rows")
        .select(
          `
            id,
            training_session_id,
            exercise,
            sets,
            repetitions,
            weight,
            material,
            intensity,
            sort_order
          `
        )
        .eq(
          "training_session_id",
          trainingId
        )
        .order("sort_order", {
          ascending: true,
        });

      if (landError) {
        setMessage(
          `Landübungen konnten nicht geladen werden: ${landError.message}`
        );

        setLoading(false);
        return;
      }

      setLandRows(
        (landData ?? []) as LandTrainingRow[]
      );

      setSections([]);
      setRows([]);
      setLoading(false);
      return;
    }

    // 4. Wasser-Trainingsblöcke laden
    const {
      data: sectionData,
      error: sectionError,
    } = await supabase
      .from("training_sections")
      .select(
        `
          id,
          section_key,
          section_name,
          sort_order,
          practice_mode
        `
      )
      .eq(
        "training_session_id",
        trainingId
      )
      .order("sort_order", {
        ascending: true,
      });

    if (sectionError) {
      setMessage(
        `Trainingsblöcke konnten nicht geladen werden: ${sectionError.message}`
      );

      setLoading(false);
      return;
    }

    const loadedSections =
      (sectionData ??
        []) as TrainingSection[];

    setSections(loadedSections);
    setLandRows([]);

    if (loadedSections.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    // 5. IDs der Blöcke sammeln
    const sectionIds =
      loadedSections.map(
        (section) => section.id
      );

    // 6. Alle einzelnen Wasser-Serien laden
    const {
      data: rowData,
      error: rowError,
    } = await supabase
      .from("training_rows")
      .select(
        `
          id,
          section_id,
          repetitions,
          distance,
          exercise,
          style,
          materials,
          zone,
          interval_type,
          interval_time,
          sort_order
        `
      )
      .in("section_id", sectionIds)
      .order("sort_order", {
        ascending: true,
      });

    if (rowError) {
      setMessage(
        `Trainingsserien konnten nicht geladen werden: ${rowError.message}`
      );

      setLoading(false);
      return;
    }

    setRows(
      (rowData ?? []) as TrainingRow[]
    );

    setLoading(false);
  }

  useEffect(() => {
    if (!trainingId) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadTraining();
  }, [trainingId]);

  const blocks =
    useMemo<TrainingBlock[]>(() => {
      return sections.map(
        (section) => ({
          id: section.id,
          name: section.section_name,
          mode: parsePracticeMode(
            section.practice_mode
          ),

          rows: rows
            .filter(
              (row) =>
                row.section_id ===
                section.id
            )
            .sort(
              (a, b) =>
                a.sort_order -
                b.sort_order
            ),
        })
      );
    }, [sections, rows]);

  const calculatedMeters =
    useMemo(() => {
      return blocks.reduce(
        (blockTotal, block) =>
          blockTotal +
          block.rows.reduce(
            (rowTotal, row) =>
              rowTotal +
              row.repetitions *
                row.distance,
            0
          ),
        0
      );
    }, [blocks]);

  const formattedDate = useMemo(() => {
    if (!training) {
      return "";
    }

    const parsedDate = new Date(
      `${training.session_date}T12:00:00`
    );

    return parsedDate.toLocaleDateString(
      "de-DE"
    );
  }, [training]);

  const weekday = useMemo(() => {
    if (!training) {
      return "";
    }

    const parsedDate = new Date(
      `${training.session_date}T12:00:00`
    );

    const result =
      parsedDate.toLocaleDateString(
        "de-DE",
        {
          weekday: "long",
        }
      );

    return (
      result.charAt(0).toUpperCase() +
      result.slice(1)
    );
  }, [training]);

  const displayTime =
    training?.start_time
      ? training.start_time.slice(0, 5)
      : "—";

  const displayType =
    training?.training_type === "water"
      ? "Wasser"
      : "Land";

  const totalMeters =
    calculatedMeters > 0
      ? calculatedMeters
      : training?.total_meters ?? 0;

  if (loading) {
    return (
      <main className="bg-app-bg p-8 text-app-heading">
        <div className="mx-auto max-w-4xl rounded-[20px] border border-app-border bg-app-surface shadow-app p-6">
          <p className="text-app-muted">
            Training wird geladen...
          </p>
        </div>
      </main>
    );
  }

  if (!training) {
    return (
      <main className="bg-app-bg p-8 text-app-heading">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/athlete/training"
            className="text-sm text-app-muted hover:text-app-heading"
          >
            ← Zurück zum Trainingsplan
          </Link>

          <div className="mt-6 rounded-2xl border border-app-bad/40 bg-app-bad/10 p-6">
            <h1 className="text-xl font-semibold">
              Training nicht verfügbar
            </h1>

            <p className="mt-2 text-sm text-app-bad">
              {message ||
                "Das Training konnte nicht geladen werden."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px]">
      <Link
        href="/athlete/training"
        className="text-sm text-app-muted hover:text-app-heading"
      >
        ← Zurück zum Trainingsplan
      </Link>

      {/* Kopf */}
      <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm text-app-muted">
            {weekday} ·{" "}
            {formattedDate} ·{" "}
            {displayTime} Uhr
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">
            {training.title}
          </h1>

          <p className="mt-2 text-app-muted">
            {training.focus ??
              "Kein Trainingsfokus eingetragen"}
          </p>
        </div>

        <span
          className={`rounded-full px-4 py-2 text-sm ${
            training.training_type ===
            "water"
              ? "bg-app-accent/10 text-app-accent"
              : "bg-app-good/10 text-app-good"
          }`}
        >
          {displayType}
        </span>
      </div>

      {message && (
        <div className="mt-6 rounded-xl border border-app-bad/40 bg-app-bad/10 p-4 text-sm text-app-bad">
          {message}
        </div>
      )}

      {/* Trainingsinfos */}
      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm text-app-muted">
            Umfang
          </p>

          <p className="mt-2 text-2xl font-bold">
            {training.training_type ===
            "water"
              ? `${totalMeters.toLocaleString(
                  "de-DE"
                )} m`
              : `${landRows.length} Übungen`}
          </p>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm text-app-muted">
            Dauer
          </p>

          <p className="mt-2 text-2xl font-bold">
            {training.duration_minutes ??
              "—"}{" "}
            Min
          </p>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm text-app-muted">
            Trainingsart
          </p>

          <p className="mt-2 text-2xl font-bold">
            {displayType}
          </p>
        </div>

        <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-5">
          <p className="text-sm text-app-muted">
            Schwerpunkt
          </p>

          <p className="mt-2 font-semibold">
            {training.focus ?? "—"}
          </p>
        </div>
      </section>

      {/* Wassertraining */}
      {training.training_type ===
        "water" && (
        <section className="mt-6 space-y-6">
          {blocks.length === 0 ? (
            <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-6">
              <p className="text-app-muted">
                Für dieses Training wurden
                keine Serien gespeichert.
              </p>
            </div>
          ) : (
            blocks.map((block) => {
              const blockMeters =
                block.rows.reduce(
                  (total, row) =>
                    total +
                    row.repetitions *
                      row.distance,
                  0
                );

              return (
                <div
                  key={block.id}
                  className="overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app"
                >
                  <div className="border-b border-app-border p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold">
                        {block.name}
                      </h2>

                      {block.mode && (
                        <span
                          title={
                            PRACTICE_MODE_HINT[
                              block.mode
                            ]
                          }
                          className={`rounded-full border px-2.5 py-0.5 text-xs ${
                            PRACTICE_MODE_CLASS[
                              block.mode
                            ]
                          }`}
                        >
                          {
                            PRACTICE_MODE_LABEL[
                              block.mode
                            ]
                          }
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-app-muted">
                      {blockMeters.toLocaleString(
                        "de-DE"
                      )}{" "}
                      m
                    </p>
                  </div>

                  {block.rows.length ===
                  0 ? (
                    <div className="p-5 text-sm text-app-faint">
                      Keine Serien
                      eingetragen.
                    </div>
                  ) : (
                    <div className="overflow-x-auto p-4">
                      <div className="min-w-[1150px]">
                        <div className="grid grid-cols-[80px_100px_2fr_130px_160px_130px_140px_100px] gap-2 px-2 pb-2 text-xs text-app-faint">
                          <div>Wdh.</div>
                          <div>Distanz</div>
                          <div>Aufgabe</div>
                          <div>Lage</div>
                          <div>Material</div>
                          <div>Tempo</div>
                          <div>
                            Pause / Abgang
                          </div>
                          <div>Meter</div>
                        </div>

                        <div className="space-y-2">
                          {block.rows.map(
                            (row) => {
                              const interval =
                                row.interval_type &&
                                row.interval_time
                                  ? `${row.interval_type} ${row.interval_time}`
                                  : row.interval_time ??
                                    row.interval_type ??
                                    "—";

                              return (
                                <div
                                  key={row.id}
                                  className="grid grid-cols-[80px_100px_2fr_130px_160px_130px_140px_100px] gap-2 rounded-xl border border-app-border bg-app-bg p-3 text-sm"
                                >
                                  <div className="flex items-center">
                                    {row.repetitions}×
                                  </div>

                                  <div className="flex items-center">
                                    {row.distance} m
                                  </div>

                                  <div className="flex items-center font-medium">
                                    {row.exercise ??
                                      "—"}
                                  </div>

                                  <div className="flex items-center">
                                    {row.style ??
                                      "—"}
                                  </div>

                                  <div className="flex items-center text-app-muted">
                                    {row.materials?.length >
                                    0
                                      ? row.materials.join(
                                          ", "
                                        )
                                      : "—"}
                                  </div>

                                  <div className="flex items-center">
                                    {row.zone ??
                                      "—"}
                                  </div>

                                  <div className="flex items-center">
                                    {interval}
                                  </div>

                                  <div className="flex items-center font-semibold">
                                    {(
                                      row.repetitions *
                                      row.distance
                                    ).toLocaleString(
                                      "de-DE"
                                    )}{" "}
                                    m
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      )}

      {/* Landtraining */}
      {training.training_type ===
        "land" && (
        <section className="mt-6 overflow-hidden rounded-[20px] border border-app-border bg-app-surface shadow-app">
          <div className="border-b border-app-border p-5">
            <h2 className="text-xl font-semibold">
              Landtraining
            </h2>

            <p className="mt-1 text-sm text-app-muted">
              Deine geplanten Übungen.
            </p>
          </div>

          {landRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-app-faint">
              Für dieses Landtraining wurden
              keine Übungen gespeichert.
            </div>
          ) : (
            <div className="overflow-x-auto p-4">
              <div className="min-w-[1050px]">
                <div className="grid grid-cols-[2fr_100px_150px_130px_180px_140px] gap-2 px-3 pb-2 text-xs text-app-faint">
                  <div>Übung</div>
                  <div>Sätze</div>
                  <div>Wdh./Zeit</div>
                  <div>Gewicht</div>
                  <div>Material</div>
                  <div>Intensität</div>
                </div>

                <div className="space-y-2">
                  {landRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[2fr_100px_150px_130px_180px_140px] gap-2 rounded-xl border border-app-border bg-app-bg p-3 text-sm"
                    >
                      <div className="flex items-center font-semibold">
                        {row.exercise}
                      </div>

                      <div className="flex items-center">
                        {row.sets ?? "—"}
                      </div>

                      <div className="flex items-center">
                        {row.repetitions ??
                          "—"}
                      </div>

                      <div className="flex items-center">
                        {row.weight ?? "—"}
                      </div>

                      <div className="flex items-center text-app-text">
                        {row.material ?? "—"}
                      </div>

                      <div className="flex items-center">
                        {row.intensity ?? "—"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Rueckmeldung: nur noch EIN Weg (Seite /athlete/feedback/[id]),
          damit Athleten nicht zwei verschiedene Formulare sehen. */}
      <section className="mt-6 flex flex-wrap items-center gap-3 rounded-[20px] border border-app-border/60 bg-app-surface p-4 shadow-app sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-app-heading">Rückmeldung</p>
          <p className="text-sm text-app-muted">
            {rpe ? `Abgegeben: Anstrengung ${rpe}/10${completed ? "" : " · nicht vollständig absolviert"}` : "Wie anstrengend war das Training? Dauert 10 Sekunden."}
          </p>
        </div>
        <Link
          href={`/athlete/feedback/${trainingId}`}
          className="inline-flex min-h-11 items-center rounded-xl bg-app-accent px-[18px] text-sm font-bold text-app-accent-ink transition hover:brightness-110"
        >
          {rpe ? "Ändern" : "Bewerten"}
        </Link>
      </section>
    </div>
  );
}