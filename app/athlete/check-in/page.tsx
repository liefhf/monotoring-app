"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

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
};

type ScaleOption = {
  value: number;
  label: string;
};

const scaleOptions: ScaleOption[] = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4" },
  { value: 5, label: "5" },
  { value: 6, label: "6" },
  { value: 7, label: "7" },
  { value: 8, label: "8" },
  { value: 9, label: "9" },
  { value: 10, label: "10" },
];

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

export default function DailyCheckInPage() {
  const [step, setStep] = useState<Step>(1);

  const [energy, setEnergy] =
    useState<number | null>(null);

  const [mood, setMood] =
    useState<number | null>(null);

  const [muscleFeeling, setMuscleFeeling] =
    useState<number | null>(null);

  const [stress, setStress] =
    useState<number | null>(null);

  const [sleepQuality, setSleepQuality] =
    useState<number | null>(null);

  const [sleepHours, setSleepHours] =
    useState("");

  const [hasPain, setHasPain] =
    useState(false);

  const [painArea, setPainArea] =
    useState("");

  const [comment, setComment] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [checkInStreak, setCheckInStreak] =
    useState<number | null>(null);

  async function loadExistingCheckIn() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Athlet konnte nicht geladen werden."
      );

      setLoading(false);
      return;
    }

    const today =
      getLocalDateString(new Date());

    const {
      data,
      error,
    } = await supabase
      .from("befinden_entries")
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
        comment
      `)
      .eq("athlete_id", user.id)
      .eq("entry_date", today)
      .maybeSingle();

    if (error) {
      setMessage(
        `Check-in konnte nicht geladen werden: ${error.message}`
      );

      setLoading(false);
      return;
    }

    if (data) {
      const entry =
        data as BefindenEntry;

      setEnergy(entry.energy);
      setMood(entry.mood);
      setMuscleFeeling(
        entry.muscle_feeling
      );
      setStress(entry.stress);
      setSleepQuality(
        entry.sleep_quality
      );

      setSleepHours(
        entry.sleep_hours !== null
          ? String(entry.sleep_hours)
          : ""
      );

      setHasPain(
        entry.has_pain
      );

      setPainArea(
        entry.pain_area ?? ""
      );

      setComment(
        entry.comment ?? ""
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    loadExistingCheckIn();
  }, []);

  function currentValue() {
    if (step === 1) {
      return energy;
    }

    if (step === 2) {
      return mood;
    }

    if (step === 3) {
      return muscleFeeling;
    }

    if (step === 4) {
      return stress;
    }

    if (step === 5) {
      return sleepQuality;
    }

    return true;
  }

  function goNext() {
    if (
      step <= 5 &&
      currentValue() === null
    ) {
      setMessage(
        "Bitte wähle einen Wert aus."
      );

      return;
    }

    setMessage("");

    setStep(
      (current) =>
        Math.min(
          6,
          current + 1
        ) as Step
    );
  }

  function goBack() {
    setMessage("");

    setStep(
      (current) =>
        Math.max(
          1,
          current - 1
        ) as Step
    );
  }

  async function calculateCheckInStreak(
    athleteId: string
  ) {
    const today =
      new Date();

    const startDate =
      new Date(today);

    startDate.setDate(
      startDate.getDate() - 365
    );

    const {
      data,
      error,
    } = await supabase
      .from("befinden_entries")
      .select("entry_date")
      .eq("athlete_id", athleteId)
      .gte(
        "entry_date",
        getLocalDateString(
          startDate
        )
      )
      .lte(
        "entry_date",
        getLocalDateString(
          today
        )
      )
      .order(
        "entry_date",
        {
          ascending: false,
        }
      );

    if (error || !data) {
      return null;
    }

    const dates =
      new Set(
        data.map(
          (entry) =>
            entry.entry_date as string
        )
      );

    let streak = 0;

    const current =
      new Date(today);

    current.setHours(
      12,
      0,
      0,
      0
    );

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

  async function submitCheckIn() {
    if (
      energy === null ||
      mood === null ||
      muscleFeeling === null ||
      stress === null ||
      sleepQuality === null
    ) {
      setMessage(
        "Bitte beantworte alle fünf Fragen."
      );

      return;
    }

    setSaving(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Athlet konnte nicht geladen werden."
      );

      setSaving(false);
      return;
    }

    const parsedSleepHours =
      sleepHours.trim()
        ? Number(
            sleepHours.replace(
              ",",
              "."
            )
          )
        : null;

    if (
      parsedSleepHours !== null &&
      (
        Number.isNaN(
          parsedSleepHours
        ) ||
        parsedSleepHours < 0 ||
        parsedSleepHours > 24
      )
    ) {
      setMessage(
        "Bitte gib eine gültige Schlafdauer zwischen 0 und 24 Stunden ein."
      );

      setSaving(false);
      return;
    }

    const today =
      getLocalDateString(
        new Date()
      );

    const payload = {
      athlete_id: user.id,
      entry_date: today,
      sleep_quality:
        sleepQuality,
      energy,
      muscle_feeling:
        muscleFeeling,
      stress,
      mood,
      sleep_hours:
        parsedSleepHours,
      has_pain:
        hasPain,
      pain_area:
        hasPain &&
        painArea.trim()
          ? painArea.trim()
          : null,
      comment:
        comment.trim()
          ? comment.trim()
          : null,
    };

    const {
      error,
    } = await supabase
      .from("befinden_entries")
      .upsert(
        payload,
        {
          onConflict:
            "athlete_id,entry_date",
        }
      );

    if (error) {
      setMessage(
        `Check-in konnte nicht gespeichert werden: ${error.message}`
      );

      setSaving(false);
      return;
    }

    const streak =
      await calculateCheckInStreak(
        user.id
      );

    setCheckInStreak(
      streak
    );

    setSuccess(true);
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="bg-app-bg px-4 py-8 text-app-heading">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
            Check-in wird geladen...
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="bg-app-bg px-4 py-8 text-app-heading sm:px-6">
        <div className="mx-auto max-w-xl">
          <section className="rounded-2xl border border-app-good/70 bg-app-surface p-6 text-center">
            <h1 className="text-2xl font-bold text-app-good">
              ✓ Check-in erledigt
            </h1>

            {checkInStreak !== null &&
              checkInStreak > 0 && (
                <p className="mt-2 text-sm text-app-muted">
                  {checkInStreak}{" "}
                  {checkInStreak === 1
                    ? "Tag in Folge"
                    : "Tage in Folge"}
                </p>
              )}

            <Link
              href="/athlete"
              className="mt-5 block w-full rounded-xl bg-app-warn px-5 py-3 text-center text-sm font-bold text-app-accent-ink transition hover:bg-app-warn"
            >
              Zurück zum Dashboard
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-app-bg px-4 py-5 text-app-heading sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/athlete"
          className="text-sm text-app-muted transition hover:text-app-heading"
        >
          ← Zurück zum Dashboard
        </Link>

        <header className="mt-4">
          <p className="text-xs text-app-faint">
            Täglicher Check-in
          </p>

          <h1 className="mt-1 text-2xl font-bold">
            Wie geht es dir heute?
          </h1>

          <p className="mt-1 text-sm text-app-muted">
            Kurzer Überblick über dein aktuelles Befinden.
          </p>
        </header>

        <div className="mt-4 flex gap-1.5">
          {[1, 2, 3, 4, 5, 6].map(
            (item) => (
              <div
                key={item}
                className={`h-1.5 flex-1 rounded-full ${
                  item < step
                    ? "bg-app-good"
                    : item === step
                    ? "bg-app-warn"
                    : "bg-app-elevated"
                }`}
              />
            )
          )}
        </div>

        {message && (
          <div className="mt-4 rounded-xl border border-app-warn/60 bg-app-warn/20 p-3 text-sm text-app-warn">
            {message}
          </div>
        )}

        <section className="mt-4 rounded-2xl border border-app-border bg-app-surface p-4 sm:p-5">
          {step === 1 && (
            <>
              <QuestionHeader
                eyebrow="Energie"
                title="Wie fit fühlst du dich heute?"
                leftLabel="Sehr müde"
                rightLabel="Sehr fit"
              />

              <ScaleGrid
                selected={energy}
                onSelect={setEnergy}
              />
            </>
          )}

          {step === 2 && (
            <>
              <QuestionHeader
                eyebrow="Stimmung"
                title="Wie ist deine Stimmung heute?"
                leftLabel="Sehr schlecht"
                rightLabel="Sehr gut"
              />

              <ScaleGrid
                selected={mood}
                onSelect={setMood}
              />
            </>
          )}

          {step === 3 && (
            <>
              <QuestionHeader
                eyebrow="Muskelgefühl"
                title="Wie fühlen sich deine Muskeln an?"
                leftLabel="Sehr schlecht"
                rightLabel="Sehr gut"
              />

              <ScaleGrid
                selected={
                  muscleFeeling
                }
                onSelect={
                  setMuscleFeeling
                }
              />
            </>
          )}

          {step === 4 && (
            <>
              <QuestionHeader
                eyebrow="Stress"
                title="Wie entspannt fühlst du dich heute?"
                leftLabel="Sehr gestresst"
                rightLabel="Sehr entspannt"
              />

              <ScaleGrid
                selected={stress}
                onSelect={setStress}
              />
            </>
          )}

          {step === 5 && (
            <>
              <QuestionHeader
                eyebrow="Schlaf"
                title="Wie gut hast du geschlafen?"
                leftLabel="Sehr schlecht"
                rightLabel="Sehr gut"
              />

              <ScaleGrid
                selected={
                  sleepQuality
                }
                onSelect={
                  setSleepQuality
                }
              />
            </>
          )}

          {step === 6 && (
            <div>
              <p className="text-xs text-app-faint">
                Zusatzangaben
              </p>

              <h2 className="mt-1 text-xl font-bold">
                Noch etwas ergänzen?
              </h2>

              <p className="mt-1 text-sm text-app-muted">
                Diese Angaben sind optional.
              </p>

              <div className="mt-5">
                <label
                  htmlFor="sleep-hours"
                  className="text-sm font-medium text-app-text"
                >
                  Schlafdauer
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="sleep-hours"
                    type="text"
                    inputMode="decimal"
                    value={sleepHours}
                    onChange={(
                      event
                    ) =>
                      setSleepHours(
                        event.target.value
                      )
                    }
                    placeholder="z. B. 7,5"
                    className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition placeholder:text-app-faint focus:border-app-warn"
                  />

                  <span className="shrink-0 text-sm text-app-faint">
                    Std.
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-app-border bg-app-bg/50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">
                      Beschwerden
                    </p>

                    <p className="mt-0.5 text-xs text-app-faint">
                      Hast du aktuell Schmerzen oder Beschwerden?
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setHasPain(
                        (current) =>
                          !current
                      )
                    }
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                      hasPain
                        ? "bg-app-bad/15 text-app-bad"
                        : "bg-app-elevated text-app-text"
                    }`}
                  >
                    {hasPain
                      ? "Ja"
                      : "Nein"}
                  </button>
                </div>

                {hasPain && (
                  <div className="mt-4">
                    <label
                      htmlFor="pain-area"
                      className="text-xs text-app-faint"
                    >
                      Wo hast du Beschwerden?
                    </label>

                    <input
                      id="pain-area"
                      type="text"
                      maxLength={150}
                      value={painArea}
                      onChange={(
                        event
                      ) =>
                        setPainArea(
                          event.target.value
                        )
                      }
                      placeholder="z. B. Schulter"
                      className="mt-2 w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition placeholder:text-app-faint focus:border-app-warn"
                    />
                  </div>
                )}
              </div>

              <div className="mt-5">
                <label
                  htmlFor="comment"
                  className="text-sm font-medium text-app-text"
                >
                  Kommentar
                </label>

                <textarea
                  id="comment"
                  value={comment}
                  onChange={(
                    event
                  ) =>
                    setComment(
                      event.target.value
                    )
                  }
                  maxLength={500}
                  rows={3}
                  placeholder="Optionaler Hinweis für deinen Coach..."
                  className="mt-2 w-full resize-none rounded-xl border border-app-border bg-app-bg px-4 py-3 text-sm outline-none transition placeholder:text-app-faint focus:border-app-warn"
                />
              </div>
            </div>
          )}
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="min-h-12 rounded-xl border border-app-border px-4 py-3 text-sm font-semibold text-app-text transition hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-30"
          >
            Zurück
          </button>

          {step < 6 ? (
            <button
              type="button"
              onClick={goNext}
              className="min-h-12 rounded-xl bg-app-warn px-4 py-3 text-sm font-bold text-app-accent-ink transition hover:bg-app-warn"
            >
              Weiter →
            </button>
          ) : (
            <button
              type="button"
              onClick={
                submitCheckIn
              }
              disabled={saving}
              className="min-h-12 rounded-xl bg-app-warn px-4 py-3 text-sm font-bold text-app-accent-ink transition hover:bg-app-warn disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Speichert..."
                : "Check-in speichern"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function QuestionHeader({
  eyebrow,
  title,
  leftLabel,
  rightLabel,
}: {
  eyebrow: string;
  title: string;
  leftLabel: string;
  rightLabel: string;
}) {
  return (
    <div>
      <p className="text-xs text-app-faint">
        {eyebrow}
      </p>

      <h2 className="mt-1 text-xl font-bold">
        {title}
      </h2>

      <div className="mt-2 flex justify-between text-[11px] text-app-faint">
        <span>
          1 · {leftLabel}
        </span>

        <span>
          10 · {rightLabel}
        </span>
      </div>
    </div>
  );
}

function ScaleGrid({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-5 gap-2 sm:grid-cols-10">
      {scaleOptions.map(
        (option) => {
          const active =
            selected ===
            option.value;

          return (
            <button
              key={
                option.value
              }
              type="button"
              onClick={() =>
                onSelect(
                  option.value
                )
              }
              className={`flex min-h-12 items-center justify-center rounded-xl border text-sm font-semibold transition ${
                active
                  ? "border-app-warn bg-app-warn/10 text-app-warn"
                  : "border-app-border bg-app-bg text-app-muted hover:border-app-border hover:text-app-heading"
              }`}
            >
              {option.label}
            </button>
          );
        }
      )}
    </div>
  );
}