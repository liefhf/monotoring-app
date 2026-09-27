"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  GROWTH_SPURT_CM_PER_YEAR,
  MATURITY_ADVICE,
  MATURITY_LABEL,
  MIN_DAYS_BETWEEN_MEASUREMENTS,
  REFERENCE_APHV,
  YOUTH_MAX_AGE,
  ageInYears,
  getMaturityStatus,
  maturityOffset,
  parseSex,
  toDateString,
  type Sex,
} from "@/lib/kapitel1";

/*
 * Kapitel 1.6 - Entwicklungsverlauf bei Jugendlichen
 *
 * Der Coach traegt Groesse (Pflicht), Sitzhoehe und Gewicht
 * ein. Daraus werden berechnet:
 *   - Wachstumsgeschwindigkeit (cm/Jahr) zwischen Messungen
 *   - geschaetztes Alter beim Wachstumsschub (APHV, Mirwald)
 *   - Hinweis auf Akzeleration / Retardierung
 *
 * Geburtsdatum und Geschlecht kommen aus profiles. Fehlen sie,
 * kann der Coach sie hier ueber die sichere Funktion
 * coach_set_athlete_basics setzen.
 */

type Measurement = {
  id: string;
  measured_on: string;
  height_cm: number;
  sitting_height_cm: number | null;
  weight_kg: number | null;
};

type Basics = {
  birth_date: string | null;
  gender: string | null;
};

const inputClass =
  "w-full rounded-lg border border-app-border bg-app-bg px-3 py-2 text-sm outline-none";

function numberOrNull(value: string) {
  const parsed = Number(value.replace(",", "."));
  return value.trim() === "" || !Number.isFinite(parsed)
    ? null
    : parsed;
}

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(`${b}T12:00:00`).getTime() -
      new Date(`${a}T12:00:00`).getTime()) /
      (24 * 60 * 60 * 1000)
  );
}

