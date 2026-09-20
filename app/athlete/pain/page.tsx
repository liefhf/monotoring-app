"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Step = 1 | 2 | 3;
type PainType = "muscle" | "joint";
type BodySide = "left" | "right" | null;

type BodySelection = {
  painType: PainType;
  region: string;
  side: BodySide;
  label: string;
};

type BodyZone = {
  id: string;
  region: string;
  side: BodySide;
  label: string;
  painType: PainType;
  left: number;
  top: number;
  width: number;
  height: number;
  radius?: string;
};

const BODY_ZONES: BodyZone[] = [
  // =========================================================
  // VORNE
  // =========================================================

  {
    id: "front-head",
    region: "head",
    side: null,
    label: "Kopf",
    painType: "muscle",
    left: 18.1,
    top: 8.5,
    width: 8.7,
    height: 14.5,
    radius: "50%",
  },

  {
    id: "front-left-shoulder",
    region: "shoulder",
    side: "left",
    label: "Linke Schulter",
    painType: "joint",
    left: 24.5,
    top: 22,
    width: 6.5,
    height: 10,
    radius: "50%",
  },

  {
    id: "front-right-shoulder",
    region: "shoulder",
    side: "right",
    label: "Rechte Schulter",
    painType: "joint",
    left: 14.2,
    top: 22,
    width: 6.5,
    height: 10,
    radius: "50%",
  },

  {
    id: "front-chest",
    region: "chest",
    side: null,
    label: "Brust",
    painType: "muscle",
    left: 18.6,
    top: 24.5,
    width: 8.2,
    height: 13.5,
    radius: "30%",
  },

  {
    id: "front-abdomen",
    region: "abdomen",
    side: null,
    label: "Bauch",
    painType: "muscle",
    left: 19.4,
    top: 37.5,
    width: 6.8,
    height: 17.5,
    radius: "30%",
  },

  {
    id: "front-left-upper-arm",
    region: "upper_arm",
    side: "left",
    label: "Linker Oberarm",
    painType: "muscle",
    left: 28.6,
    top: 29,
    width: 4.7,
    height: 15,
    radius: "45%",
  },

  {
    id: "front-right-upper-arm",
    region: "upper_arm",
    side: "right",
    label: "Rechter Oberarm",
    painType: "muscle",
    left: 11.7,
    top: 29,
    width: 4.7,
    height: 15,
    radius: "45%",
  },

  {
    id: "front-left-forearm",
    region: "forearm",
    side: "left",
    label: "Linker Unterarm",
    painType: "muscle",
    left: 31.7,
    top: 43.5,
    width: 4,
    height: 16.5,
    radius: "45%",
  },

  {
    id: "front-right-forearm",
    region: "forearm",
    side: "right",
    label: "Rechter Unterarm",
    painType: "muscle",
    left: 9.1,
    top: 43.5,
    width: 4,
    height: 16.5,
    radius: "45%",
  },

  {
    id: "front-left-hip",
    region: "hip",
    side: "left",
    label: "Linke Hüfte",
    painType: "joint",
    left: 23.1,
    top: 53,
    width: 5.2,
    height: 9.5,
    radius: "45%",
  },

  {
    id: "front-right-hip",
    region: "hip",
    side: "right",
    label: "Rechte Hüfte",
    painType: "joint",
    left: 16.5,
    top: 53,
    width: 5.2,
    height: 9.5,
    radius: "45%",
  },

  {
    id: "front-left-thigh",
    region: "front_thigh",
    side: "left",
    label: "Linker Oberschenkel",
    painType: "muscle",
    left: 22.3,
    top: 60,
    width: 6,
    height: 20,
    radius: "42%",
  },

  {
    id: "front-right-thigh",
    region: "front_thigh",
    side: "right",
    label: "Rechter Oberschenkel",
    painType: "muscle",
    left: 16.2,
    top: 60,
    width: 6,
    height: 20,
    radius: "42%",
  },

  {
    id: "front-left-knee",
    region: "knee",
    side: "left",
    label: "Linkes Knie",
    painType: "joint",
    left: 22.5,
    top: 78,
    width: 5,
    height: 7.5,
    radius: "50%",
  },

  {
    id: "front-right-knee",
    region: "knee",
    side: "right",
    label: "Rechtes Knie",
    painType: "joint",
    left: 17.1,
    top: 78,
    width: 5,
    height: 7.5,
    radius: "50%",
  },

  {
    id: "front-left-lower-leg",
    region: "lower_leg",
    side: "left",
    label: "Linker Unterschenkel",
    painType: "muscle",
    left: 22.6,
    top: 85,
    width: 4.3,
    height: 12.5,
    radius: "45%",
  },

  {
    id: "front-right-lower-leg",
    region: "lower_leg",
    side: "right",
    label: "Rechter Unterschenkel",
    painType: "muscle",
    left: 17.6,
    top: 85,
    width: 4.3,
    height: 12.5,
    radius: "45%",
  },

  // =========================================================
  // HINTEN
  // =========================================================

  {
    id: "back-head",
    region: "back_head",
    side: null,
    label: "Hinterkopf",
    painType: "muscle",
    left: 72.5,
    top: 8.5,
    width: 8.7,
    height: 14.5,
    radius: "50%",
  },

  {
    id: "back-left-shoulder",
    region: "shoulder",
    side: "left",
    label: "Linke Schulter",
    painType: "joint",
    left: 79,
    top: 22,
    width: 6.5,
    height: 10,
    radius: "50%",
  },

  {
    id: "back-right-shoulder",
    region: "shoulder",
    side: "right",
    label: "Rechte Schulter",
    painType: "joint",
    left: 68.6,
    top: 22,
    width: 6.5,
    height: 10,
    radius: "50%",
  },

  {
    id: "back-upper-back",
    region: "upper_back",
    side: null,
    label: "Oberer Rücken",
    painType: "muscle",
    left: 73.1,
    top: 24,
    width: 8.8,
    height: 18,
    radius: "30%",
  },

  {
    id: "back-lower-back",
    region: "lower_back",
    side: null,
    label: "Unterer Rücken",
    painType: "muscle",
    left: 74.1,
    top: 41.5,
    width: 6.8,
    height: 13.5,
    radius: "30%",
  },

  {
    id: "back-left-upper-arm",
    region: "rear_upper_arm",
    side: "left",
    label: "Linker Oberarm hinten",
    painType: "muscle",
    left: 83.2,
    top: 29,
    width: 4.7,
    height: 15,
    radius: "45%",
  },

  {
    id: "back-right-upper-arm",
    region: "rear_upper_arm",
    side: "right",
    label: "Rechter Oberarm hinten",
    painType: "muscle",
    left: 66.2,
    top: 29,
    width: 4.7,
    height: 15,
    radius: "45%",
  },

  {
    id: "back-left-forearm",
    region: "rear_forearm",
    side: "left",
    label: "Linker Unterarm hinten",
    painType: "muscle",
    left: 86.3,
    top: 43.5,
    width: 4,
    height: 16.5,
    radius: "45%",
  },

  {
    id: "back-right-forearm",
    region: "rear_forearm",
    side: "right",
    label: "Rechter Unterarm hinten",
    painType: "muscle",
    left: 63.7,
    top: 43.5,
    width: 4,
    height: 16.5,
    radius: "45%",
  },

  {
    id: "back-left-hip",
    region: "rear_hip",
    side: "left",
    label: "Linke Hüfte",
    painType: "joint",
    left: 77.6,
    top: 53,
    width: 5.2,
    height: 9.5,
    radius: "45%",
  },

  {
    id: "back-right-hip",
    region: "rear_hip",
    side: "right",
    label: "Rechte Hüfte",
    painType: "joint",
    left: 71,
    top: 53,
    width: 5.2,
    height: 9.5,
    radius: "45%",
  },

  {
    id: "back-left-thigh",
    region: "rear_thigh",
    side: "left",
    label: "Linker Oberschenkel hinten",
    painType: "muscle",
    left: 76.8,
    top: 60,
    width: 6,
    height: 20,
    radius: "42%",
  },

  {
    id: "back-right-thigh",
    region: "rear_thigh",
    side: "right",
    label: "Rechter Oberschenkel hinten",
    painType: "muscle",
    left: 70.7,
    top: 60,
    width: 6,
    height: 20,
    radius: "42%",
  },

  {
    id: "back-left-knee",
    region: "knee_back",
    side: "left",
    label: "Linke Kniekehle",
    painType: "joint",
    left: 77,
    top: 78,
    width: 5,
    height: 7.5,
    radius: "50%",
  },

  {
    id: "back-right-knee",
    region: "knee_back",
    side: "right",
    label: "Rechte Kniekehle",
    painType: "joint",
    left: 71.6,
    top: 78,
    width: 5,
    height: 7.5,
    radius: "50%",
  },

  {
    id: "back-left-calf",
    region: "calf",
    side: "left",
    label: "Linke Wade",
    painType: "muscle",
    left: 77.1,
    top: 85,
    width: 4.3,
    height: 12.5,
    radius: "45%",
  },

  {
    id: "back-right-calf",
    region: "calf",
    side: "right",
    label: "Rechte Wade",
    painType: "muscle",
    left: 72.1,
    top: 85,
    width: 4.3,
    height: 12.5,
    radius: "45%",
  },
];

