"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useBusy } from "@/lib/loadState";
import { PainAnswer, painAnswerFromEntry, withoutPainAnswer } from "@/lib/checkIn";
import { readinessScore, wellnessScore } from "@/lib/monitoring";

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
  has_pain: boolean | null;
  pain_answer?: PainAnswer | null;
  pain_area: string | null;
  comment: string | null;
};

type ScaleOption = {
  value: number;
  label: string;
};

/*
 * Fuenf Gesichter statt zehn Zahlen - auch fuer Kinder sofort klar.
 * Gespeichert wird weiter auf der Skala 1-10 (2/4/6/8/10), damit alle
 * Auswertungen und alte Eintraege unveraendert funktionieren.
 */
const scaleOptions: (ScaleOption & { word: string })[] = [
  { value: 2, label: "😣", word: "sehr schlecht" },
  { value: 4, label: "🙁", word: "eher schlecht" },
  { value: 6, label: "😐", word: "mittel" },
  { value: 8, label: "🙂", word: "gut" },
  { value: 10, label: "😄", word: "sehr gut" },
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

  /* Schmerzfrage ohne Voreinstellung: null = noch nicht beantwortet */
  const [painAnswer, setPainAnswer] =
    useState<PainAnswer | null>(null);
  const hasPain = painAnswer === "ja";
  const [showExtras, setShowExtras] = useState(false);
  const { busy: saving, run } = useBusy();

  const [painArea, setPainArea] =
    useState("");

  const [comment, setComment] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [message, setMessage] =
    useState("");

  const [success, setSuccess] =
    useState(false);

  const [readinessBaseline, setReadinessBaseline] = useState<number | null>(null);

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
      .select("*")
      .eq("athlete_id", user.id)
      .eq("entry_date", today)
      .maybeSingle();

    if (error) {
      setMessage(
        "Dein heutiger Check-in konnte nicht geladen werden. Du kannst ihn trotzdem ausfüllen – beim Speichern wird er ersetzt."
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

      setPainAnswer(painAnswerFromEntry(entry));
      if (entry.sleep_hours !== null || entry.comment) setShowExtras(true);

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

  /* Antippen = Wert setzen und automatisch weiter (Check-in in unter 30 Sekunden) */
  function pick(setter: (value: number) => void) {
    return (value: number) => {
      setter(value);
      setMessage("");
      window.setTimeout(() => setStep((current) => Math.min(6, current + 1) as Step), 180);
    };
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
    await run(saveCheckIn);
  }

  async function saveCheckIn() {
    if (
      energy === null ||
      mood === null ||
      muscleFeeling === null ||
      stress === null ||
      sleepQuality === null
    ) {
      setMessage(
        "Bitte beantworte alle Fragen."
      );

      return;
    }

    if (painAnswer === null) {
      setMessage("Bitte sag uns noch, ob dir etwas wehtut.");
      return;
    }

    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage(
        "Du bist nicht mehr angemeldet. Bitte neu anmelden – deine Antworten gehen dabei verloren."
      );

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
      pain_answer: painAnswer,
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

    let saveResult = await supabase
      .from("befinden_entries")
      .upsert(payload, { onConflict: "athlete_id,entry_date" })
      .select("id");

    /* Spalte pain_answer fehlt (Skript 25 noch nicht ausgefuehrt): ohne sie speichern */
    if (saveResult.error && withoutPainAnswer(saveResult.error)) {
      const { pain_answer: _ignored, ...legacy } = payload;
      void _ignored;
      saveResult = await supabase
        .from("befinden_entries")
        .upsert(legacy, { onConflict: "athlete_id,entry_date" })
        .select("id");
    }

    if (saveResult.error || !saveResult.data?.length) {
      setMessage(
        "Check-in konnte nicht gespeichert werden. Deine Antworten sind noch da – bitte gleich nochmal auf „Speichern“ tippen."
      );

      return;
    }

    const streak =
      await calculateCheckInStreak(
        user.id
      );

    setCheckInStreak(
      streak
    );

    /* eigener Durchschnitt der letzten 14 Tage (ohne heute) als Vergleich fuer die Readiness */
    const baselineStart = new Date();
    baselineStart.setDate(baselineStart.getDate() - 14);
    const { data: previous } = await supabase
      .from("befinden_entries")
      .select("entry_date, sleep_quality, energy, muscle_feeling, stress, mood")
      .eq("athlete_id", user.id)
      .gte("entry_date", getLocalDateString(baselineStart))
      .lt("entry_date", getLocalDateString(new Date()));
    const previousRows = (previous ?? []) as { sleep_quality: number; energy: number; muscle_feeling: number; stress: number; mood: number }[];
    setReadinessBaseline(previousRows.length >= 3 ? previousRows.reduce((sum, row) => sum + wellnessScore(row), 0) / previousRows.length : null);

    setSuccess(true);
  }

  if (loading) {
    return (
      <main className="bg-app-bg px-4 py-8 text-app-heading">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[20px] border border-app-border bg-app-surface shadow-app p-8 text-center text-sm text-app-muted">
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
              ✓ Danke!
            </h1>

            {(() => {
              if (!energy || !mood || !muscleFeeling || !stress || !sleepQuality) return null;
              const hours = sleepHours.trim() ? Number(sleepHours.replace(",", ".")) : null;
              const readiness = readinessScore(
                { energy, mood, muscle_feeling: muscleFeeling, stress, sleep_quality: sleepQuality, sleep_hours: hours !== null && Number.isFinite(hours) ? hours : null, has_pain: hasPain },
                readinessBaseline
              );
              const tone = readiness.level === "bereit" ? "text-app-good" : readiness.level === "vorsicht" ? "text-app-warn" : "text-app-bad";
              return (
                /* Fuer Athleten (auch Kinder) keine Punktzahl - nur eine klare Rueckmeldung */
                <div className="mt-4 rounded-xl border border-app-border p-4">
                  <p className="text-4xl" aria-hidden="true">{readiness.level === "bereit" ? "💪" : readiness.level === "vorsicht" ? "🙂" : "🤗"}</p>
                  <p className={`mt-1 font-semibold ${tone}`}>
                    {readiness.level === "bereit"
                      ? "Super, viel Spaß beim Training!"
                      : readiness.level === "vorsicht"
                        ? "Danke! Dein Trainer weiß jetzt Bescheid."
                        : "Danke, dass du es sagst. Sprich heute kurz mit deinem Trainer."}
                  </p>
                </div>
              );
            })()}

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
              className="mt-5 block w-full rounded-xl bg-app-accent px-5 py-3 text-center text-sm font-bold text-app-accent-ink transition hover:brightness-110"
            >
              Fertig
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
          ← Zurück
        </Link>

        <header className="mt-4">
          <p className="text-xs text-app-faint">
            Täglicher Check-in
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-app-heading sm:text-[28px]">
            Wie geht es dir heute?
          </h1>

          <p className="mt-1 text-sm text-app-muted">
            Tippe auf ein Gesicht. Mit „Zurück“ kannst du jede Antwort ändern.
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

        <section className="mt-4 rounded-[20px] border border-app-border bg-app-surface shadow-app p-4 sm:p-5">
          {step === 1 && (
            <>
              <QuestionHeader
                eyebrow="Frage 1 von 6"
                title="Wie fit fühlst du dich?"
                leftLabel="sehr müde"
                rightLabel="super fit"
              />

              <ScaleGrid
                selected={energy}
                onSelect={pick(setEnergy)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <QuestionHeader
                eyebrow="Frage 2 von 6"
                title="Wie ist deine Laune?"
                leftLabel="schlecht"
                rightLabel="super"
              />

              <ScaleGrid
                selected={mood}
                onSelect={pick(setMood)}
              />
            </>
          )}

          {step === 3 && (
            <>
              <QuestionHeader
                eyebrow="Frage 3 von 6"
                title="Wie fühlen sich deine Muskeln an?"
                leftLabel="schwer, Muskelkater"
                rightLabel="locker"
              />

              <ScaleGrid
                selected={
                  muscleFeeling
                }
                onSelect={pick(setMuscleFeeling)}
              />
            </>
          )}

          {step === 4 && (
            <>
              <QuestionHeader
                eyebrow="Frage 4 von 6"
                title="Wie entspannt bist du?"
                leftLabel="viel Stress"
                rightLabel="ganz entspannt"
              />

              <ScaleGrid
                selected={stress}
                onSelect={pick(setStress)}
              />
            </>
          )}

          {step === 5 && (
            <>
              <QuestionHeader
                eyebrow="Frage 5 von 6"
                title="Wie hast du geschlafen?"
                leftLabel="schlecht"
                rightLabel="sehr gut"
              />

              <ScaleGrid
                selected={
                  sleepQuality
                }
                onSelect={pick(setSleepQuality)}
              />
            </>
          )}

          {step === 6 && (
            <div>
              <p className="text-xs text-app-faint">Frage 6 von 6</p>
              <h2 className="mt-1 text-2xl font-extrabold">Tut dir gerade etwas weh?</h2>
              <div className="mt-5 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Tut dir gerade etwas weh?">
                {([
                  ["nein", "Nein"],
                  ["ja", "Ja"],
                  ["keine_angabe", "Weiß nicht"],
                ] as [PainAnswer, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={painAnswer === value}
                    onClick={() => {
                      setPainAnswer(value);
                      setMessage("");
                    }}
                    className={`min-h-14 rounded-2xl border text-base font-bold transition ${
                      painAnswer === value ? "border-app-accent bg-app-accent text-app-accent-ink" : "border-app-border bg-app-bg text-app-text"
                    }`}
                  >
                    {painAnswer === value ? "✓ " : ""}
                    {label}
                  </button>
                ))}
              </div>

              {hasPain && (
                <div className="mt-4">
                  <label htmlFor="pain-area" className="text-sm font-medium text-app-text">
                    Wo? <span className="text-app-faint">(optional)</span>
                  </label>
                  <input
                    id="pain-area"
                    type="text"
                    maxLength={150}
                    value={painArea}
                    onChange={(event) => setPainArea(event.target.value)}
                    placeholder="z. B. Schulter"
                    className="mt-2 w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-base outline-none transition placeholder:text-app-faint focus:border-app-accent"
                  />
                  <Link href="/athlete/pain" className="mt-2 inline-block text-sm font-semibold text-app-accent underline">
                    Genauer am Körper zeigen
                  </Link>
                </div>
              )}

              {!showExtras ? (
                <button type="button" onClick={() => setShowExtras(true)} className="mt-5 min-h-11 text-sm font-semibold text-app-accent">
                  + Schlafstunden oder Nachricht an den Trainer (optional)
                </button>
              ) : (
                <div className="mt-5 grid gap-4">
                  <div>
                    <label htmlFor="sleep-hours" className="text-sm font-medium text-app-text">
                      Wie viele Stunden geschlafen?
                    </label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        id="sleep-hours"
                        type="text"
                        inputMode="decimal"
                        value={sleepHours}
                        onChange={(event) => setSleepHours(event.target.value)}
                        placeholder="z. B. 8"
                        className="w-full rounded-xl border border-app-border bg-app-bg px-4 py-3 text-base outline-none transition placeholder:text-app-faint focus:border-app-accent"
                      />
                      <span className="shrink-0 text-sm text-app-faint">Std.</span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="comment" className="text-sm font-medium text-app-text">
                      Nachricht an deinen Trainer
                    </label>
                    <textarea
                      id="comment"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      maxLength={500}
                      rows={2}
                      className="mt-2 w-full resize-none rounded-xl border border-app-border bg-app-bg px-4 py-3 text-base outline-none transition placeholder:text-app-faint focus:border-app-accent"
                    />
                  </div>
                </div>
              )}
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
              className="min-h-12 rounded-xl bg-app-accent px-4 py-3 text-sm font-bold text-app-accent-ink transition hover:brightness-110"
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
              className="min-h-12 rounded-xl bg-app-accent px-4 py-3 text-sm font-bold text-app-accent-ink transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
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

      <h2 className="mt-1 text-2xl font-extrabold">
        {title}
      </h2>

      <div className="mt-2 flex justify-between text-sm text-app-muted">
        <span>
          😣 {leftLabel}
        </span>

        <span>
          {rightLabel} 😄
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
    <div className="mt-5 grid grid-cols-5 gap-2">
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
              aria-label={option.word}
              aria-pressed={active}
              className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border text-4xl transition ${
                active
                  ? "border-app-accent bg-app-accent text-app-accent-ink"
                  : "border-app-border bg-app-bg text-app-muted hover:border-app-border hover:text-app-heading"
              }`}
            >
              <span aria-hidden="true">{option.label}</span>
              <span className="text-[11px] font-semibold leading-tight">{option.word}</span>
            </button>
          );
        }
      )}
    </div>
  );
}