function fmt(value: number, digits = 1) {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export default function GrowthPanel({
  athleteId,
}: {
  athleteId: string;
}) {
  const [basics, setBasics] = useState<Basics>({
    birth_date: null,
    gender: null,
  });
  const [measurements, setMeasurements] = useState<
    Measurement[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [showBasicsForm, setShowBasicsForm] =
    useState(false);
  const [birthInput, setBirthInput] = useState("");
  const [sexInput, setSexInput] = useState<Sex | "">("");

  const [dateInput, setDateInput] = useState(
    toDateString(new Date())
  );
  const [heightInput, setHeightInput] = useState("");
  const [sittingInput, setSittingInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  async function load() {
    setLoading(true);

    const [profileResult, growthResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("birth_date, gender")
          .eq("id", athleteId)
          .maybeSingle(),
        supabase
          .from("growth_measurements")
          .select(
            "id, measured_on, height_cm, sitting_height_cm, weight_kg"
          )
          .eq("athlete_id", athleteId)
          .order("measured_on", { ascending: true }),
      ]);

    if (growthResult.error) {
      setMessage(
        "Messungen konnten nicht geladen werden. Wurde das SQL-Skript für Kapitel 1 schon ausgeführt?"
      );
    }

    const loadedBasics = (profileResult.data ?? {
      birth_date: null,
      gender: null,
    }) as Basics;

    setBasics(loadedBasics);
    setBirthInput(loadedBasics.birth_date ?? "");
    setSexInput(parseSex(loadedBasics.gender) ?? "");
    setMeasurements(
      ((growthResult.data ?? []) as Measurement[]).map(
        (m) => ({
          ...m,
          height_cm: Number(m.height_cm),
          sitting_height_cm:
            m.sitting_height_cm === null
              ? null
              : Number(m.sitting_height_cm),
          weight_kg:
            m.weight_kg === null ? null : Number(m.weight_kg),
        })
      )
    );
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Daten beim Oeffnen laden
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [athleteId]);

  const sex = parseSex(basics.gender);

  const analysis = useMemo(() => {
    const latest = measurements[measurements.length - 1];

    if (!latest) {
      return null;
    }

    const age = basics.birth_date
      ? ageInYears(basics.birth_date, latest.measured_on)
      : null;

    /* Wachstumsgeschwindigkeit: juengste Messung gegen die
       letzte, die mindestens MIN_DAYS zurueckliegt. */
    const previous = [...measurements]
      .reverse()
      .find(
        (m) =>
          daysBetween(m.measured_on, latest.measured_on) >=
          MIN_DAYS_BETWEEN_MEASUREMENTS
      );

    const velocity = previous
      ? ((latest.height_cm - previous.height_cm) /
          daysBetween(
            previous.measured_on,
            latest.measured_on
          )) *
        365.25
      : null;

    let offset: number | null = null;
    let aphv: number | null = null;

    if (
      sex &&
      age !== null &&
      latest.sitting_height_cm !== null &&
      latest.weight_kg !== null
    ) {
      offset = maturityOffset({
        sex,
        age,
        heightCm: latest.height_cm,
        sittingHeightCm: latest.sitting_height_cm,
        weightKg: latest.weight_kg,
      });
      aphv = age - offset;
    }

    return {
      latest,
      age,
      velocity,
      offset,
      aphv,
      status:
        aphv !== null && sex
          ? getMaturityStatus(aphv, sex)
          : null,
    };
  }, [measurements, basics.birth_date, sex]);

  async function saveBasics() {
    setSaving(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "coach_set_athlete_basics",
      {
        p_athlete_id: athleteId,
        p_birth_date: birthInput || null,
        p_gender: sexInput || null,
      }
    );

    setSaving(false);

    if (error) {
      setMessage(
        "Geburtsdatum/Geschlecht konnten nicht gespeichert werden."
      );
      return;
    }

    setShowBasicsForm(false);
    load();
  }

  async function addMeasurement() {
    const height = numberOrNull(heightInput);

    if (!dateInput || height === null) {
      setMessage("Bitte Datum und Größe eintragen.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("growth_measurements")
      .upsert(
        {
          athlete_id: athleteId,
          measured_on: dateInput,
          height_cm: height,
          sitting_height_cm: numberOrNull(sittingInput),
          weight_kg: numberOrNull(weightInput),
        },
        { onConflict: "athlete_id,measured_on" }
      );

    setSaving(false);

    if (error) {
      setMessage(
        "Messung konnte nicht gespeichert werden. Bitte Werte prüfen."
      );
      return;
    }

    setHeightInput("");
    setSittingInput("");
    setWeightInput("");
    load();
  }

  async function removeMeasurement(id: string) {
    const { error } = await supabase
      .from("growth_measurements")
      .delete()
      .eq("id", id);

    if (error) {
      setMessage("Messung konnte nicht gelöscht werden.");
      return;
    }

    load();
  }

  const isAdult =
    analysis?.age !== null &&
    analysis?.age !== undefined &&
    analysis.age >= YOUTH_MAX_AGE;

  const missingBasics = !basics.birth_date || !sex;

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-app-border bg-app-surface">
      <div className="flex flex-col gap-2 border-b border-app-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="font-semibold text-app-heading">
            Entwicklungsverlauf
          </h2>
          <p className="text-xs text-app-faint">
            Biologisches vs. kalendarisches Alter – Größe,
            Sitzhöhe und Gewicht alle 3 Monate messen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBasicsForm((v) => !v)}
          className="self-start rounded-lg border border-app-border px-3 py-1.5 text-xs text-app-text hover:bg-app-elevated"
        >
          {missingBasics
            ? "Geburtsdatum/Geschlecht ergänzen"
            : "Stammdaten ändern"}
        </button>
      </div>

      {message && (
        <p className="border-b border-app-border px-4 py-2 text-xs text-app-bad sm:px-5">
          {message}
        </p>
      )}

      {showBasicsForm && (
        <div className="grid gap-3 border-b border-app-border bg-app-bg/40 px-4 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:px-5">
          <label className="text-xs text-app-muted">
            Geburtsdatum
            <input
              type="date"
              value={birthInput}
              onChange={(e) => setBirthInput(e.target.value)}
              className={`${inputClass} mt-1`}
            />
          </label>

          <label className="text-xs text-app-muted">
            Geschlecht (für die Formel)
            <select
              value={sexInput}
              onChange={(e) =>
                setSexInput(e.target.value as Sex | "")
              }
              className={`${inputClass} mt-1`}
            >
              <option value="">–</option>
              <option value="female">weiblich</option>
              <option value="male">männlich</option>
            </select>
          </label>

          <button
            type="button"
            onClick={saveBasics}
            disabled={saving}
            className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-app-accent-ink disabled:opacity-50"
          >
            Speichern
          </button>
        </div>
      )}

      {loading ? (
        <p className="px-4 py-4 text-sm text-app-muted sm:px-5">
          Wird geladen...
        </p>
      ) : (
        <>
          {/* Auswertung */}
          {analysis && (
            <div className="grid gap-px border-b border-app-border bg-app-border sm:grid-cols-4">
              <div className="bg-app-surface px-4 py-3">
                <p className="text-[11px] text-app-faint">
                  Alter
                </p>
                <p className="text-sm font-semibold text-app-heading">
                  {analysis.age !== null
                    ? `${fmt(analysis.age)} J.`
                    : "–"}
                </p>
              </div>

              <div className="bg-app-surface px-4 py-3">
                <p className="text-[11px] text-app-faint">
                  Wachstum
                </p>
                <p
                  className={`text-sm font-semibold ${
                    analysis.velocity !== null &&
                    analysis.velocity >=
                      GROWTH_SPURT_CM_PER_YEAR
                      ? "text-app-warn"
                      : "text-app-heading"
                  }`}
                >
                  {analysis.velocity !== null
                    ? `${fmt(analysis.velocity)} cm/Jahr`
                    : "2. Messung fehlt"}
                </p>
              </div>

              <div className="bg-app-surface px-4 py-3">
                <p className="text-[11px] text-app-faint">
                  Reifeabstand
                </p>
                <p className="text-sm font-semibold text-app-heading">
                  {analysis.offset !== null
                    ? `${analysis.offset > 0 ? "+" : ""}${fmt(
                        analysis.offset
                      )} J.`
                    : "–"}
                </p>
              </div>

              <div className="bg-app-surface px-4 py-3">
                <p className="text-[11px] text-app-faint">
                  Wachstumsschub (APHV)
                </p>
                <p className="text-sm font-semibold text-app-heading">
                  {analysis.aphv !== null && sex
                    ? `${fmt(analysis.aphv)} J. (Ø ${fmt(
                        REFERENCE_APHV[sex]
                      )})`
                    : "–"}
                </p>
              </div>
            </div>
          )}

          {analysis && !isAdult && (
            <div className="space-y-2 border-b border-app-border px-4 py-3 text-xs sm:px-5">
              {analysis.status ? (
                <div
                  className={`rounded-lg border px-3 py-2 ${
                    analysis.status === "average"
                      ? "border-app-good/40 bg-app-good/10 text-app-good"
                      : "border-app-warn/40 bg-app-warn/10 text-app-warn"
                  }`}
                >
                  <p className="font-semibold">
                    {MATURITY_LABEL[analysis.status]}
                  </p>
                  <p className="mt-0.5 text-app-text">
                    {MATURITY_ADVICE[analysis.status]}
                  </p>
                </div>
              ) : (
                <p className="text-app-faint">
                  Für die Reifeschätzung werden Geburtsdatum,
                  Geschlecht, Sitzhöhe und Gewicht benötigt.
                </p>
              )}

              {analysis.velocity !== null &&
                analysis.velocity >=
                  GROWTH_SPURT_CM_PER_YEAR && (
                  <p className="rounded-lg border border-app-warn/40 bg-app-warn/10 px-3 py-2 text-app-warn">
                    Wachstumsschub läuft: Koordination kann
                    vorübergehend leiden, Sehnen und
                    Wachstumsfugen sind empfindlicher –
                    Umfang, Sprünge und Zusatzlasten
                    vorsichtig dosieren.
                  </p>
                )}

              <p className="text-[11px] text-app-faint">
                Schätzung nach Mirwald (2002), Genauigkeit
                etwa ±1 Jahr. Ein Hinweis, keine Diagnose.
              </p>
            </div>
          )}

          {/* Neue Messung */}
          <div className="grid grid-cols-2 gap-2 border-b border-app-border px-4 py-3 sm:grid-cols-[1.2fr_1fr_1fr_1fr_auto] sm:items-end sm:px-5">
            <label className="col-span-2 text-xs text-app-muted sm:col-span-1">
              Datum
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-xs text-app-muted">
              Größe cm
              <input
                inputMode="decimal"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                placeholder="158,5"
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-xs text-app-muted">
              Sitzhöhe cm
              <input
                inputMode="decimal"
                value={sittingInput}
                onChange={(e) =>
                  setSittingInput(e.target.value)
                }
                placeholder="82,0"
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="text-xs text-app-muted">
              Gewicht kg
              <input
                inputMode="decimal"
                value={weightInput}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="47,2"
                className={`${inputClass} mt-1`}
              />
            </label>
            <button
              type="button"
              onClick={addMeasurement}
              disabled={saving}
              className="col-span-2 rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-app-accent-ink disabled:opacity-50 sm:col-span-1"
            >
              + Messung
            </button>
          </div>

          {/* Verlauf */}
          {measurements.length === 0 ? (
            <p className="px-4 py-4 text-sm text-app-faint sm:px-5">
              Noch keine Messungen.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] text-app-faint">
                    <th className="px-4 py-2 font-medium sm:px-5">
                      Datum
                    </th>
                    <th className="px-2 py-2 text-right font-medium">
                      Größe
                    </th>
                    <th className="px-2 py-2 text-right font-medium">
                      Sitzhöhe
                    </th>
                    <th className="px-2 py-2 text-right font-medium">
                      Gewicht
                    </th>
                    <th className="px-2 py-2 text-right font-medium">
                      +cm/Jahr
                    </th>
                    <th className="px-4 py-2 sm:px-5"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...measurements]
                    .reverse()
                    .map((m, index, list) => {
                      const older = list[index + 1];
                      const days = older
                        ? daysBetween(
                            older.measured_on,
                            m.measured_on
                          )
                        : 0;
                      const rate =
                        older && days > 0
                          ? ((m.height_cm -
                              older.height_cm) /
                              days) *
                            365.25
                          : null;

                      return (
                        <tr
                          key={m.id}
                          className="border-t border-app-border"
                        >
                          <td className="px-4 py-2 text-app-text sm:px-5">
                            {new Date(
                              `${m.measured_on}T12:00:00`
                            ).toLocaleDateString("de-DE")}
                          </td>
                          <td className="px-2 py-2 text-right text-app-heading">
                            {fmt(m.height_cm)}
                          </td>
                          <td className="px-2 py-2 text-right text-app-muted">
                            {m.sitting_height_cm !== null
                              ? fmt(m.sitting_height_cm)
                              : "–"}
                          </td>
                          <td className="px-2 py-2 text-right text-app-muted">
                            {m.weight_kg !== null
                              ? fmt(m.weight_kg)
                              : "–"}
                          </td>
                          <td
                            className={`px-2 py-2 text-right ${
                              rate !== null &&
                              days >=
                                MIN_DAYS_BETWEEN_MEASUREMENTS &&
                              rate >=
                                GROWTH_SPURT_CM_PER_YEAR
                                ? "text-app-warn"
                                : "text-app-muted"
                            }`}
                          >
                            {rate !== null &&
                            days >=
                              MIN_DAYS_BETWEEN_MEASUREMENTS
                              ? fmt(rate)
                              : "–"}
                          </td>
                          <td className="px-4 py-2 text-right sm:px-5">
                            <button
                              type="button"
                              onClick={() =>
                                removeMeasurement(m.id)
                              }
                              className="text-xs text-app-faint hover:text-app-bad"
                            >
                              Löschen
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
