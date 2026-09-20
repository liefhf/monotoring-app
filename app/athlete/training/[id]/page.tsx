"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

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

  const [feedbackMessage, setFeedbackMessage] =
    useState("");

  const [savingFeedback, setSavingFeedback] =
    useState(false);

  const [rpe, setRpe] = useState(6);

  const [feedback, setFeedback] =
    useState("");

  const [completed, setCompleted] =
    useState(false);

  const navigation = [
    {
      name: "Dashboard",
      href: "/athlete",
    },
    {
      name: "Befinden",
      href: "/athlete/befinden",
    },
    {
      name: "Training",
      href: "/athlete/training",
    },
    {
      name: "Auswertung",
      href: "/athlete/analytics",
    },
  ];

  useEffect(() => {
    if (!trainingId) {
      return;
    }

    loadTraining();
  }, [trainingId]);

  async function loadTraining() {
    setLoading(true);
    setMessage("");
    setFeedbackMessage("");

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
      setFeedbackMessage(
        `Vorhandene Rückmeldung konnte nicht geladen werden: ${feedbackError.message}`
      );
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

  async function handleSaveFeedback() {
    setFeedbackMessage("");
    setSavingFeedback(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setFeedbackMessage(
        "Athlete konnte nicht geladen werden."
      );

      setSavingFeedback(false);
      return;
    }

    const { error } = await supabase
      .from("training_feedback")
      .upsert(
        {
          training_session_id:
            trainingId,

          athlete_id: user.id,

          rpe,

          comment:
            feedback.trim() === ""
              ? null
              : feedback.trim(),

          completed,
        },
        {
          onConflict:
            "training_session_id,athlete_id",
        }
      );

    if (error) {
      setFeedbackMessage(
        `Rückmeldung konnte nicht gespeichert werden: ${error.message}`
      );

      setSavingFeedback(false);
      return;
    }

    setFeedbackMessage(
      "Rückmeldung wurde gespeichert ✅"
    );

    setSavingFeedback(false);
  }

  const blocks =
    useMemo<TrainingBlock[]>(() => {
      return sections.map(
        (section) => ({
          id: section.id,
          name: section.section_name,

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
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-slate-400">
            Training wird geladen...
          </p>
        </div>
      </main>
    );
  }

  if (!training) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/athlete/training"
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Zurück zum Trainingsplan
          </Link>

          <div className="mt-6 rounded-2xl border border-red-900 bg-red-950/30 p-6">
            <h1 className="text-xl font-semibold">
              Training nicht verfügbar
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {message ||
                "Das Training konnte nicht geladen werden."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        {/* Seitenleiste */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
          <div className="border-b border-slate-800 px-6 py-6">
            <h2 className="text-xl font-bold">
              Monitoring App
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Athlete Bereich
            </p>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block rounded-xl px-4 py-3 text-sm transition ${
                  item.name === "Training"
                    ? "bg-white font-medium text-slate-950"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Inhalt */}
        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1600px] px-6 py-8">
            <Link
              href="/athlete/training"
              className="text-sm text-slate-400 hover:text-white"
            >
              ← Zurück zum Trainingsplan
            </Link>

            {/* Kopf */}
            <div className="mt-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm text-slate-400">
                  {weekday} ·{" "}
                  {formattedDate} ·{" "}
                  {displayTime} Uhr
                </p>

                <h1 className="mt-1 text-3xl font-bold">
                  {training.title}
                </h1>

                <p className="mt-2 text-slate-400">
                  {training.focus ??
                    "Kein Trainingsfokus eingetragen"}
                </p>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm ${
                  training.training_type ===
                  "water"
                    ? "bg-blue-950 text-blue-300"
                    : "bg-emerald-950 text-emerald-300"
                }`}
              >
                {displayType}
              </span>
            </div>

            {message && (
              <div className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-300">
                {message}
              </div>
            )}

            {/* Trainingsinfos */}
            <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
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

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Dauer
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {training.duration_minutes ??
                    "—"}{" "}
                  Min
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
                  Trainingsart
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {displayType}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">
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
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                    <p className="text-slate-400">
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
                        className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                      >
                        <div className="border-b border-slate-800 p-5">
                          <h2 className="text-xl font-semibold">
                            {block.name}
                          </h2>

                          <p className="mt-1 text-sm text-slate-400">
                            {blockMeters.toLocaleString(
                              "de-DE"
                            )}{" "}
                            m
                          </p>
                        </div>

                        {block.rows.length ===
                        0 ? (
                          <div className="p-5 text-sm text-slate-500">
                            Keine Serien
                            eingetragen.
                          </div>
                        ) : (
                          <div className="overflow-x-auto p-4">
                            <div className="min-w-[1150px]">
                              <div className="grid grid-cols-[80px_100px_2fr_130px_160px_130px_140px_100px] gap-2 px-2 pb-2 text-xs text-slate-500">
                                <div>Wdh.</div>
                                <div>Distanz</div>
                                <div>Aufgabe</div>
                                <div>Lage</div>
                                <div>Material</div>
                                <div>Belastung</div>
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
                                        className="grid grid-cols-[80px_100px_2fr_130px_160px_130px_140px_100px] gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"
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

                                        <div className="flex items-center text-slate-400">
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
              <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                <div className="border-b border-slate-800 p-5">
                  <h2 className="text-xl font-semibold">
                    Landtraining
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Deine geplanten Übungen.
                  </p>
                </div>

                {landRows.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Für dieses Landtraining wurden
                    keine Übungen gespeichert.
                  </div>
                ) : (
                  <div className="overflow-x-auto p-4">
                    <div className="min-w-[1050px]">
                      <div className="grid grid-cols-[2fr_100px_150px_130px_180px_140px] gap-2 px-3 pb-2 text-xs text-slate-500">
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
                            className="grid grid-cols-[2fr_100px_150px_130px_180px_140px] gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm"
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

                            <div className="flex items-center text-slate-300">
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

            {/* Rückmeldung */}
            <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 p-5">
                <h2 className="text-xl font-semibold">
                  Rückmeldung zum Training
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Diese Rückmeldung wird
                  dauerhaft gespeichert und kann
                  später vom Coach eingesehen
                  werden.
                </p>
              </div>

              <div className="p-5">
                {feedbackMessage && (
                  <div className="mb-6 rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm text-slate-300">
                    {feedbackMessage}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">
                        Wie anstrengend war die
                        Einheit?
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        RPE: 1 = sehr leicht, 10
                        = maximal
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-950 px-4 py-2 text-xl font-bold">
                      {rpe} / 10
                    </div>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={rpe}
                    onChange={(event) =>
                      setRpe(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="mt-5 w-full"
                  />

                  <div className="mt-2 flex justify-between text-xs text-slate-600">
                    <span>sehr leicht</span>
                    <span>mittel</span>
                    <span>maximal</span>
                  </div>
                </div>

                <div className="mt-8">
                  <label className="mb-2 block font-medium">
                    Kommentar
                  </label>

                  <textarea
                    value={feedback}
                    onChange={(event) =>
                      setFeedback(
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Wie lief die Einheit? Gab es Probleme oder Besonderheiten?"
                    className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none"
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-medium">
                      Training abgeschlossen
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Aktiviere dies, wenn du die
                      Einheit absolviert hast.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCompleted(
                        (current) =>
                          !current
                      )
                    }
                    className={`rounded-xl px-5 py-3 text-sm font-medium ${
                      completed
                        ? "bg-emerald-500 text-slate-950"
                        : "border border-slate-700 hover:bg-slate-800"
                    }`}
                  >
                    {completed
                      ? "✓ Abgeschlossen"
                      : "Als abgeschlossen markieren"}
                  </button>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={
                      handleSaveFeedback
                    }
                    disabled={
                      savingFeedback
                    }
                    className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingFeedback
                      ? "Wird gespeichert..."
                      : "Rückmeldung speichern"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}