export default function PainReportPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);

  const [bodySelections, setBodySelections] =
    useState<BodySelection[]>([]);

  const [painLevel, setPainLevel] =
    useState<number | null>(null);

  const [note, setNote] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  function selectionExists(
    zone: BodyZone
  ) {
    return bodySelections.some(
      (selection) =>
        selection.region ===
          zone.region &&
        selection.side ===
          zone.side
    );
  }

  function toggleBodyZone(
    zone: BodyZone
  ) {
    setMessage("");

    setBodySelections(
      (current) => {
        const exists =
          current.some(
            (selection) =>
              selection.region ===
                zone.region &&
              selection.side ===
                zone.side
          );

        if (exists) {
          return current.filter(
            (selection) =>
              !(
                selection.region ===
                  zone.region &&
                selection.side ===
                  zone.side
              )
          );
        }

        return [
          ...current,
          {
            painType:
              zone.painType,
            region:
              zone.region,
            side:
              zone.side,
            label:
              zone.label,
          },
        ];
      }
    );
  }

  function removeSelection(
    selectionToRemove: BodySelection
  ) {
    setBodySelections(
      (current) =>
        current.filter(
          (selection) =>
            !(
              selection.region ===
                selectionToRemove.region &&
              selection.side ===
                selectionToRemove.side
            )
        )
    );
  }

  function nextStep() {
    setMessage("");

    if (
      step === 1 &&
      bodySelections.length === 0
    ) {
      setMessage(
        "Bitte wähle mindestens eine Körperstelle aus."
      );

      return;
    }

    if (
      step === 2 &&
      painLevel === null
    ) {
      setMessage(
        "Bitte wähle die Schmerzstärke aus."
      );

      return;
    }

    setStep(
      (current) =>
        Math.min(
          3,
          current + 1
        ) as Step
    );
  }

  function previousStep() {
    setMessage("");

    setStep(
      (current) =>
        Math.max(
          1,
          current - 1
        ) as Step
    );
  }

  async function submitPainReport() {
    if (
      bodySelections.length === 0 ||
      painLevel === null
    ) {
      setMessage(
        "Bitte fülle die Angaben aus."
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

    const painReports =
      bodySelections.map(
        (selection) => ({
          athlete_id:
            user.id,

          pain_type:
            selection.painType,

          body_region:
            selection.region,

          side:
            selection.side,

          pain_level:
            painLevel,

          note:
            note.trim() ||
            null,
        })
      );

    const { error } =
      await supabase
        .from(
          "pain_reports"
        )
        .insert(
          painReports
        );

    if (error) {
      setMessage(
        `Schmerzmeldung konnte nicht gespeichert werden: ${error.message}`
      );

      setSaving(false);
      return;
    }

    setSaving(false);

    router.push(
      "/athlete"
    );

    router.refresh();
  }

  const firstStepReady =
    bodySelections.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/athlete"
          className="text-sm text-slate-400 transition hover:text-white"
        >
          ← Zurück
        </Link>

        <header className="mt-5">
          <h1 className="text-3xl font-bold">
            Schmerzen melden
          </h1>
        </header>

        {/* FORTSCHRITT */}
        <div className="mt-6 flex justify-center gap-2">
          {[1, 2, 3].map(
            (item) => (
              <span
                key={item}
                className={`h-2.5 w-2.5 rounded-full transition-all ${
                  item === step
                    ? "scale-110 bg-amber-400"
                    : item < step
                    ? "bg-emerald-500"
                    : "bg-slate-700"
                }`}
              />
            )
          )}
        </div>

        {message && (
          <div className="mt-5 rounded-2xl border border-amber-900 bg-amber-950/20 p-4 text-center text-sm text-amber-200">
            {message}
          </div>
        )}

        {/* =====================================================
            SCHRITT 1
        ===================================================== */}
        {step === 1 && (
          <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 className="text-center text-2xl font-bold">
              Wo tut es weh?
            </h2>

            {bodySelections.length >
              0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {bodySelections.map(
                  (
                    selection
                  ) => (
                    <button
                      key={`${selection.region}-${selection.side ?? "center"}`}
                      type="button"
                      onClick={() =>
                        removeSelection(
                          selection
                        )
                      }
                      className="rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-200 transition hover:bg-orange-500/20"
                    >
                      {
                        selection.label
                      }

                      <span className="ml-1.5 text-orange-400">
                        ×
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/70 p-2 sm:p-4">
              <div className="relative mx-auto w-full max-w-[760px]">
                <img
                  src="/pain-body-map.svg"
                  alt="Körper Vorder- und Rückansicht"
                  draggable={false}
                  className="block h-auto w-full select-none opacity-90 invert brightness-150"
                />

                {BODY_ZONES.map(
                  (zone) => {
                    const active =
                      selectionExists(
                        zone
                      );

                    return (
                      <button
                        key={zone.id}
                        type="button"
                        onClick={() =>
                          toggleBodyZone(
                            zone
                          )
                        }
                        aria-label={
                          zone.label
                        }
                        aria-pressed={
                          active
                        }
                        title={
                          zone.label
                        }
                        className={`absolute z-10 transition-all duration-150 ${
                          active
                            ? "border border-orange-200/80 bg-orange-400/45 shadow-[0_0_10px_rgba(251,146,60,0.30)]"
                            : "border border-transparent bg-transparent hover:border-orange-200/20 hover:bg-orange-300/10"
                        }`}
                        style={{
                          left: `${zone.left}%`,
                          top: `${zone.top}%`,
                          width: `${zone.width}%`,
                          height: `${zone.height}%`,
                          borderRadius:
                            zone.radius ??
                            "35%",
                        }}
                      />
                    );
                  }
                )}
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-500">
              Du kannst mehrere Stellen auswählen.
            </p>
          </section>
        )}

        {/* =====================================================
            SCHRITT 2
        ===================================================== */}
        {step === 2 && (
          <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
            <h2 className="text-center text-2xl font-bold">
              Wie stark sind die Schmerzen?
            </h2>

            <div className="mt-8 grid grid-cols-5 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5].map(
                (value) => {
                  const active =
                    painLevel ===
                    value;

                  const baseClasses: Record<
                    number,
                    string
                  > = {
                    1: "border-yellow-500/30 bg-yellow-500/5 text-yellow-200",
                    2: "border-amber-500/30 bg-amber-500/5 text-amber-200",
                    3: "border-orange-500/30 bg-orange-500/5 text-orange-200",
                    4: "border-red-500/30 bg-red-500/5 text-red-200",
                    5: "border-red-600/40 bg-red-600/10 text-red-200",
                  };

                  const activeClasses: Record<
                    number,
                    string
                  > = {
                    1: "border-yellow-400 bg-yellow-400/90 text-slate-950 ring-2 ring-yellow-300/30",
                    2: "border-amber-400 bg-amber-400/90 text-slate-950 ring-2 ring-amber-300/30",
                    3: "border-orange-400 bg-orange-400/90 text-slate-950 ring-2 ring-orange-300/30",
                    4: "border-red-400 bg-red-400/90 text-white ring-2 ring-red-300/30",
                    5: "border-red-500 bg-red-500/90 text-white ring-2 ring-red-400/30",
                  };

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setPainLevel(
                          value
                        )
                      }
                      aria-pressed={
                        active
                      }
                      className={`flex min-h-[76px] items-center justify-center rounded-2xl border text-2xl font-bold transition sm:min-h-[88px] sm:text-3xl ${
                        active
                          ? `${activeClasses[value]} scale-[1.04]`
                          : `${baseClasses[value]} hover:scale-[1.02]`
                      }`}
                    >
                      {value}
                    </button>
                  );
                }
              )}
            </div>

            <div className="mt-3 flex items-center justify-between px-1 text-sm font-medium text-slate-400">
              <span>
                leicht
              </span>

              <span>
                stark
              </span>
            </div>
          </section>
        )}

        {/* =====================================================
            SCHRITT 3
        ===================================================== */}
        {step === 3 && (
          <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
            <h2 className="text-2xl font-bold">
              Möchtest du noch etwas sagen?
            </h2>

            <textarea
              value={note}
              onChange={(
                event
              ) =>
                setNote(
                  event.target.value
                )
              }
              rows={3}
              maxLength={500}
              placeholder="z. B. zieht beim Laufen"
              className="mt-5 min-h-[96px] w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-4 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-amber-400"
            />

            <p className="mt-2 text-right text-xs text-slate-600">
              {note.length}/500
            </p>
          </section>
        )}

        {/* =====================================================
            NAVIGATION
        ===================================================== */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={
              previousStep
            }
            disabled={
              step === 1
            }
            className="rounded-2xl border border-slate-700 px-5 py-4 font-semibold text-slate-300 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-30"
          >
            Zurück
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={
                nextStep
              }
              disabled={
                (step === 1 &&
                  !firstStepReady) ||
                (step === 2 &&
                  painLevel === null)
              }
              className="rounded-2xl bg-amber-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-600"
            >
              Weiter →
            </button>
          ) : (
            <button
              type="button"
              onClick={
                submitPainReport
              }
              disabled={
                saving
              }
              className="rounded-2xl bg-amber-400 px-4 py-4 font-bold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Wird gespeichert..."
                : "Schmerzen melden"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}